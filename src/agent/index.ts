import { Agent, filter, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import { query } from '@anthropic-ai/claude-agent-sdk';
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
          ai: 'Claude 3.5 Sonnet',
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
      console.log(`🤖 AI: Claude 3.5 Sonnet`);
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

  private async handleResearchRequest(query: string): Promise<string> {
    console.log(`🔍 Processing research request with Claude + Locus MCP: "${query}"`);

    try {
      // Use Claude Agent SDK with Locus MCP
      // Claude will autonomously decide which x402 tools to use
      const response = query({
        prompt: `You are a crypto research agent with access to multiple x402 data services across different facilitators.

AVAILABLE SERVICES:
- ta(symbol: string) - Technical analysis for Base network tokens (Locus facilitator)
- Additional x402 services from CDP facilitator marketplace (price data, sentiment, on-chain metrics)

USER REQUEST: ${query}

Analyze the request and use the appropriate x402 services to gather comprehensive data. Then synthesize your findings into a clear, actionable research report.

Format your response with:
📊 Executive Summary
📈 Data Analysis  
💡 Key Insights
💰 Research Cost (mention USDC spent on data services)

Be thorough but concise.`,
        options: {
          model: 'claude-3-5-sonnet-20241022',
          mcpServers: {
            locus: {
              type: 'sse',
              url: LOCUS_MCP_SERVER_URL,
              headers: {
                'Authorization': `Bearer ${LOCUS_API_KEY}`,
                'X-API-Key': LOCUS_API_KEY,
              },
            },
          },
          permissionMode: 'bypassPermissions', // For autonomous operation
          maxTurns: 10,
        },
      });

      // Collect the full response
      let fullResponse = '';
      let toolsUsed: string[] = [];
      let totalCost = 0;

      for await (const event of response) {
        if (event.type === 'assistant') {
          // Collect assistant messages
          const content = event.message.content;
          for (const block of content) {
            if (block.type === 'text') {
              fullResponse += block.text;
            } else if (block.type === 'tool_use') {
              console.log(`🔧 Claude using tool: ${block.name}`);
              toolsUsed.push(block.name);
            }
          }
        } else if (event.type === 'result') {
          console.log(`\n✅ Research completed in ${event.duration_ms}ms`);
          console.log(`   Turns: ${event.num_turns}`);
          console.log(`   Cost: $${event.total_cost_usd.toFixed(4)} USD`);
          console.log(`   Tools used: ${toolsUsed.join(', ') || 'none'}`);
          
          totalCost = event.total_cost_usd;
          
          if (event.subtype === 'success') {
            fullResponse = event.result || fullResponse;
          } else if (event.subtype === 'error_max_turns') {
            fullResponse += '\n\n⚠️ Research reached maximum turns. Results may be incomplete.';
          }
        }
      }

      return fullResponse || 'No response generated. Please try again.';

    } catch (error) {
      console.error('❌ Error in handleResearchRequest:', error);
      
      // Provide helpful error message
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return '❌ Locus API key error. Please check your LOCUS_API_KEY configuration.';
        } else if (error.message.includes('MCP')) {
          return '❌ Error connecting to Locus MCP server. Please check your configuration.';
        } else if (error.message.includes('Anthropic')) {
          return '❌ Claude API error. Please check your ANTHROPIC_API_KEY.';
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
