import { Agent, filter, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
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
const LOCUS_MCP_SERVER_URL = process.env.LOCUS_MCP_SERVER_URL || 'https://mcp.paywithlocus.com/mcp';

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
      throw new Error('LOCUS_API_KEY environment variable is required for Locus MCP integration');
    }

    this.serverStartTime = new Date();

    // Initialize HTTP server for health checks
    this.httpServer = express();
    this.httpServer.use(express.json());
    this.setupHttpEndpoints();

    console.log(`🤖 XMTP Research Agent Configuration:`);
    console.log(`   XMTP Network: ${XMTP_ENV}`);
    console.log(`   AI: Claude Agent SDK (with MCP)`);
    console.log(`   Payments: Locus MCP`);
    console.log(`   MCP Server: ${LOCUS_MCP_SERVER_URL}`);
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
        ai: 'claude-agent-sdk',
        payments: 'locus-mcp',
        mcpServer: LOCUS_MCP_SERVER_URL,
        address: this.agent?.address || 'not initialized',
        timestamp: new Date().toISOString(),
      });
    });

    // Status endpoint with detailed information
    this.httpServer.get('/status', (req, res) => {
      res.json({
        service: 'XMTP Research Agent',
        version: '3.0.0',
        status: 'running',
        uptime: Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000),
        configuration: {
          xmtpNetwork: XMTP_ENV,
          agentAddress: this.agent?.address || 'not initialized',
          inboxId: this.agent?.client?.inboxId || 'not initialized',
          ai: 'Claude Agent SDK',
          paymentSystem: 'Locus MCP',
          mcpServer: LOCUS_MCP_SERVER_URL,
          volumePath: RAILWAY_VOLUME || 'not configured',
        },
        capabilities: {
          mcpToolDiscovery: true,
          autonomousPayments: true,
          policyEnforcement: true,
          x402Protocol: true,
        },
        ready: !!this.agent,
        timestamp: new Date().toISOString(),
      });
    });

    // Root endpoint
    this.httpServer.get('/', (req, res) => {
      res.json({
        service: 'XMTP Research Agent',
        message: 'AI research agent with Claude Agent SDK + Locus MCP. X402 payments handled automatically.',
        agentAddress: this.agent?.address || 'initializing...',
        xmtpNetwork: XMTP_ENV,
        integration: 'Claude Agent SDK with Locus MCP',
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
        // Process the research request with Claude Agent SDK + Locus MCP
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
      console.log(`🤖 AI: Claude Agent SDK`);
      console.log(`💰 Payments: Locus MCP (x402 protocol)`);
      console.log(`🔌 MCP Server: ${LOCUS_MCP_SERVER_URL}`);
      
      if (XMTP_ENV === 'production') {
        console.log('✅ Users can message you on xmtp.chat!');
      } else if (XMTP_ENV === 'dev') {
        console.log('⚠️  DEV mode: Users on xmtp.chat CANNOT message you');
        console.log('   Use a dev client or switch to production');
      }
      
      console.log(`\n💡 Send a message to access premium data via Locus MCP!\n`);
      console.log('Example queries:');
      console.log('  - "What\'s the weather in San Francisco?"');
      console.log('  - "Research the latest AI trends"');
      console.log('  - "What are some promising crypto gems?"');
      console.log('  - "Technical analysis for Bitcoin"\n');
    });

    // Start the agent
    await this.agent.start();
  }

  private async handleResearchRequest(userQuery: string): Promise<string> {
    console.log(`🔍 Processing research request with Claude Agent SDK + Locus MCP`);
    console.log(`   Query: "${userQuery}"`);

    // Try Claude Agent SDK with MCP first, fall back to direct API if subprocess fails
    try {
      return await this.handleWithAgentSDK(userQuery);
    } catch (error) {
      console.error('❌ Claude Agent SDK failed, falling back to direct API');
      console.error('   Error:', error instanceof Error ? error.message : error);
      return await this.handleWithDirectAPI(userQuery);
    }
  }

  private async handleWithAgentSDK(userQuery: string): Promise<string> {
    // Ensure we have a writable directory for the subprocess
    const workingDir = RAILWAY_VOLUME || process.cwd();
    
    console.log(`   Attempting Claude Agent SDK with MCP...`);
    console.log(`   Working directory: ${workingDir}`);
    
    // Use Claude Agent SDK with Locus MCP server
    const result = query({
      prompt: userQuery,
      options: {
        // Configure Locus as MCP server
        mcpServers: {
          'locus': {
            type: 'http',
            url: LOCUS_MCP_SERVER_URL,
            headers: {
              'Authorization': `Bearer ${LOCUS_API_KEY}`,
            },
          },
        },
        // Permission settings - bypass for autonomous operation
        permissionMode: 'bypassPermissions',
        // Use writable directory (Railway volume if available)
        cwd: workingDir,
        // Don't include partial messages (we just want final results)
        includePartialMessages: false,
      },
    });

    let finalResponse = '';
    let toolCalls = 0;

    // Stream messages from Claude
    for await (const message of result) {
      this.logMessage(message);

      if (message.type === 'assistant') {
        // Extract text from assistant message
        for (const block of message.message.content) {
          if (block.type === 'text') {
            finalResponse += block.text;
          } else if (block.type === 'tool_use') {
            toolCalls++;
            console.log(`   🔧 Tool call: ${block.name}`);
          }
        }
      } else if (message.type === 'result') {
        // Final result message
        if (message.subtype === 'success') {
          console.log(`\n✅ Research completed with Agent SDK`);
          console.log(`   Tool calls: ${toolCalls}`);
          console.log(`   Turns: ${message.num_turns}`);
          console.log(`   Cost: $${message.total_cost_usd.toFixed(4)}`);
          
          // Use the result if final response is empty
          if (!finalResponse && message.result) {
            finalResponse = message.result;
          }
        } else {
          console.error(`   ❌ Research failed: ${message.subtype}`);
        }
      }
    }

    if (!finalResponse) {
      throw new Error('No response generated from Agent SDK');
    }

    return finalResponse;
  }

  private async handleWithDirectAPI(userQuery: string): Promise<string> {
    console.log(`\n🔄 Using direct Anthropic API (fallback mode)`);
    
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are an intelligent research assistant. Provide comprehensive, accurate, and helpful responses to user queries. 

Note: You are currently in fallback mode without access to real-time data sources. Use your knowledge base to provide the best answer possible. When appropriate, acknowledge any limitations.`,
      messages: [
        {
          role: 'user',
          content: userQuery,
        },
      ],
    });

    let finalResponse = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        finalResponse += block.text;
      }
    }

    console.log(`✅ Response generated with direct API`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Input tokens: ${response.usage.input_tokens}`);
    console.log(`   Output tokens: ${response.usage.output_tokens}`);

    return finalResponse || 'I processed your request but could not generate a response. Please try again.';
  }


  /**
   * Log SDK messages for debugging
   */
  private logMessage(message: SDKMessage) {
    if (message.type === 'system' && message.subtype === 'init') {
      console.log(`\n🎯 Claude Agent SDK initialized`);
      console.log(`   Model: ${message.model}`);
      console.log(`   Permission mode: ${message.permissionMode}`);
      console.log(`   Available tools: ${message.tools.join(', ')}`);
      
      // Check MCP server connection status (per Claude SDK docs)
      const connectedServers = message.mcp_servers.filter(s => s.status === 'connected');
      const failedServers = message.mcp_servers.filter(s => s.status !== 'connected');
      
      if (connectedServers.length > 0) {
        console.log(`   ✅ MCP servers connected: ${connectedServers.map(s => s.name).join(', ')}`);
      }
      if (failedServers.length > 0) {
        console.warn(`   ⚠️  MCP servers failed: ${failedServers.map(s => `${s.name} (${s.status})`).join(', ')}`);
      }
      
      // Log available MCP tools
      const mcpTools = message.tools.filter(t => t.startsWith('mcp__'));
      if (mcpTools.length > 0) {
        console.log(`   🔧 MCP tools available: ${mcpTools.length}`);
      }
    } else if (message.type === 'user') {
      console.log(`   📤 User message sent`);
    } else if (message.type === 'assistant') {
      const toolUses = message.message.content.filter(b => b.type === 'tool_use');
      if (toolUses.length > 0) {
        const toolNames = toolUses.map((b: any) => b.name).join(', ');
        console.log(`   🔧 Claude using tool(s): ${toolNames}`);
      }
      const textBlocks = message.message.content.filter(b => b.type === 'text');
      if (textBlocks.length > 0) {
        console.log(`   💭 Claude is thinking/responding...`);
      }
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
