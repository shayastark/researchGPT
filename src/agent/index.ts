import { Agent, filter, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import OpenAI from 'openai';
import express from 'express';
import dotenv from 'dotenv';
import { X402Client } from '../lib/x402-client';

dotenv.config();

// Environment variables - XMTP
const XMTP_WALLET_KEY = process.env.XMTP_WALLET_KEY || '';
const XMTP_ENV = (process.env.XMTP_ENV || 'dev') as 'local' | 'dev' | 'production';
const XMTP_DB_ENCRYPTION_KEY = process.env.XMTP_DB_ENCRYPTION_KEY;

// Environment variables - OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Environment variables - Base blockchain
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const USE_MAINNET = process.env.USE_MAINNET === 'true';

// Service endpoints (x402-enabled)
const MARKET_DATA_SERVICE = process.env.MARKET_DATA_SERVICE || 'http://localhost:3001';
const SENTIMENT_SERVICE = process.env.SENTIMENT_SERVICE || 'http://localhost:3002';
const ONCHAIN_SERVICE = process.env.ONCHAIN_SERVICE || 'http://localhost:3003';

// Railway volume path for persistent database
const RAILWAY_VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;

// HTTP server port (for Railway health checks)
const PORT = parseInt(process.env.PORT || '3000');

interface ResearchRequest {
  query: string;
  needsMarketData: boolean;
  needsSentiment: boolean;
  needsOnchain: boolean;
}

class XMTPResearchAgent {
  private agent!: Agent;
  private openai: OpenAI;
  private x402Client: X402Client;
  private httpServer: express.Application;
  private serverStartTime: Date;

  constructor() {
    // Validate required environment variables
    if (!XMTP_WALLET_KEY) {
      throw new Error('XMTP_WALLET_KEY environment variable is required');
    }
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    if (!PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }

    this.serverStartTime = new Date();

    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    this.x402Client = new X402Client({
      rpcUrl: BASE_RPC_URL,
      privateKey: PRIVATE_KEY,
      network: USE_MAINNET ? 'mainnet' : 'testnet',
    });

    // Initialize HTTP server for health checks
    this.httpServer = express();
    this.httpServer.use(express.json());
    this.setupHttpEndpoints();

    console.log(`🤖 XMTP Research Agent Configuration:`);
    console.log(`   XMTP Network: ${XMTP_ENV}`);
    console.log(`   Base Network: ${USE_MAINNET ? 'Base (mainnet)' : 'Base Sepolia (testnet)'}`);
    console.log(`   Wallet: ${this.x402Client.getAddress()}`);
    console.log(`   HTTP Port: ${PORT}`);
    
    // Warning if on dev network
    if (XMTP_ENV === 'dev') {
      console.log('\n⚠️  WARNING: Agent is on DEV network');
      console.log('   Users on xmtp.chat will NOT be able to message you!');
      console.log('   To fix: Set XMTP_ENV=production and run npm run initialize-production');
    }
  }

  private setupHttpEndpoints() {
    // Health check endpoint (required for Railway)
    this.httpServer.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'xmtp-research-agent',
        uptime: Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000),
        xmtpNetwork: XMTP_ENV,
        baseNetwork: USE_MAINNET ? 'mainnet' : 'testnet',
        address: this.agent?.address || 'not initialized',
        timestamp: new Date().toISOString(),
      });
    });

    // Status endpoint with detailed information
    this.httpServer.get('/status', (req, res) => {
      res.json({
        service: 'XMTP Research Agent',
        version: '1.0.0',
        status: 'running',
        uptime: Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000),
        configuration: {
          xmtpNetwork: XMTP_ENV,
          baseNetwork: USE_MAINNET ? 'mainnet' : 'testnet',
          agentAddress: this.agent?.address || 'not initialized',
          inboxId: this.agent?.client?.inboxId || 'not initialized',
          walletAddress: this.x402Client.getAddress(),
          volumePath: RAILWAY_VOLUME || 'not configured',
        },
        services: {
          marketData: MARKET_DATA_SERVICE,
          sentiment: SENTIMENT_SERVICE,
          onchain: ONCHAIN_SERVICE,
        },
        ready: !!this.agent,
        timestamp: new Date().toISOString(),
      });
    });

    // Root endpoint
    this.httpServer.get('/', (req, res) => {
      res.json({
        service: 'XMTP Research Agent',
        message: 'Agent is running. Send XMTP messages to interact.',
        agentAddress: this.agent?.address || 'initializing...',
        xmtpNetwork: XMTP_ENV,
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
          encryptionKey: Buffer.from(XMTP_DB_ENCRYPTION_KEY, 'hex')
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

    console.log('\n🤖 XMTP Research Agent starting...');

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

      console.log(`\n📨 Received message from ${senderAddress}`);
      console.log(`   Query: "${messageContent}"\n`);

      try {
        // Process the research request
        const response = await this.handleResearchRequest(messageContent);

        // Send response back via XMTP
        await ctx.sendText(response);
        console.log(`✅ Response sent to ${senderAddress}\n`);
      } catch (error) {
        console.error('❌ Error handling message:', error);
        const errorMessage = `❌ Error processing your request: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        await ctx.sendText(errorMessage);
      }
    });

    // Listen for group messages
    this.agent.on('group', async (ctx) => {
      console.log('👥 New group conversation created');
    });

    // Listen for DMs
    this.agent.on('dm', async (ctx) => {
      console.log('💬 New DM conversation created');
    });

    // Handle errors
    this.agent.on('unhandledError', (error) => {
      console.error('❌ Unhandled agent error:', error);
    });

    // Start event
    this.agent.on('start', () => {
      console.log('\n' + '═'.repeat(60));
      console.log('✅ XMTP Research Agent is now online!');
      console.log('═'.repeat(60));
      console.log(`\n📬 Agent Address: ${this.agent.address}`);
      console.log(`📊 InboxId: ${this.agent.client.inboxId}`);
      console.log(`🌐 Environment: ${XMTP_ENV}`);
      
      if (XMTP_ENV === 'production') {
        console.log('✅ Users can message you on xmtp.chat!');
      } else if (XMTP_ENV === 'dev') {
        console.log('⚠️  DEV mode: Users on xmtp.chat CANNOT message you');
        console.log('   Use a dev client or switch to production');
      }
      
      console.log(`\n💡 Send a message to start researching!\n`);
      console.log('Example queries:');
      console.log('  - "What\'s Bitcoin\'s price?"');
      console.log('  - "Is Ethereum sentiment bullish?"');
      console.log('  - "Full research on Solana"\n');
    });

    // Start the agent
    await this.agent.start();
  }

  private async handleResearchRequest(query: string): Promise<string> {
    console.log(`🔍 Processing research request: "${query}"`);

    try {
      // Step 1: Analyze the query with GPT-4 to determine what data is needed
      const researchPlan = await this.planResearch(query);
      console.log('📋 Research plan:', JSON.stringify(researchPlan, null, 2));

      // Step 2: Fetch data from x402 services (paying with USDC)
      const data: any = {};
      let totalCost = 0;

      if (researchPlan.needsMarketData) {
        console.log('\n💰 Fetching market data ($0.10)...');
        try {
          const result = await this.x402Client.post(`${MARKET_DATA_SERVICE}/api/market`, {
            query: query,
          });
          data.marketData = result.data.data;
          totalCost += 0.1;
          console.log('✅ Market data received');
        } catch (error) {
          console.error('❌ Failed to fetch market data:', error);
          data.marketData = { error: 'Service unavailable' };
        }
      }

      if (researchPlan.needsSentiment) {
        console.log('\n😊 Fetching sentiment analysis ($0.15)...');
        try {
          const result = await this.x402Client.post(`${SENTIMENT_SERVICE}/api/sentiment`, {
            query: query,
          });
          data.sentiment = result.data.data;
          totalCost += 0.15;
          console.log('✅ Sentiment data received');
        } catch (error) {
          console.error('❌ Failed to fetch sentiment data:', error);
          data.sentiment = { error: 'Service unavailable' };
        }
      }

      if (researchPlan.needsOnchain) {
        console.log('\n⛓️  Fetching on-chain data ($0.20)...');
        try {
          const result = await this.x402Client.post(`${ONCHAIN_SERVICE}/api/onchain`, {
            query: query,
          });
          data.onchain = result.data.data;
          totalCost += 0.2;
          console.log('✅ On-chain data received');
        } catch (error) {
          console.error('❌ Failed to fetch on-chain data:', error);
          data.onchain = { error: 'Service unavailable' };
        }
      }

      console.log(`\n💵 Total cost: $${totalCost.toFixed(2)} USDC`);

      // Step 3: Synthesize results with GPT-4
      console.log('\n🤖 Synthesizing research report with GPT-4...');
      const report = await this.synthesizeReport(query, data, totalCost);
      console.log('✅ Report generated');

      return report;
    } catch (error) {
      console.error('❌ Error in handleResearchRequest:', error);
      throw error;
    }
  }

  private async planResearch(query: string): Promise<ResearchRequest> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a research planner for crypto assets. Analyze the user's query and determine which data sources are needed:

- Market data ($0.10): price, volume, trading data, market cap
- Sentiment ($0.15): social media, news sentiment, fear/greed index
- Onchain ($0.20): blockchain transactions, smart contract data, whale activity

Respond with JSON only: {"needsMarketData": boolean, "needsSentiment": boolean, "needsOnchain": boolean}

Examples:
- "What's Bitcoin's price?" → {"needsMarketData": true, "needsSentiment": false, "needsOnchain": false}
- "Is Ethereum sentiment bullish?" → {"needsMarketData": false, "needsSentiment": true, "needsOnchain": false}
- "Full research on Solana" → {"needsMarketData": true, "needsSentiment": true, "needsOnchain": true}`,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const plan = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      query,
      needsMarketData: plan.needsMarketData || false,
      needsSentiment: plan.needsSentiment || false,
      needsOnchain: plan.needsOnchain || false,
    };
  }

  private async synthesizeReport(query: string, data: any, cost: number): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional crypto research analyst. Synthesize the provided data into a clear, comprehensive, and actionable report.

Format the report with:
- Executive Summary (key findings)
- Detailed Analysis (break down each data source)
- Key Insights (actionable takeaways)
- Research Cost (mention the cost paid for this premium data)

Be concise but thorough. Use emojis for readability.`,
        },
        {
          role: 'user',
          content: `Query: ${query}

Data collected (cost: $${cost.toFixed(2)} USDC):
${JSON.stringify(data, null, 2)}

Provide a comprehensive research report.`,
        },
      ],
    });

    return completion.choices[0].message.content || 'No report generated';
  }
}

// Start the agent
const agent = new XMTPResearchAgent();
agent.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export default XMTPResearchAgent;
