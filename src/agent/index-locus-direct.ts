import { Agent, filter, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import OpenAI from 'openai';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Environment variables - XMTP
const XMTP_WALLET_KEY = process.env.XMTP_WALLET_KEY || '';
const XMTP_ENV = (process.env.XMTP_ENV || 'dev') as 'local' | 'dev' | 'production';
const XMTP_DB_ENCRYPTION_KEY = process.env.XMTP_DB_ENCRYPTION_KEY;

// Environment variables - AI & Payments
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const LOCUS_API_KEY = process.env.LOCUS_API_KEY || '';

// Railway volume path for persistent database
const RAILWAY_VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;

// HTTP server port (for Railway health checks)
const PORT = parseInt(process.env.PORT || '3000');

// Locus API configuration
const LOCUS_API_BASE = process.env.LOCUS_API_BASE || 'https://mcp.paywithlocus.com';

// Map of tool names to x402 endpoints (from Locus dashboard)
const X402_ENDPOINTS = {
  technical_analysis: {
    url: 'http://api.ethyai.app/x402/ta',
    description: 'Technical analysis for cryptocurrency trading',
  },
  ai_research: {
    url: 'https://www.capminal.ai/api/x402/research',
    description: 'Comprehensive AI and tech research using premium data sources',
  },
  weather_forecast: {
    url: 'http://sbx-x402.sapa-ai.com/weather',
    description: 'Get detailed weather forecasts for any location',
  },
  llm_research: {
    url: 'https://x402.ottoai.services/llm-research',
    description: 'Advanced LLM-powered research and analysis',
  },
  job_search: {
    url: 'https://otaku.so/api/messaging/jobs',
    description: 'Search for job listings and career opportunities',
  },
  crypto_gems: {
    url: 'https://api.canza.app/token/gems-list',
    description: 'Discover promising cryptocurrency tokens and gems',
  },
};

class LocusDirectAgent {
  private agent!: Agent;
  private httpServer: express.Application;
  private serverStartTime: Date;
  private openai: OpenAI;

  constructor() {
    // Validate required environment variables
    if (!XMTP_WALLET_KEY) {
      throw new Error('XMTP_WALLET_KEY environment variable is required');
    }
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    if (!LOCUS_API_KEY) {
      throw new Error('LOCUS_API_KEY environment variable is required for x402 payments via Locus');
    }

    this.serverStartTime = new Date();
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Initialize HTTP server for health checks
    this.httpServer = express();
    this.httpServer.use(express.json());
    this.setupHttpEndpoints();

    console.log(`\n🤖 Locus x402 Agent Configuration:`);
    console.log(`   XMTP Network: ${XMTP_ENV}`);
    console.log(`   AI: OpenAI GPT-4o`);
    console.log(`   Payments: Locus (Direct HTTP API)`);
    console.log(`   Locus API: ${LOCUS_API_BASE}`);
    console.log(`   Locus API Key: ${LOCUS_API_KEY.substring(0, 20)}...`);
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
        service: 'locus-x402-agent',
        uptime: Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000),
        xmtpNetwork: XMTP_ENV,
        ai: 'gpt-4o',
        payments: 'locus-direct-api',
        locusConfigured: !!LOCUS_API_KEY,
        address: this.agent?.address || 'not initialized',
        timestamp: new Date().toISOString(),
      });
    });

    // Status endpoint with detailed information
    this.httpServer.get('/status', (req, res) => {
      res.json({
        service: 'Locus x402 Agent',
        version: '5.0.0-locus-direct',
        status: 'running',
        uptime: Math.floor((Date.now() - this.serverStartTime.getTime()) / 1000),
        configuration: {
          xmtpNetwork: XMTP_ENV,
          agentAddress: this.agent?.address || 'not initialized',
          inboxId: this.agent?.client?.inboxId || 'not initialized',
          ai: 'OpenAI GPT-4o',
          paymentSystem: 'Locus Direct API',
          locusApiBase: LOCUS_API_BASE,
          locusConfigured: !!LOCUS_API_KEY,
          volumePath: RAILWAY_VOLUME || 'not configured',
        },
        capabilities: {
          x402Payments: true,
          locusOrchestration: true,
          availableTools: Object.keys(X402_ENDPOINTS),
        },
        ready: !!this.agent && !!LOCUS_API_KEY,
        timestamp: new Date().toISOString(),
      });
    });

    // Root endpoint
    this.httpServer.get('/', (req, res) => {
      res.json({
        service: 'Locus x402 Agent',
        message: 'AI research agent with x402 payments via Locus. Payments orchestrated by Locus backend.',
        agentAddress: this.agent?.address || 'initializing...',
        xmtpNetwork: XMTP_ENV,
        paymentProvider: 'Locus',
        locusConfigured: !!LOCUS_API_KEY,
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

    console.log('\n🤖 Locus x402 Agent starting...');

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
        // Process the research request with Locus x402 payments
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
      console.log('✅ LOCUS X402 AGENT IS NOW ONLINE!');
      console.log('═'.repeat(80));
      console.log(`\n📬 Agent Address: ${this.agent.address}`);
      console.log(`📊 InboxId: ${this.agent.client.inboxId}`);
      console.log(`🌐 Environment: ${XMTP_ENV}`);
      console.log(`🤖 AI: OpenAI GPT-4o`);
      console.log(`💰 Payments: Locus (Direct API)`);
      console.log(`🔑 Locus API Key: ${LOCUS_API_KEY.substring(0, 20)}...`);
      
      if (XMTP_ENV === 'production') {
        console.log('\n✅ Users can message you on xmtp.chat!');
      } else if (XMTP_ENV === 'dev') {
        console.log('\n⚠️  DEV mode: Users on xmtp.chat CANNOT message you');
        console.log('   Use a dev client or switch to production');
      }
      
      console.log(`\n💡 This agent demonstrates x402 payments via Locus!\n`);
      console.log('🎯 Approved x402 Endpoints:');
      Object.entries(X402_ENDPOINTS).forEach(([name, config]) => {
        console.log(`   - ${name}: ${config.description}`);
        console.log(`     ${config.url}`);
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
    console.log(`\n🔍 Processing with Locus x402 Payment Orchestration`);
    console.log(`   Query: "${userQuery}"`);

    // Define tools for OpenAI
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = Object.entries(X402_ENDPOINTS).map(([name, config]) => ({
      type: 'function',
      function: {
        name,
        description: `${config.description} (x402 payment via Locus)`,
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The research query, location, or search term',
            },
          },
          required: ['query'],
        },
      },
    }));

    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
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
            
            // Execute via Locus
            const result = await this.callX402ViaLocus(
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

  private async callX402ViaLocus(
    toolName: string,
    input: { query: string }
  ): Promise<any> {
    const endpoint = X402_ENDPOINTS[toolName as keyof typeof X402_ENDPOINTS];
    
    if (!endpoint) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    console.log(`\n   💰 Calling x402 endpoint via Locus:`);
    console.log(`      Endpoint: ${endpoint.url}`);
    console.log(`      Query: ${input.query}`);
    console.log(`      Method: POST (with Locus orchestration)`);

    try {
      // Call Locus MCP API to orchestrate x402 payment and request
      // Locus will handle: 402 detection, payment, retry with proof
      const locusResponse = await fetch(`${LOCUS_API_BASE}/x402/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOCUS_API_KEY}`,
        },
        body: JSON.stringify({
          endpoint: endpoint.url,
          method: 'POST',
          body: {
            query: input.query,
          },
        }),
      });

      console.log(`      📡 Locus API response: ${locusResponse.status} ${locusResponse.statusText}`);

      if (!locusResponse.ok) {
        const errorText = await locusResponse.text();
        console.error(`      ❌ Locus API error: ${errorText}`);
        throw new Error(`Locus API error (${locusResponse.status}): ${errorText}`);
      }

      const data: any = await locusResponse.json();
      console.log(`      ✅ Data received via Locus orchestration`);
      
      // Log payment details if included in response
      if (data.payment_info) {
        console.log(`      💳 Payment details:`);
        console.log(`         Amount: ${data.payment_info.amount}`);
        console.log(`         Tx: ${data.payment_info.transaction_hash || 'N/A'}`);
      }
      
      return data;
    } catch (error) {
      console.error(`      ❌ Error calling Locus API:`, error);
      throw error;
    }
  }
}

// Start the agent
const agent = new LocusDirectAgent();
agent.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export default LocusDirectAgent;
