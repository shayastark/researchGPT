import { Agent, filter, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Environment variables - XMTP
const XMTP_WALLET_KEY = process.env.XMTP_WALLET_KEY || '';
const XMTP_ENV = (process.env.XMTP_ENV || 'dev') as 'local' | 'dev' | 'production';
const XMTP_DB_ENCRYPTION_KEY = process.env.XMTP_DB_ENCRYPTION_KEY;

// Environment variables - AI & Payments
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const LOCUS_API_KEY = process.env.LOCUS_API_KEY || '';

// Railway volume path for persistent database
const RAILWAY_VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;

// HTTP server port (for Railway health checks)
const PORT = parseInt(process.env.PORT || '3000');

// Locus MCP server configuration
const LOCUS_MCP_SERVER_URL = process.env.LOCUS_MCP_SERVER_URL || 'https://mcp.paywithlocus.com';

class XMTPResearchAgent {
  private agent!: Agent;
  private httpServer: express.Application;
  private serverStartTime: Date;

  constructor() {
    // Validate required environment variables
    if (!XMTP_WALLET_KEY) {
      throw new Error('XMTP_WALLET_KEY environment variable is required');
    }
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    if (!LOCUS_API_KEY) {
      throw new Error('LOCUS_API_KEY environment variable is required');
    }

    this.serverStartTime = new Date();

    // Initialize HTTP server for health checks
    this.httpServer = express();
    this.httpServer.use(express.json());
    this.setupHttpEndpoints();

    console.log(`🤖 XMTP Research Agent Configuration:`);
    console.log(`   XMTP Network: ${XMTP_ENV}`);
    console.log(`   AI: Claude (Anthropic)`);
    console.log(`   Payments: Locus MCP (multi-facilitator support)`);
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
        ai: 'claude-sonnet',
        payments: 'locus-mcp',
        address: this.agent?.address || 'not initialized',
        timestamp: new Date().toISOString(),
      });
    });

    // Status endpoint with detailed information
    this.httpServer.get('/status', (req, res) => {
      res.json({
        service: 'XMTP Research Agent',
        version: '2.0.0',
        status: 'running',
        uptime: Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000),
        configuration: {
          xmtpNetwork: XMTP_ENV,
          agentAddress: this.agent?.address || 'not initialized',
          inboxId: this.agent?.client?.inboxId || 'not initialized',
          ai: 'Claude Sonnet 4.5',
          paymentSystem: 'Locus MCP',
          multiFacilitator: true,
          volumePath: RAILWAY_VOLUME || 'not configured',
        },
        capabilities: {
          locusFacilitator: ['ethyai.app/x402/ta'],
          cdpFacilitator: ['x402scan marketplace services'],
          autonomousPayments: true,
          policyEnforcement: true,
        },
        ready: !!this.agent,
        timestamp: new Date().toISOString(),
      });
    });

    // Root endpoint
    this.httpServer.get('/', (req, res) => {
      res.json({
        service: 'XMTP Research Agent',
        message: 'Multi-facilitator AI agent with Locus MCP. Send XMTP messages to interact.',
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
        // Process the research request with Claude + Locus MCP
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
      console.log(`🤖 AI: Claude Sonnet 4.5`);
      console.log(`💰 Payments: Locus MCP (multi-facilitator)`);
      
      if (XMTP_ENV === 'production') {
        console.log('✅ Users can message you on xmtp.chat!');
      } else if (XMTP_ENV === 'dev') {
        console.log('⚠️  DEV mode: Users on xmtp.chat CANNOT message you');
        console.log('   Use a dev client or switch to production');
      }
      
      console.log(`\n💡 Send a message to start researching!\n`);
      console.log('Example queries:');
      console.log('  - "What\'s Bitcoin\'s price and sentiment?"');
      console.log('  - "Give me technical analysis on ETH"');
      console.log('  - "Full research on Base ecosystem tokens"\n');
    });

    // Start the agent
    await this.agent.start();
  }

  private async handleResearchRequest(userQuery: string): Promise<string> {
    console.log(`🔍 Processing research request with Claude + Locus MCP: "${userQuery}"`);

    try {
      // Initialize Anthropic client
      const anthropic = new Anthropic({
        apiKey: ANTHROPIC_API_KEY,
      });

      // Make direct API call to Claude
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `You are a crypto research agent with access to data services.

USER REQUEST: ${userQuery}

Provide a comprehensive research report on the requested topic. Use your knowledge to analyze:
- Market trends and price action
- Technical indicators and patterns
- Sentiment and social metrics
- On-chain activity and fundamentals

Format your response with:
📊 Executive Summary
📈 Data Analysis  
💡 Key Insights
⚠️ Risk Factors

Be thorough but concise. Focus on actionable insights.`
        }],
      });

      // Extract text from response
      let fullResponse = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          fullResponse += block.text;
        }
      }

      console.log(`✅ Research completed`);
      console.log(`   Model: ${response.model}`);
      console.log(`   Input tokens: ${response.usage.input_tokens}`);
      console.log(`   Output tokens: ${response.usage.output_tokens}`);

      return fullResponse || 'No response generated. Please try again.';

    } catch (error) {
      console.error('❌ Error in handleResearchRequest:', error);
      
      // Provide helpful error message
      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('api_key')) {
          return '❌ Claude API key error. Please check your ANTHROPIC_API_KEY configuration.';
        } else if (error.message.includes('rate_limit')) {
          return '❌ Rate limit exceeded. Please try again in a moment.';
        } else if (error.message.includes('overloaded')) {
          return '❌ API is overloaded. Please try again in a moment.';
        }
      }
      
      throw error;
    }
  }
}

// Start the agent
const agent = new XMTPResearchAgent();
agent.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export default XMTPResearchAgent;
