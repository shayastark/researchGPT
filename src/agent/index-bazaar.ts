import { Agent, filter, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import { ReactionCodec } from '@xmtp/content-type-reaction';
import {
  AttachmentCodec,
  RemoteAttachmentCodec,
  ContentTypeRemoteAttachment,
} from '@xmtp/content-type-remote-attachment';
import OpenAI from 'openai';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { X402Client } from '../lib/x402-client.js';
import { X402OfficialClient } from '../lib/x402-official-client.js';
import { X402BazaarClient, type X402Service, type X402ServiceAccept } from '../lib/x402-bazaar-discovery.js';
// API server will be loaded lazily in start() method
// let apiServer: any = null;
// let setAgentInstance: any = null;

dotenv.config();

// Environment variables - XMTP
const XMTP_WALLET_KEY = process.env.XMTP_WALLET_KEY || '';
const XMTP_ENV = (process.env.XMTP_ENV || 'dev') as 'local' | 'dev' | 'production';
const XMTP_DB_ENCRYPTION_KEY = process.env.XMTP_DB_ENCRYPTION_KEY;

// Environment variables - AI & Payments
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

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

// Blacklist of known bad services (URLs that return placeholder data or don't work)
const SERVICE_BLACKLIST: string[] = [
  'https://x402.aiape.tech/signals', // Returns only Twitter link, not actual signals
  // Add more known bad services here as they're discovered
];

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
  private openai: any;
  private x402Client: X402Client | null = null;
  private x402OfficialClient: X402OfficialClient | null = null;
  private bazaarClient: X402BazaarClient;
  private discoveredTools: Map<string, DiscoveredTool> = new Map();
  // Track service quality (in-memory, resets on restart)
  private serviceQuality: Map<string, { isBad: boolean; reason?: string }> = new Map();

  constructor() {
    // Validate required environment variables
    if (!XMTP_WALLET_KEY) {
      throw new Error('XMTP_WALLET_KEY environment variable is required');
    }
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.serverStartTime = new Date();
    // @ts-ignore - OpenAI import type issue with ts-node/esm
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    this.bazaarClient = new X402BazaarClient();

    // Initialize x402 clients if payment key is available
    if (PAYMENT_PRIVATE_KEY) {
      console.log('🔧 Initializing x402 payment clients...');
      
      // Keep old client for compatibility
      this.x402Client = new X402Client({
        privateKey: PAYMENT_PRIVATE_KEY as `0x${string}`,
        rpcUrl: BASE_RPC_URL,
        useMainnet: USE_MAINNET,
      });
      
      // New official client (uses x402-fetch package)
      this.x402OfficialClient = new X402OfficialClient({
        privateKey: PAYMENT_PRIVATE_KEY as `0x${string}`,
        rpcUrl: BASE_RPC_URL,
        useMainnet: USE_MAINNET,
      });
      
      console.log(`✅ x402 clients initialized (using official x402-fetch package)`);
      console.log(`   Payment wallet: ${this.x402OfficialClient.getAddress()}`);
      console.log(`   Network: ${USE_MAINNET ? 'Base Mainnet' : 'Base Sepolia'}`);
      
      // Check wallet balances at startup (async, don't block initialization)
      this.checkWalletBalancesAsync();
    } else {
      console.warn('⚠️  No PAYMENT_PRIVATE_KEY found - x402 payments will fail!');
      console.warn('   Set PAYMENT_PRIVATE_KEY or PRIVATE_KEY to enable payments');
    }

    // Initialize HTTP server for health checks
    this.httpServer = express();
    
    // Enable CORS for frontend (allow localhost for development)
    this.httpServer.use(cors({
      origin: process.env.FRONTEND_URL || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ],
      credentials: true,
    }));
    
    this.httpServer.use(express.json());
    this.setupHttpEndpoints();

    console.log(`\n🤖 XMTP x402 Bazaar Agent Configuration:`);
    console.log(`   XMTP Network: ${XMTP_ENV}`);
    console.log(`   AI: OpenAI GPT-4o`);
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
        ai: 'gpt-4o',
        discovery: 'cdp-x402-bazaar',
        paymentWallet: this.x402OfficialClient?.getAddress() || 'not configured',
        x402Configured: !!this.x402OfficialClient,
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
          ai: 'OpenAI GPT-4o',
          discovery: 'CDP x402 Bazaar',
          paymentSystem: 'x402 Protocol (Direct)',
          paymentWallet: this.x402OfficialClient?.getAddress() || 'NOT CONFIGURED',
          paymentNetwork: USE_MAINNET ? 'Base Mainnet' : 'Base Sepolia',
          maxServicePrice: `$${MAX_SERVICE_PRICE_USDC} USDC`,
          volumePath: RAILWAY_VOLUME || 'not configured',
        },
        capabilities: {
          x402Payments: !!this.x402OfficialClient,
          discoveredServices: this.discoveredTools.size,
          availableTools: tools,
        },
        ready: !!this.agent && !!this.x402OfficialClient,
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
        paymentWallet: this.x402OfficialClient?.getAddress() || 'NOT CONFIGURED',
        x402Configured: !!this.x402OfficialClient,
        discoveredServices: this.discoveredTools.size,
        endpoints: {
          health: '/health',
          status: '/status',
        },
      });
    });
  }

  /**
   * Check wallet balances at startup (non-blocking)
   */
  private async checkWalletBalancesAsync(): Promise<void> {
    if (!this.x402OfficialClient) return;
    
    try {
      console.log('\n💰 Checking payment wallet balances...');
      
      const usdcAddress = USE_MAINNET 
        ? X402BazaarClient.USDC_BASE_MAINNET 
        : X402BazaarClient.USDC_BASE_SEPOLIA;
      
      // Check balances for a minimal amount (0.01 USDC)
      const minAmount = BigInt(10000); // 0.01 USDC in atomic units
      const balances = await this.x402OfficialClient.checkBalances(usdcAddress as `0x${string}`, minAmount);
      
      if (balances.hasEnoughEth && balances.hasEnoughToken) {
        console.log('✅ Wallet is funded and ready for payments');
      } else {
        console.log('\n⚠️  WARNING: Wallet needs funding!');
        console.log(balances.errorMessage);
        console.log('\n💡 Fund your wallet to enable x402 payments:');
        console.log(`   1. Send ETH (for gas) to: ${this.x402OfficialClient.getAddress()}`);
        console.log(`   2. Send USDC (for payments) to: ${this.x402OfficialClient.getAddress()}`);
        console.log(`   Network: ${USE_MAINNET ? 'Base Mainnet' : 'Base Sepolia'}`);
      }
    } catch (error) {
      console.warn('⚠️  Could not check wallet balances:', error instanceof Error ? error.message : error);
    }
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
        // Check blacklist
        if (SERVICE_BLACKLIST.includes(service.resource)) {
          console.log(`   🚫 Blacklisted: ${service.resource} (known to return placeholder data)`);
          continue;
        }

        // Check service quality tracker
        const quality = this.serviceQuality.get(service.resource);
        if (quality?.isBad) {
          console.log(`   🚫 Skipping bad service: ${service.resource} (${quality.reason || 'returns placeholder data'})`);
          continue;
        }

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
        const priceNum = parseFloat(price);
        // Warn about services that might exceed x402-fetch payment limit (likely ~$0.20)
        if (priceNum > 0.20) {
          console.log(`   ⚠️  ${toolName}: $${price} USDC - ${service.resource} (may exceed x402-fetch payment limit)`);
        } else {
          console.log(`   ✅ ${toolName}: $${price} USDC - ${service.resource}`);
        }
      }

      console.log(`\n✅ Discovered ${this.discoveredTools.size} available services`);
    } catch (error) {
      console.error('❌ Failed to discover services:', error);
      throw error;
    }
  }

  /**
   * Generate a tool name from a URL
   * OpenAI requires function names to be max 64 characters
   */
  private generateToolName(url: string): string {
    const MAX_LENGTH = 64;
    
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
      
      // Enforce OpenAI's 64-character limit
      if (name.length > MAX_LENGTH) {
        // Keep domain and hash the rest to stay under limit
        const hash = Math.abs(this.hashString(url)).toString(36).substring(0, 8);
        const maxDomainLength = MAX_LENGTH - hash.length - 1; // -1 for underscore
        const truncatedDomain = domain.substring(0, maxDomainLength);
        name = `${truncatedDomain}_${hash}`;
      }
      
      return name || 'service';
    } catch {
      return 'service_' + Math.random().toString(36).substring(7);
    }
  }

  /**
   * Simple string hash function for generating consistent short identifiers
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
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
        // Register content type codecs
        codecs: [
          new ReactionCodec(),
          new AttachmentCodec(),
          new RemoteAttachmentCodec(),
        ],
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
    // Mount API server routes (for frontend) - lazy load to avoid import issues
    try {
      const apiModule = await import('../api/server.js');
      const apiServer = apiModule.default;
      const setAgentInstance = apiModule.setAgentInstance;
      this.httpServer.use('/api', apiServer);
      setAgentInstance(this);
      console.log('✅ API server routes mounted');
      console.log(`   Endpoints available:`);
      console.log(`   - POST /api/x402-research (proxy x402 calls)`);
      console.log(`   - POST /api/process-research (AI processing)`);
      console.log(`   - GET /api/api-health (health check)`);
    } catch (error) {
      console.error('❌ Could not load API server routes:', error instanceof Error ? error.message : error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
      console.error('❌ This means frontend API endpoints will not work!');
    }

    // Start HTTP server first
    this.httpServer.listen(PORT, () => {
      console.log(`\n🌐 HTTP server listening on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   Status: http://localhost:${PORT}/status`);
      console.log(`   API endpoint: http://localhost:${PORT}/api/process-research`);
      console.log(`   Frontend can connect to: http://localhost:${PORT}`);
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

      // Send 🧐 reaction immediately to show the agent is thinking
      try {
        await ctx.sendReaction('🧐');
        console.log(`   🧐 Sent thinking reaction`);
      } catch (error) {
        console.warn('   ⚠️  Could not send reaction:', error instanceof Error ? error.message : error);
      }

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

    // Listen for remote attachments
    this.agent.on('attachment', async (ctx) => {
      // Filter out messages from self
      if (filter.fromSelf(ctx.message, ctx.client)) {
        return;
      }

      // Get sender address
      let senderAddress = 'unknown';
      if (filter.isDM(ctx.conversation)) {
        senderAddress = ctx.conversation.peerInboxId;
      } else if (filter.isGroup(ctx.conversation)) {
        senderAddress = ctx.message.senderInboxId;
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`📎 Received attachment from ${senderAddress}`);
      console.log('='.repeat(80));

      try {
        // Check if it's a remote attachment
        if (ctx.usesCodec(RemoteAttachmentCodec)) {
          console.log('   📥 Loading remote attachment...');
          
          // Load and decrypt the remote attachment
          const attachment: {
            filename: string;
            mimeType: string;
            data: Uint8Array;
          } = await RemoteAttachmentCodec.load(
            ctx.message.content,
            ctx.client
          ) as {
            filename: string;
            mimeType: string;
            data: Uint8Array;
          };

          console.log(`   ✅ Attachment loaded:`);
          console.log(`      Filename: ${attachment.filename}`);
          console.log(`      MIME Type: ${attachment.mimeType}`);
          console.log(`      Size: ${attachment.data.byteLength} bytes`);

          // Send acknowledgment
          await ctx.sendText(
            `📎 Received your attachment: ${attachment.filename} (${attachment.mimeType}, ${(attachment.data.byteLength / 1024).toFixed(2)} KB)\n\n` +
            `I can process images, documents, and other file types. What would you like me to do with this file?`
          );

          // TODO: Add processing logic based on file type
          // - Images: Could use vision models to analyze
          // - PDFs: Extract text and process
          // - Text files: Read and analyze content
          // - etc.

        } else {
          // Handle local attachments (if any)
          console.log('   📎 Local attachment received');
          // Send response using conversation if available
          try {
            const ctxAny = ctx as any;
            if (ctxAny.sendText && typeof ctxAny.sendText === 'function') {
              await ctxAny.sendText('📎 I received your attachment. Remote attachment processing is preferred for better compatibility.');
            } else if (ctxAny.conversation && ctxAny.conversation.send) {
              await ctxAny.conversation.send('📎 I received your attachment. Remote attachment processing is preferred for better compatibility.');
            }
          } catch (e) {
            // Fallback if sendText doesn't work in this context
            console.warn('   ⚠️  Could not send text response for local attachment:', e);
          }
        }
      } catch (error) {
        console.error('❌ Error handling attachment:', error);
        try {
          const ctxAny = ctx as any;
          if (ctxAny.sendText && typeof ctxAny.sendText === 'function') {
            await ctxAny.sendText(
              `❌ Error processing your attachment: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`
            );
          }
        } catch (e) {
          console.warn('   ⚠️  Could not send error message:', e);
        }
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
      console.log(`🤖 AI: OpenAI GPT-4o`);
      console.log(`🔍 Discovery: CDP x402 Bazaar`);
      console.log(`💰 Max Service Price: $${MAX_SERVICE_PRICE_USDC} USDC`);
      console.log(`💳 Payment Wallet: ${this.x402OfficialClient?.getAddress() || 'NOT CONFIGURED'}`);
      console.log(`⛓️  Network: ${USE_MAINNET ? 'Base Mainnet' : 'Base Sepolia'}`);
      console.log(`🔧 x402 Method: Official x402-fetch package (proper 402 handling)`);
      
      if (!this.x402OfficialClient) {
        console.log('\n⚠️  WARNING: No payment wallet configured!');
        console.log('   x402 payments will fail. Set PAYMENT_PRIVATE_KEY to enable.');
      }
      
      if (XMTP_ENV === 'production') {
        console.log('\n✅ Users can message you on xmtp.chat!');
      } else if (XMTP_ENV === 'dev') {
        console.log('\n⚠️  DEV mode: Users on xmtp.chat CANNOT message you');
        console.log('   Use a dev client or switch to production');
      }
      
      console.log(`\n💡 This agent uses CDP x402 Bazaar for dynamic service discovery!`);
      console.log(`📎 Supports attachments and reactions (🧐)`);
      console.log(`\n🎯 Discovered Services (${this.discoveredTools.size}):`);
      
      for (const [name, tool] of this.discoveredTools) {
        const price = this.bazaarClient.formatPrice(tool.paymentInfo.maxAmountRequired, 6);
        console.log(`   - ${name}: $${price} USDC`);
        console.log(`     ${tool.service.resource}`);
      }
      
      console.log('\n📝 Try asking me to use any of these services!');
      console.log('📎 Send me attachments and I\'ll process them!');
      console.log('='.repeat(80));
    });

    // Start the agent
    await this.agent.start();
  }

  private async handleRequest(userQuery: string): Promise<string> {
    if (!this.x402OfficialClient) {
      return '❌ x402 payment client not configured. Please set PAYMENT_PRIVATE_KEY environment variable to enable payments.';
    }

    if (this.discoveredTools.size === 0) {
      return '❌ No services available. Try adjusting MAX_SERVICE_PRICE_USDC or check your network configuration.';
    }

    console.log(`\n🔍 Processing with CDP x402 Bazaar Discovery`);
    console.log(`   Query: "${userQuery}"`);
    console.log(`   Available services: ${this.discoveredTools.size}`);

    // Build tools for OpenAI from discovered services
    const tools: any[] = Array.from(this.discoveredTools.values()).map(tool => {
      const inputSchema = tool.paymentInfo.outputSchema?.input;
      const queryParams = inputSchema?.queryParams || {};
      const method = inputSchema?.method || 'GET';
      
      // Build properties from queryParams schema
      const properties: Record<string, any> = {};
      const required: string[] = [];
      
      if (method === 'GET' && Object.keys(queryParams).length > 0) {
        // Use actual query parameters from schema
        for (const [paramName, paramSchema] of Object.entries(queryParams)) {
          const schema = paramSchema as any;
          let description = schema.description || `${paramName} parameter`;
          
          // Make descriptions succinct (max 150 chars)
          if (description.length > 150) {
            description = description.substring(0, 147) + '...';
          }
          
          // Add format hints for common parameter types (succinctly)
          if (paramName.toLowerCase().includes('date') || paramName.toLowerCase().includes('time')) {
            if (!description.toLowerCase().includes('format') && !description.toLowerCase().includes('timestamp')) {
              description += ` (YYYY-MM-DD format)`;
            }
          } else if (paramName.toLowerCase().includes('query') || paramName.toLowerCase().includes('search')) {
            if (!description.toLowerCase().includes('search') && !description.toLowerCase().includes('query')) {
              description += ` (search term or query string)`;
            }
          } else if (paramName.toLowerCase().includes('limit')) {
            if (!description.toLowerCase().includes('number') && !description.toLowerCase().includes('integer')) {
              description += ` (integer, max results to return)`;
            }
          }
          
          const propertyDef: any = {
            type: schema.type || 'string',
            description,
          };
          
          // Handle array types - OpenAI requires 'items' definition
          if (schema.type === 'array') {
            propertyDef.items = schema.items || { type: 'string' };
          }
          
          properties[paramName] = propertyDef;
          if (schema.required) {
            required.push(paramName);
          }
        }
      } else if (method === 'GET') {
        // Fallback to generic query parameter
        properties.query = {
          type: 'string',
          description: 'Query or search term for the API request',
        };
        required.push('query');
      } else {
        // POST/PUT - check if service has bodyFields schema
        const bodyFields = (inputSchema as any)?.bodyFields;
        
        if (bodyFields && typeof bodyFields === 'object' && Object.keys(bodyFields).length > 0) {
          // Use the actual bodyFields schema from the service
          for (const [fieldName, fieldSchema] of Object.entries(bodyFields)) {
            const schema = fieldSchema as any;
            let description = schema.description || `${fieldName} parameter`;
            
            // Make descriptions succinct but clear
            if (description.length > 150) {
              description = description.substring(0, 147) + '...';
            }
            
            // Add format hints for common field types
            if (fieldName.toLowerCase().includes('username') || fieldName.toLowerCase().includes('user')) {
              if (!description.includes('@')) {
                description += ' (username without @ symbol)';
              }
            } else if (fieldName.toLowerCase().includes('url')) {
              if (!description.includes('http')) {
                description += ' (full URL, e.g., https://twitter.com/username)';
              }
            } else if (fieldName.toLowerCase().includes('date')) {
              if (!description.includes('format')) {
                description += ' (Unix timestamp)';
              }
            } else if (fieldName.toLowerCase().includes('limit')) {
              if (!description.includes('number')) {
                description += ' (integer, default if not specified)';
              }
            }
            
            const propertyDef: any = {
              type: schema.type || 'string',
              description,
            };
            
            // Handle array types - OpenAI requires 'items' definition
            if (schema.type === 'array') {
              propertyDef.items = schema.items || { type: 'string' };
            }
            
            properties[fieldName] = propertyDef;
            
            if (schema.required) {
              required.push(fieldName);
            }
          }
        } else {
          // Fallback: generic data field (will be remapped in executeDiscoveredService)
          properties.data = {
            type: 'string',
            description: 'Data to send to the API. Format depends on service type (username, URL, query, etc.)',
          };
          required.push('data');
        }
      }
      
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties,
            required,
          },
        },
      };
    });

    // Get current date info for system prompt
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let messages: any[] = [
      {
        role: 'system',
        content: `You are a helpful research assistant with access to paid data services via the x402 protocol.

CURRENT DATE: ${today}

IMPORTANT GUIDELINES:
1. Only use paid tools when the user explicitly requests data, research, or information that requires calling an API
2. If the user asks ABOUT the services, protocol, or capabilities, answer directly without calling tools
3. **CRITICAL - Service Selection**: Only use services that match the query domain:
   - For local business/restaurant queries: DO NOT use crypto/blockchain news services
   - For general research: Use general research services, not crypto-specific ones
   - For crypto/trading queries: Use crypto/blockchain services
   - If no appropriate service exists, inform the user rather than using an irrelevant service
4. **Choosing Between Similar Services**: When multiple similar services exist (e.g., multiple trading signal services):
   - Prefer more specific services over generic ones (e.g., "current/latest signals" for real-time data, "bias-optimized signals" for trading strategies)
   - Match the service type to the query intent (e.g., "current" for "what's happening now", "bias-optimized" for "best trading opportunities")
   - If services are equivalent, prefer the cheaper one to save costs
   - Read the full tool description including cost and endpoint to make informed choices
5. When filling date parameters (from_date, to_date, etc.):
   - For "latest" or "recent" news/data: Use ${sevenDaysAgo} to ${today} (last 7 days)
   - For "current" information: Use ${thirtyDaysAgo} to ${today} (last 30 days)
   - NEVER use dates from 2023 or earlier unless explicitly requested
   - Always use YYYY-MM-DD format
6. Use appropriate, recent date ranges that match the user's intent
7. Each tool call costs money, so only use them when necessary

CRITICAL: When you use any tool (all tools are x402-paid services):
- ALWAYS acknowledge in your response that you retrieved data using x402 protocol
- **VALIDATE RESULTS**: If the tool returns data that doesn't match the query (e.g., crypto news for a local business query), explicitly tell the user the service returned irrelevant data
- If the tool returns minimal or placeholder data (like just a Twitter link), explain this to the user
- If asked whether you used x402, you MUST answer truthfully - if you called any tool, you used x402
- Be transparent about what data you received and how you're using it

Remember: You are operating in November 2025. Any "recent" data should be from 2025.`,
      },
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

      // Call OpenAI
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        tools,
        messages,
      });

      const choice = response.choices[0];
      console.log(`   Finish reason: ${choice.finish_reason}`);

      // If OpenAI is done, return the response
      if (choice.finish_reason === 'stop') {
        const finalText = choice.message.content || '';
        console.log(`\n✅ Request completed in ${iteration} iteration(s)`);
        return finalText || 'Request completed, but no response generated.';
      }

      // Handle tool calls
      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
        const assistantMessage = choice.message;
        messages.push(assistantMessage);

        for (const toolCall of choice.message.tool_calls) {
          console.log(`\n   🔧 Tool: ${toolCall.function.name}`);
          console.log(`      Input: ${toolCall.function.arguments}`);

          try {
            const args = JSON.parse(toolCall.function.arguments);
            
            // Execute the discovered service
            const result = await this.executeDiscoveredService(
              toolCall.function.name,
              args
            );

            // Check if result is placeholder data (from x402-official-client detection)
            const tool = this.discoveredTools.get(toolCall.function.name);
            if (tool && typeof result === 'object' && result !== null && !Array.isArray(result)) {
              const resultObj = result as Record<string, any>;
              if (resultObj._placeholder_data === true) {
                // Mark service as bad and remove from discoveredTools
                const serviceUrl = tool.service.resource;
                this.serviceQuality.set(serviceUrl, {
                  isBad: true,
                  reason: resultObj._warning || 'Returns placeholder data, not actual content'
                });
                this.discoveredTools.delete(toolCall.function.name);
                console.log(`   🚫 Service marked as bad and removed: ${serviceUrl}`);
                console.log(`      Reason: ${resultObj._warning || 'Returns placeholder data'}`);
              }
            }

            console.log(`      ✅ Success`);
            
            // Validate result relevance to query
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
            const queryLower = userQuery.toLowerCase();
            const resultLower = resultStr.toLowerCase();
            
            // Check if result seems irrelevant (crypto/blockchain data for non-crypto queries)
            const isCryptoQuery = /crypto|blockchain|bitcoin|ethereum|defi|token|nft|trading|base|coin/i.test(queryLower);
            const isCryptoResult = /crypto|blockchain|bitcoin|ethereum|defi|token|nft|trading|base|coin|sentiment.*bullish|sentiment.*bearish|protocol|decentralized/i.test(resultLower);
            const isLocalBusinessQuery = /bar|restaurant|cafe|shop|store|local|oakland|san francisco|city|neighborhood/i.test(queryLower);
            
            let validationNote = '';
            if (!isCryptoQuery && isCryptoResult && isLocalBusinessQuery) {
              validationNote = `\n\n⚠️ WARNING: This service returned crypto/blockchain data, but the query is about local businesses. The results may not be relevant.`;
              console.log(`   ⚠️  Result validation: Service returned crypto data for local business query`);
            } else if (!isCryptoQuery && isCryptoResult) {
              validationNote = `\n\n⚠️ WARNING: This service returned crypto/blockchain data, but the query is not crypto-related. The results may not be relevant.`;
              console.log(`   ⚠️  Result validation: Service returned crypto data for non-crypto query`);
            }
            
            // Add metadata to indicate this came from x402
            const resultWithMetadata = {
              _x402_source: true,
              _service_name: toolCall.function.name,
              _data: result,
              _validation_note: validationNote || undefined,
            };
            
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: typeof result === 'string' 
                ? `[x402 data from ${toolCall.function.name}]${validationNote}\n\n${result}`
                : JSON.stringify(resultWithMetadata),
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`      ❌ Failed: ${errorMessage}`);
            
            // Check if this is a payment limit error - service should already be marked bad
            if (errorMessage.includes('exceeds maximum allowed') || errorMessage.includes('Payment amount exceeds')) {
              console.log(`   ⚠️  Service was removed due to payment limit. Agent will try alternative services.`);
            }
            
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error: ${errorMessage}`,
            });
          }
        }

        // Continue to next iteration
        continue;
      }

      // Unexpected finish reason
      console.warn(`   ⚠️  Unexpected finish reason: ${choice.finish_reason}`);
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

    if (!this.x402OfficialClient && !this.x402Client) {
      throw new Error('x402 payment client not configured');
    }

    // Validate date parameters to catch obviously wrong dates
    this.validateDateParameters(input);

    const inputSchema = tool.paymentInfo.outputSchema?.input;
    const method = (inputSchema?.method || 'GET').toUpperCase() as 'GET' | 'POST';
    const price = parseFloat(this.bazaarClient.formatPrice(tool.paymentInfo.maxAmountRequired, 6));
    
    console.log(`\n   💰 Executing discovered service via x402:`);
    console.log(`      Service: ${tool.service.resource}`);
    console.log(`      Method: ${method}`);
    console.log(`      Expected price: ~${price.toFixed(6)} USDC`);
    console.log(`      Using official x402-fetch (proper EIP-3009 implementation)`);
    
    // Build query parameters from input
    let queryParams: Record<string, string> = {};
    let requestBody: any = input;
    
    if (method === 'GET') {
      // Pass all input fields as query parameters
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined && value !== null) {
          queryParams[key] = String(value);
        }
      }
    } else {
      // POST/PUT - improve body mapping
      // First, check if the service has an input schema with bodyFields
      const inputSchema = tool.paymentInfo.outputSchema?.input;
      const bodyFields = (inputSchema as any)?.bodyFields;
      
      if (bodyFields && typeof bodyFields === 'object') {
        // Service has defined body fields - use them!
        requestBody = {};
        const dataValue = input.data;
        
        // Map 'data' to the first required field, or first field if none required
        // Prioritize common parameter names: bias, query, data, input
        const fieldEntries = Object.entries(bodyFields) as Array<[string, any]>;
        const requiredFields = fieldEntries.filter(([_, schema]) => schema.required);
        
        // Priority order for parameter names (most specific first)
        const priorityFields = ['bias', 'query', 'input', 'data', 'text', 'prompt'];
        
        let targetField: string | undefined;
        
        // First, try to find a priority field in required fields
        if (requiredFields.length > 0) {
          const priorityRequired = requiredFields.find(([name]) => 
            priorityFields.includes(name.toLowerCase())
          );
          if (priorityRequired) {
            targetField = priorityRequired[0];
          } else {
            targetField = requiredFields[0][0];
          }
        } else {
          // No required fields - try to find a priority field in all fields
          const priorityField = fieldEntries.find(([name]) => 
            priorityFields.includes(name.toLowerCase())
          );
          targetField = priorityField ? priorityField[0] : fieldEntries[0]?.[0];
        }
        
        if (targetField && dataValue !== undefined) {
          let value = String(dataValue).trim();
          
          // Special handling for username fields
          if (targetField.toLowerCase().includes('username') || targetField.toLowerCase().includes('user')) {
            if (value.startsWith('@')) {
              value = value.substring(1);
            }
            requestBody[targetField] = value;
            console.log(`   🔧 Using schema: mapping 'data' to '${targetField}' (removed @ symbol)`);
          } else if (targetField.toLowerCase().includes('url')) {
            // For URL fields, check if it's a username and convert to Twitter URL
            if (!value.startsWith('http')) {
              // Assume it's a Twitter username, convert to URL
              const username = value.startsWith('@') ? value.substring(1) : value;
              value = `https://twitter.com/${username}`;
            }
            requestBody[targetField] = value;
            console.log(`   🔧 Using schema: mapping 'data' to '${targetField}' (converted to URL)`);
          } else {
            requestBody[targetField] = value;
            console.log(`   🔧 Using schema: mapping 'data' to '${targetField}'`);
          }
          
          // Add any other required fields with defaults if available
          for (const [fieldName, schema] of fieldEntries) {
            if (fieldName !== targetField && schema.required && schema.default !== undefined) {
              requestBody[fieldName] = schema.default;
            }
          }
        } else {
          // Fall back to original input
          requestBody = input;
        }
      } else if (input.data && Object.keys(input).length === 1) {
        // No schema - try to infer from URL
        const dataValue = input.data;
        const url = tool.service.resource.toLowerCase();
        
        // Try to infer parameter name from URL or service type
        if (url.includes('twitter') || url.includes('username') || url.includes('user')) {
          // For Twitter services, map "data" to "username" and remove @ symbol
          let username = String(dataValue).trim();
          if (username.startsWith('@')) {
            username = username.substring(1);
          }
          requestBody = { username };
          console.log(`   🔧 Remapping 'data' to 'username' and removing @ symbol`);
        } else if (url.includes('social') && url.includes('trust')) {
          // Social trust services might need URL format
          let value = String(dataValue).trim();
          if (!value.startsWith('http')) {
            // Assume Twitter username, convert to URL
            const username = value.startsWith('@') ? value.substring(1) : value;
            value = `https://twitter.com/${username}`;
          }
          requestBody = { url: value };
          console.log(`   🔧 Remapping 'data' to 'url' (converted Twitter username to URL)`);
        } else if (url.includes('email')) {
          requestBody = { email: String(dataValue) };
          console.log(`   🔧 Remapping 'data' to 'email'`);
        } else if (url.includes('query') || url.includes('search')) {
          requestBody = { query: String(dataValue) };
          console.log(`   🔧 Remapping 'data' to 'query'`);
        } else if (url.includes('bias') || toolName.toLowerCase().includes('bias')) {
          // Bias signals services expect "bias" parameter
          requestBody = { bias: String(dataValue) };
          console.log(`   🔧 Remapping 'data' to 'bias' (detected bias service)`);
        } else if (url.includes('signal') || toolName.toLowerCase().includes('signal')) {
          // Signal services might expect "bias", "query", or "data" - try "bias" first for signals
          requestBody = { bias: String(dataValue) };
          console.log(`   🔧 Remapping 'data' to 'bias' (detected signal service)`);
        } else {
          // Keep as-is but log it
          console.log(`   ⚠️  Using generic 'data' field - API might expect different parameter name`);
        }
      }
    }
    
    try {
      // Always use official x402-fetch client - it properly implements EIP-3009
      // The custom client doesn't implement the x402 protocol correctly (uses simple transfer instead of transferWithAuthorization)
      if (!this.x402OfficialClient) {
        throw new Error('x402 payment client not configured');
      }
      
      const result = await this.x402OfficialClient.callEndpoint(
        tool.service.resource,
        {
          method,
          ...(method === 'POST' ? { body: requestBody } : {}),
          ...(method === 'GET' && Object.keys(queryParams).length > 0 ? { queryParams } : {}),
        }
      );
      
      console.log(`      ✅ Data received via official x402 protocol`);
      
      return result;
    } catch (error: any) {
      // Improve error messages for users
      const errorMessage = error?.message || String(error);
      
      // Check for payment amount limit errors (x402-fetch may have a maximum payment limit)
      if (errorMessage.includes('Payment amount exceeds maximum allowed') || 
          errorMessage.includes('exceeds maximum allowed')) {
        // Mark service as bad - it exceeds x402-fetch's payment limit
        const serviceUrl = tool.service.resource;
        this.serviceQuality.set(serviceUrl, {
          isBad: true,
          reason: `Payment amount ($${price.toFixed(6)} USDC) exceeds x402-fetch maximum limit`
        });
        this.discoveredTools.delete(toolName);
        console.log(`   🚫 Service marked as bad and removed: ${serviceUrl}`);
        console.log(`      Reason: Payment amount exceeds x402-fetch limit`);
        throw new Error(
          `The service "${tool.name}" costs $${price.toFixed(6)} USDC, which exceeds the maximum payment limit. ` +
          `Please try a different service with a lower price.`
        );
      }
      
      // Check for specific HTTP error codes
      if (errorMessage.includes('502') || errorMessage.includes('Bad Gateway')) {
        throw new Error(
          `The x402 service "${tool.name}" is currently unavailable (502 Bad Gateway). ` +
          `This usually means the service is temporarily down. Please try again in a few minutes, ` +
          `or ask me to try a different service.`
        );
      } else if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
        throw new Error(
          `The x402 service "${tool.name}" is temporarily unavailable. Please try again later.`
        );
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        throw new Error(
          `The x402 service "${tool.name}" endpoint was not found. This service may have been removed or changed.`
        );
      } else if (errorMessage.includes('402') || errorMessage.includes('Payment Required')) {
        throw new Error(
          `Payment failed for "${tool.name}". This could be due to insufficient USDC balance ` +
          `or a payment processing issue. Please check your wallet balance.`
        );
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        throw new Error(
          `The request to "${tool.name}" timed out. The service may be slow or overloaded. ` +
          `Please try again.`
        );
      }
      
      // Re-throw with original message if no specific handling
      throw error;
    }
  }

  /**
   * Validate date parameters to catch obviously wrong dates
   */
  private validateDateParameters(input: Record<string, any>): void {
    const currentYear = new Date().getFullYear();
    const oneYearAgo = currentYear - 1;
    
    for (const [key, value] of Object.entries(input)) {
      // Check if this looks like a date parameter
      if ((key.includes('date') || key.includes('time')) && typeof value === 'string') {
        // Check if it matches YYYY-MM-DD or YYYY/MM/DD format
        const dateMatch = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        if (dateMatch) {
          const year = parseInt(dateMatch[1]);
          
          // Warn if date is more than 1 year old
          if (year < oneYearAgo) {
            console.log(`\n   ⚠️  WARNING: Potentially outdated date parameter detected`);
            console.log(`      Parameter: ${key} = ${value}`);
            console.log(`      This is from ${year}, but current year is ${currentYear}`);
            console.log(`      API call will proceed, but results may be historical data`);
          }
        }
      }
    }
  }
}

// Start the agent
try {
  const agent = new XMTPBazaarAgent();
  agent.start().catch((error) => {
    console.error('❌ Fatal error starting agent:', error);
    console.error('Error stack:', error?.stack);
    process.exit(1);
  });
} catch (error: any) {
  console.error('❌ Fatal error creating agent:', error);
  console.error('Error type:', typeof error);
  console.error('Error constructor:', error?.constructor?.name);
  console.error('Error message:', error?.message);
  console.error('Error stack:', error?.stack);
  if (error && typeof error === 'object') {
    console.error('Error keys:', Object.keys(error));
  }
  process.exit(1);
}

export default XMTPBazaarAgent;
