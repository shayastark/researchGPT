import { Agent, filter, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import OpenAI from 'openai';
import express from 'express';
import dotenv from 'dotenv';
import { X402Client } from '../lib/x402-client.js';

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

// Railway volume path for persistent database
const RAILWAY_VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;

// HTTP server port (for Railway health checks)
const PORT = parseInt(process.env.PORT || '3000');

// x402 endpoints configuration
const X402_ENDPOINTS = {
  ai_research: {
    url: 'https://www.capminal.ai/api/x402/research',
    method: 'POST' as const,
    description: 'Comprehensive AI and tech research using premium data sources',
  },
  weather_forecast: {
    url: 'https://sbx-x402.sapa-ai.com/weather',
    method: 'GET' as const,
    description: 'Get detailed weather forecasts for any location',
  },
  llm_research: {
    url: 'https://x402.ottoai.services/llm-research',
    method: 'POST' as const,
    description: 'Advanced LLM-powered research and analysis',
  },
  job_search: {
    url: 'https://otaku.so/api/messaging/jobs',
    method: 'POST' as const,
    description: 'Search for job listings and career opportunities',
  },
  crypto_gems: {
    url: 'https://api.canza.app/token/gems-list',
    method: 'GET' as const,
    description: 'Discover promising cryptocurrency tokens and gems',
  },
  technical_analysis: {
    url: 'https://api.ethyai.app/x402/ta',
    method: 'GET' as const,
    description: 'Technical analysis for cryptocurrency trading',
  },
};

class XMTPResearchAgent {
  private agent!: Agent;
  private httpServer: express.Application;
  private serverStartTime: Date;
  private openai: OpenAI;
  private x402Client: X402Client | null = null;

  constructor() {
    // Validate required environment variables
    if (!XMTP_WALLET_KEY) {
      throw new Error('XMTP_WALLET_KEY environment variable is required');
    }
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.serverStartTime = new Date();
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

    console.log(`\n🤖 XMTP x402 Agent Configuration:`);
    console.log(`   XMTP Network: ${XMTP_ENV}`);
    console.log(`   AI: OpenAI GPT-4o`);
    console.log(`   Payments: x402 Protocol (Direct)`);
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
        service: 'xmtp-x402-agent',
        uptime: Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000),
        xmtpNetwork: XMTP_ENV,
        ai: 'gpt-4o',
        payments: 'x402-direct',
        paymentWallet: this.x402Client?.getAddress() || 'not configured',
        x402Configured: !!this.x402Client,
        address: this.agent?.address || 'not initialized',
        timestamp: new Date().toISOString(),
      });
    });

    // Status endpoint with detailed information
    this.httpServer.get('/status', (req, res) => {
      res.json({
        service: 'XMTP x402 Agent',
        version: '5.0.0-direct',
        status: 'running',
        uptime: Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000),
        configuration: {
          xmtpNetwork: XMTP_ENV,
          agentAddress: this.agent?.address || 'not initialized',
          inboxId: this.agent?.client?.inboxId || 'not initialized',
          ai: 'OpenAI GPT-4o',
          paymentSystem: 'x402 Protocol (Direct)',
          paymentWallet: this.x402Client?.getAddress() || 'NOT CONFIGURED',
          paymentNetwork: USE_MAINNET ? 'Base Mainnet' : 'Base Sepolia',
          volumePath: RAILWAY_VOLUME || 'not configured',
        },
        capabilities: {
          x402Payments: !!this.x402Client,
          availableTools: Object.keys(X402_ENDPOINTS),
        },
        ready: !!this.agent && !!this.x402Client,
        timestamp: new Date().toISOString(),
      });
    });

    // Root endpoint
    this.httpServer.get('/', (req, res) => {
      res.json({
        service: 'XMTP x402 Agent',
        message: 'AI research agent with x402 payment protocol. Payments made directly on Base blockchain.',
        agentAddress: this.agent?.address || 'initializing...',
        xmtpNetwork: XMTP_ENV,
        paymentWallet: this.x402Client?.getAddress() || 'NOT CONFIGURED',
        x402Configured: !!this.x402Client,
        endpoints: {
          health: '/health',
          status: '/status',
        },
      });
    });
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

    console.log('\n🤖 XMTP x402 Agent starting...');

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
        // Process the research request with x402 payments
        const response = await this.handleResearchRequest(messageContent);

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
      console.log('✅ XMTP x402 AGENT IS NOW ONLINE!');
      console.log('═'.repeat(80));
      console.log(`\n📬 Agent Address: ${this.agent.address}`);
      console.log(`📊 InboxId: ${this.agent.client.inboxId}`);
      console.log(`🌐 Environment: ${XMTP_ENV}`);
      console.log(`🤖 AI: OpenAI GPT-4o`);
      console.log(`💰 Payments: x402 Protocol (Direct on-chain)`);
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
      
      console.log(`\n💡 This agent demonstrates x402 payment protocol!\n`);
      console.log('🎯 Available Tools:');
      Object.entries(X402_ENDPOINTS).forEach(([name, config]) => {
        console.log(`   - ${name}: ${config.description}`);
      });
      console.log('\n📝 Example queries:');
      console.log('  - "Research the latest trends in AI agents"');
      console.log('  - "What\'s the weather in San Francisco?"');
      console.log('  - "Find me some promising crypto gems"');
      console.log('  - "Technical analysis for Bitcoin"\n');
      console.log('='.repeat(80));
    });

    // Start the agent
    await this.agent.start();
  }

  private async handleResearchRequest(userQuery: string): Promise<string> {
    if (!this.x402Client) {
      return '❌ x402 payment client not configured. Please set PAYMENT_PRIVATE_KEY environment variable to enable payments.';
    }

    console.log(`\n🔍 Processing with x402 Payment Protocol`);
    console.log(`   Query: "${userQuery}"`);

    // Define tools for OpenAI
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = Object.entries(X402_ENDPOINTS).map(([name, config]) => ({
      type: 'function',
      function: {
        name,
        description: `${config.description} (x402 payment required - USDC on Base)`,
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: name === 'weather_forecast' 
                ? 'The location to get weather for' 
                : 'The research query or search term',
            },
          },
          required: ['query'],
        },
      },
    }));

    // Get current date info for system prompt
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a helpful research assistant with access to paid data services via the x402 protocol.

CURRENT DATE: ${today}

IMPORTANT GUIDELINES:
1. Only use paid tools when the user explicitly requests data, research, or information that requires calling an API
2. If the user asks ABOUT the x402 services, protocol, or capabilities, answer directly without calling tools
3. Each tool call costs money (paid in USDC on Base blockchain), so only use them when necessary
4. When researching, focus on the user's specific request and use the most appropriate tool
5. You are operating in November 2025, so focus on current and recent information`,
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
        console.log(`\n✅ Research completed in ${iteration} iteration(s)`);
        return finalText || 'Research completed, but no response generated.';
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
            
            // Execute the x402 tool call
            const result = await this.executeX402Tool(
              toolCall.function.name,
              args
            );

            console.log(`      ✅ Success`);
            
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: typeof result === 'string' ? result : JSON.stringify(result),
            });
          } catch (error) {
            console.error(`      ❌ Failed: ${error instanceof Error ? error.message : error}`);
            
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

    return 'Research completed after maximum iterations.';
  }

  private async executeX402Tool(
    toolName: string,
    input: { query: string }
  ): Promise<any> {
    const endpoint = X402_ENDPOINTS[toolName as keyof typeof X402_ENDPOINTS];
    
    if (!endpoint) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    if (!this.x402Client) {
      throw new Error('x402 payment client not configured');
    }

    console.log(`\n   💰 Executing x402 payment call:`);
    console.log(`      Endpoint: ${endpoint.url}`);
    console.log(`      Method: ${endpoint.method}`);
    console.log(`      Query: ${input.query}`);

    // Call x402 endpoint with automatic payment handling
    const result = await this.x402Client.callEndpoint(endpoint.url, {
      method: endpoint.method,
      ...(endpoint.method === 'POST' ? { body: { query: input.query } } : {}),
      ...(endpoint.method === 'GET' ? { queryParams: { query: input.query } } : {}),
    });

    console.log(`      ✅ Data received via x402 protocol`);
    
    return result;
  }
}

// Start the agent
const agent = new XMTPResearchAgent();
agent.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export default XMTPResearchAgent;
