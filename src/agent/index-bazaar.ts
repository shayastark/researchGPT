import { Agent, filter, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import dotenv from 'dotenv';
import { X402Client } from '../lib/x402-client.js';
import { X402BazaarClient, type X402Service, type X402ServiceAccept } from '../lib/x402-bazaar-discovery.js';

dotenv.config();

// Environment variables - XMTP
const XMTP_WALLET_KEY = process.env.XMTP_WALLET_KEY || '';
const XMTP_ENV = (process.env.XMTP_ENV || 'dev') as 'local' | 'dev' | 'production';
const XMTP_DB_ENCRYPTION_KEY = process.env.XMTP_DB_ENCRYPTION_KEY;

// Environment variables - AI & Payments
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Environment variables - x402 Payments
const PAYMENT_PRIVATE_KEY = process.env.PAYMENT_PRIVATE_KEY || process.env.PRIVATE_KEY || '';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USE_MAINNET = process.env.USE_MAINNET === 'true';

// Max price for services (in USDC)
const MAX_SERVICE_PRICE_USDC = parseFloat(process.env.MAX_SERVICE_PRICE_USDC || '1.0');

// Railway volume path for persistent database
const RAILWAY_VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;

// HTTP server port (for Railway health checks)
const PORT = parseInt(process.env.PORT || '3000');

interface DiscoveredTool {
  name: string;
  service: X402Service;
  paymentInfo: X402ServiceAccept;
  description: string;
}

class XMTPBazaarAgent {
  private agent!: Agent;
  private httpServer: express.Application;
  private serverStartTime: Date;
  private anthropic: Anthropic;
  private x402Client: X402Client | null = null;
  private bazaarClient: X402BazaarClient;
  private discoveredTools: Map<string, DiscoveredTool> = new Map();

  constructor() {
    // Validate required environment variables
    if (!XMTP_WALLET_KEY) {
      throw new Error('XMTP_WALLET_KEY environment variable is required');
    }
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.serverStartTime = new Date();
    this.anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    this.bazaarClient = new X402BazaarClient();

    // Initialize x402 client if payment key is available
    if (PAYMENT_PRIVATE_KEY) {
      console.log('🔧 Initializing x402 payment client...');
      this.x402Client = new X402Client({
        privateKey: PAYMENT_PRIVATE_KEY as `0x${string}`,
        rpcUrl: BASE_RPC_URL,
        useMainnet: USE_MAINNET,
      });
      console.log(`✅ x402 client initialized`);
      console.log(`   Payment wallet: ${this.x402Client.getAddress()}`);
      console.log(`   Network: ${USE_MAINNET ? 'Base Mainnet' : 'Base Sepolia'}`);
    } else {
      console.warn('⚠️  No PAYMENT_PRIVATE_KEY found - x402 payments will fail!');
      console.warn('   Set PAYMENT_PRIVATE_KEY or PRIVATE_KEY to enable payments');
    }

    // Initialize HTTP server for health checks
    this.httpServer = express();
    this.httpServer.use(express.json());
    this.setupHttpEndpoints();

    console.log(`\n🤖 XMTP x402 Bazaar Agent Configuration:`);
    console.log(`   XMTP Network: ${XMTP_ENV}`);
    console.log(`   AI: Claude Sonnet 4 (Direct API)`);
    console.log(`   Discovery: CDP x402 Bazaar`);
    console.log(`   Max Service Price: $${MAX_SERVICE_PRICE_USDC} USDC`);
    console.log(`   Payment Wallet: ${this.x402Client?.getAddress() || 'NOT CONFIGURED'}`);
    console.log(`   HTTP Port: ${PORT}`);
    
    // Warning if on dev network
    if (XMTP_ENV === 'dev') {
      console.log('\n⚠️  WARNING: Agent is on DEV network');
      console.log('   Users on xmtp.chat will NOT be able to message you!');
      console.log('   To fix: Set XMTP_ENV=production');
    }
  }

  private setupHttpEndpoints() {
    // Health check endpoint (required for Railway)
    this.httpServer.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'xmtp-x402-bazaar-agent',
        uptime: Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000),
        xmtpNetwork: XMTP_ENV,
        ai: 'claude-sonnet-4',
        discovery: 'cdp-x402-bazaar',
        paymentWallet: this.x402Client?.getAddress() || 'not configured',
        x402Configured: !!this.x402Client,
        discoveredServices: this.discoveredTools.size,
        address: this.agent?.address || 'not initialized',
        timestamp: new Date().toISOString(),
      });
    });

    // Status endpoint with detailed information
    this.httpServer.get('/status', (req, res) => {
      const tools = Array.from(this.discoveredTools.entries()).map(([name, tool]) => ({
        name,
        endpoint: tool.service.resource,
        price: this.bazaarClient.formatPrice(tool.paymentInfo.maxAmountRequired, 6),
        description: tool.description,
      }));

      res.json({
        service: 'XMTP x402 Bazaar Agent',
        version: '6.0.0-bazaar',
        status: 'running',
        uptime: Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000),
        configuration: {
          xmtpNetwork: XMTP_ENV,
          agentAddress: this.agent?.address || 'not initialized',
          inboxId: this.agent?.client?.inboxId || 'not initialized',
          ai: 'Claude Sonnet 4',
          discovery: 'CDP x402 Bazaar',
          paymentSystem: 'x402 Protocol (Direct)',
          paymentWallet: this.x402Client?.getAddress() || 'NOT CONFIGURED',
          paymentNetwork: USE_MAINNET ? 'Base Mainnet' : 'Base Sepolia',
          maxServicePrice: `$${MAX_SERVICE_PRICE_USDC} USDC`,
          volumePath: RAILWAY_VOLUME || 'not configured',
        },
        capabilities: {
          x402Payments: !!this.x402Client,
          discoveredServices: this.discoveredTools.size,
          availableTools: tools,
        },
        ready: !!this.agent && !!this.x402Client,
        timestamp: new Date().toISOString(),
      });
    });

    // Root endpoint
    this.httpServer.get('/', (req, res) => {
      res.json({
        service: 'XMTP x402 Bazaar Agent',
        message: 'AI agent with CDP x402 Bazaar discovery. Dynamically discovers and pays for services.',
        agentAddress: this.agent?.address || 'initializing...',
        xmtpNetwork: XMTP_ENV,
        paymentWallet: this.x402Client?.getAddress() || 'NOT CONFIGURED',
        x402Configured: !!this.x402Client,
        discoveredServices: this.discoveredTools.size,
        endpoints: {
          health: '/health',
          status: '/status',
        },
      });
    });
  }

  /**
   * Discover services from the Bazaar
   */
  async discoverServices(): Promise<void> {
    console.log('\n🔍 Discovering services from CDP x402 Bazaar...');
    
    try {
      // Fetch affordable services
      const services = await this.bazaarClient.discoverAffordableServices(
        MAX_SERVICE_PRICE_USDC,
        USE_MAINNET
      );

      console.log(`\n📋 Processing ${services.length} discovered services:`);
      
      // Clear existing tools
      this.discoveredTools.clear();

      // Convert services to tools
      for (const service of services) {
        const paymentInfo = this.bazaarClient.getBestPaymentOption(
          service,
          USE_MAINNET 
            ? X402BazaarClient.USDC_BASE_MAINNET 
            : X402BazaarClient.USDC_BASE_SEPOLIA
        );

        if (!paymentInfo) {
          console.warn(`   ⚠️  No valid payment option for ${service.resource}`);
          continue;
        }

        // Create a unique tool name from the resource URL
        const toolName = this.generateToolName(service.resource);
        const description = this.bazaarClient.getServiceDescription(service, paymentInfo);

        this.discoveredTools.set(toolName, {
          name: toolName,
          service,
          paymentInfo,
          description,
        });

        const price = this.bazaarClient.formatPrice(paymentInfo.maxAmountRequired, 6);
        console.log(`   ✅ ${toolName}: $${price} USDC - ${service.resource}`);
      }

      console.log(`\n✅ Discovered ${this.discoveredTools.size} available services`);
    } catch (error) {
      console.error('❌ Failed to discover services:', error);
      throw error;
    }
  }

  /**
   * Generate a tool name from a URL
   */
  private generateToolName(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '').split('.')[0];
      const path = urlObj.pathname
        .split('/')
        .filter(p => p && p !== 'api' && p !== 'x402')
        .join('_');
      
      let name = path ? `${domain}_${path}` : domain;
      
      // Clean up the name to be a valid identifier
      name = name.replace(/[^a-zA-Z0-9_]/g, '_');
      name = name.replace(/_+/g, '_');
      name = name.replace(/^_|_$/g, '');
      
      return name || 'service';
    } catch {
      return 'service_' + Math.random().toString(36).substring(7);
    }
  }

  async initialize() {
    console.log('\n🔄 Initializing XMTP Agent...');

    try {
      // Create signer from private key
      const user = createUser(validHex(XMTP_WALLET_KEY));
      const signer = createSigner(user);

      // Create agent with proper configuration
      this.agent = await Agent.create(signer, {
        env: XMTP_ENV,
        // Database path - use Railway volume if available, otherwise local
        dbPath: RAILWAY_VOLUME 
          ? (inboxId) => `${RAILWAY_VOLUME}/${XMTP_ENV}-${inboxId.slice(0, 8)}.db3`
          : undefined,
        // Encryption key for database
        ...(XMTP_DB_ENCRYPTION_KEY ? {
          dbEncryptionKey: Buffer.from(XMTP_DB_ENCRYPTION_KEY, 'hex')
        } : {})
      });

      console.log(`✅ XMTP Agent initialized`);
      console.log(`   Address: ${this.agent.address}`);
      console.log(`   InboxId: ${this.agent.client.inboxId}`);

      // Discover services from Bazaar
      await this.discoverServices();

    } catch (error) {
      console.error('❌ Failed to initialize XMTP Agent:', error);
      throw error;
    }
  }

  async start() {
    // Start HTTP server first
    this.httpServer.listen(PORT, () => {
      console.log(`\n🌐 HTTP server listening on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   Status: http://localhost:${PORT}/status`);
    });

    await this.initialize();

    console.log('\n🤖 XMTP x402 Bazaar Agent starting...');

    // Listen for text messages
    this.agent.on('text', async (ctx) => {
      // Filter out messages from self and ensure valid content
      if (
        filter.fromSelf(ctx.message, ctx.client) ||
        !filter.hasContent(ctx.message)
      ) {
        return;
      }

      // Get sender address
      let senderAddress = 'unknown';
      if (filter.isDM(ctx.conversation)) {
        senderAddress = ctx.conversation.peerInboxId;
      } else if (filter.isGroup(ctx.conversation)) {
        senderAddress = ctx.message.senderInboxId;
      }
      const messageContent = ctx.message.content;

      console.log(`\n${'='.repeat(80)}`);
      console.log(`📨 Received message from ${senderAddress}`);
      console.log(`   Query: "${messageContent}"`);
      console.log('='.repeat(80));

      try {
        // Process the request with discovered services
        const response = await this.handleRequest(messageContent);

        // Send response back via XMTP
        await ctx.sendText(response);
        console.log(`\n✅ Response sent to ${senderAddress}`);
        console.log('='.repeat(80));
      } catch (error) {
        console.error('❌ Error handling message:', error);
        const errorMessage = `❌ Error processing your request: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        await ctx.sendText(errorMessage);
      }
    });

    // Handle errors
    this.agent.on('unhandledError', (error) => {
      console.error('❌ Unhandled agent error:', error);
    });

    // Start event
    this.agent.on('start', () => {
      console.log('\n' + '═'.repeat(80));
      console.log('✅ XMTP x402 BAZAAR AGENT IS NOW ONLINE!');
      console.log('═'.repeat(80));
      console.log(`\n📬 Agent Address: ${this.agent.address}`);
      console.log(`📊 InboxId: ${this.agent.client.inboxId}`);
      console.log(`🌐 Environment: ${XMTP_ENV}`);
      console.log(`🤖 AI: Claude Sonnet 4`);
      console.log(`🔍 Discovery: CDP x402 Bazaar`);
      console.log(`💰 Max Service Price: $${MAX_SERVICE_PRICE_USDC} USDC`);
      console.log(`💳 Payment Wallet: ${this.x402Client?.getAddress() || 'NOT CONFIGURED'}`);
      console.log(`⛓️  Network: ${USE_MAINNET ? 'Base Mainnet' : 'Base Sepolia'}`);
      
      if (!this.x402Client) {
        console.log('\n⚠️  WARNING: No payment wallet configured!');
        console.log('   x402 payments will fail. Set PAYMENT_PRIVATE_KEY to enable.');
      }
      
      if (XMTP_ENV === 'production') {
        console.log('\n✅ Users can message you on xmtp.chat!');
      } else if (XMTP_ENV === 'dev') {
        console.log('\n⚠️  DEV mode: Users on xmtp.chat CANNOT message you');
        console.log('   Use a dev client or switch to production');
      }
      
      console.log(`\n💡 This agent uses CDP x402 Bazaar for dynamic service discovery!\n`);
      console.log(`🎯 Discovered Services (${this.discoveredTools.size}):`);
      
      for (const [name, tool] of this.discoveredTools) {
        const price = this.bazaarClient.formatPrice(tool.paymentInfo.maxAmountRequired, 6);
        console.log(`   - ${name}: $${price} USDC`);
        console.log(`     ${tool.service.resource}`);
      }
      
      console.log('\n📝 Try asking me to use any of these services!\n');
      console.log('='.repeat(80));
    });

    // Start the agent
    await this.agent.start();
  }

  private async handleRequest(userQuery: string): Promise<string> {
    if (!this.x402Client) {
      return '❌ x402 payment client not configured. Please set PAYMENT_PRIVATE_KEY environment variable to enable payments.';
    }

    if (this.discoveredTools.size === 0) {
      return '❌ No services available. Try adjusting MAX_SERVICE_PRICE_USDC or check your network configuration.';
    }

    console.log(`\n🔍 Processing with CDP x402 Bazaar Discovery`);
    console.log(`   Query: "${userQuery}"`);
    console.log(`   Available services: ${this.discoveredTools.size}`);

    // Build tools for Claude from discovered services
    const tools: Anthropic.Tool[] = Array.from(this.discoveredTools.values()).map(tool => {
      const inputSchema = tool.paymentInfo.outputSchema?.input;
      
      return {
        name: tool.name,
        description: tool.description,
        input_schema: {
          type: 'object',
          properties: {
            // Try to infer parameters from the input schema
            ...(inputSchema?.method === 'GET' ? {
              query: {
                type: 'string',
                description: 'Query parameter for the API request',
              }
            } : {
              data: {
                type: 'string',
                description: 'Data to send to the API',
              }
            }),
          },
          required: inputSchema?.method === 'GET' ? ['query'] : ['data'],
        },
      };
    });

    let messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: userQuery,
      },
    ];

    let iteration = 0;
    const maxIterations = 5;

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n🔄 Iteration ${iteration}:`);

      // Call Claude
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        tools,
        messages,
      });

      console.log(`   Stop reason: ${response.stop_reason}`);

      // If Claude is done, return the response
      if (response.stop_reason === 'end_turn') {
        let finalText = '';
        for (const block of response.content) {
          if (block.type === 'text') {
            finalText += block.text;
          }
        }
        console.log(`\n✅ Request completed in ${iteration} iteration(s)`);
        return finalText || 'Request completed, but no response generated.';
      }

      // Handle tool calls
      if (response.stop_reason === 'tool_use') {
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            console.log(`\n   🔧 Tool: ${block.name}`);
            console.log(`      Input: ${JSON.stringify(block.input)}`);

            try {
              // Execute the discovered service
              const result = await this.executeDiscoveredService(
                block.name,
                block.input as Record<string, any>
              );

              console.log(`      ✅ Success`);
              
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: typeof result === 'string' ? result : JSON.stringify(result),
              });
            } catch (error) {
              console.error(`      ❌ Failed: ${error instanceof Error ? error.message : error}`);
              
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                is_error: true,
              });
            }
          }
        }

        // Add assistant message and tool results to conversation
        messages.push({
          role: 'assistant',
          content: response.content,
        });

        messages.push({
          role: 'user',
          content: toolResults,
        });

        // Continue to next iteration
        continue;
      }

      // Unexpected stop reason
      console.warn(`   ⚠️  Unexpected stop reason: ${response.stop_reason}`);
      break;
    }

    return 'Request completed after maximum iterations.';
  }

  private async executeDiscoveredService(
    toolName: string,
    input: Record<string, any>
  ): Promise<any> {
    const tool = this.discoveredTools.get(toolName);
    
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    if (!this.x402Client) {
      throw new Error('x402 payment client not configured');
    }

    const inputSchema = tool.paymentInfo.outputSchema?.input;
    const method = (inputSchema?.method || 'GET').toUpperCase() as 'GET' | 'POST';

    console.log(`\n   💰 Executing discovered service via x402:`);
    console.log(`      Service: ${tool.service.resource}`);
    console.log(`      Method: ${method}`);
    console.log(`      Price: ${this.bazaarClient.formatPrice(tool.paymentInfo.maxAmountRequired, 6)} USDC`);

    // Call using Bazaar payment info
    const result = await this.x402Client.callWithPaymentInfo(
      tool.service.resource,
      tool.paymentInfo,
      {
        method,
        ...(method === 'POST' ? { body: input } : {}),
        ...(method === 'GET' && input.query ? { queryParams: { query: input.query } } : {}),
      }
    );

    console.log(`      ✅ Data received via x402 Bazaar discovery`);
    
    return result;
  }
}

// Start the agent
const agent = new XMTPBazaarAgent();
agent.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export default XMTPBazaarAgent;
