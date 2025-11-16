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
    console.log(`   Payments: Locus x402 (6 premium data sources)`);
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
          paymentSystem: 'Locus x402',
          approvedEndpoints: 6,
          volumePath: RAILWAY_VOLUME || 'not configured',
        },
        capabilities: {
          aiResearch: 'Capminal AI',
          weather: 'SAPA AI',
          llmResearch: 'Otto AI',
          jobSearch: 'Otaku',
          cryptoGems: 'Canza',
          technicalAnalysis: 'EthyAI',
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
        message: 'AI research agent with access to 6 premium data sources via Locus x402. Send XMTP messages to interact.',
        agentAddress: this.agent?.address || 'initializing...',
        xmtpNetwork: XMTP_ENV,
        dataSources: ['Capminal AI', 'SAPA Weather', 'Otto AI', 'Otaku Jobs', 'Canza Gems', 'EthyAI TA'],
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
      console.log(`💰 Payments: Locus x402 (6 approved sources)`);
      
      if (XMTP_ENV === 'production') {
        console.log('✅ Users can message you on xmtp.chat!');
      } else if (XMTP_ENV === 'dev') {
        console.log('⚠️  DEV mode: Users on xmtp.chat CANNOT message you');
        console.log('   Use a dev client or switch to production');
      }
      
      console.log(`\n💡 Send a message to access premium data sources!\n`);
      console.log('Example queries:');
      console.log('  - "What\'s the weather in San Francisco?"');
      console.log('  - "Research the latest AI trends"');
      console.log('  - "Find me software engineering jobs"');
      console.log('  - "What are some promising crypto gems?"');
      console.log('  - "Technical analysis for Bitcoin"\n');
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

      // Define tools (x402 endpoints) for Claude to use
      // All endpoints are approved in Locus and will be paid via x402
      const tools = [
        {
          name: 'ai_research',
          description: 'Get AI-powered research and analysis on any topic using Capminal AI. Use for general research questions, market analysis, or in-depth topic exploration.',
          input_schema: {
            type: 'object' as const,
            properties: {
              query: {
                type: 'string' as const,
                description: 'The research query or topic to investigate'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'weather_data',
          description: 'Get current weather conditions and forecasts for any location using SAPA AI weather service.',
          input_schema: {
            type: 'object' as const,
            properties: {
              location: {
                type: 'string' as const,
                description: 'City name, zip code, or location (e.g., "New York", "London", "90210")'
              }
            },
            required: ['location']
          }
        },
        {
          name: 'llm_research',
          description: 'Get LLM-powered research from Otto AI on any topic. Good for detailed analysis, summaries, and comprehensive research.',
          input_schema: {
            type: 'object' as const,
            properties: {
              query: {
                type: 'string' as const,
                description: 'The research topic or question'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'job_search',
          description: 'Search for job listings and opportunities via Otaku messaging platform.',
          input_schema: {
            type: 'object' as const,
            properties: {
              query: {
                type: 'string' as const,
                description: 'Job title, keywords, or category (e.g., "software engineer", "remote developer")'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'crypto_gems',
          description: 'Get list of promising crypto tokens and gems from Canza. Use when users ask about new crypto opportunities or emerging tokens.',
          input_schema: {
            type: 'object' as const,
            properties: {
              category: {
                type: 'string' as const,
                description: 'Optional filter category (e.g., "defi", "gaming", "ai"). Leave as "all" for full list.'
              }
            },
            required: ['category']
          }
        },
        {
          name: 'technical_analysis',
          description: 'Get technical analysis for cryptocurrencies from EthyAI. Provides indicators, support/resistance levels, and trading signals.',
          input_schema: {
            type: 'object' as const,
            properties: {
              symbol: {
                type: 'string' as const,
                description: 'The cryptocurrency symbol (e.g., BTC, ETH, SOL)'
              }
            },
            required: ['symbol']
          }
        }
      ];

      // Initial API call to Claude with tools
      let response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        tools: tools,
        messages: [{
          role: 'user',
          content: `You are a helpful research agent with access to premium data sources via x402 paid endpoints.

USER REQUEST: ${userQuery}

You have access to these tools (all paid via Locus x402):
- ai_research(query) - AI-powered research on any topic (Capminal)
- weather_data(location) - Weather forecasts and conditions (SAPA AI)
- llm_research(query) - LLM-powered topic research (Otto AI)
- job_search(query) - Job listings and opportunities (Otaku)
- crypto_gems(category) - Promising crypto tokens (Canza)
- technical_analysis(symbol) - Crypto technical analysis (EthyAI)

IMPORTANT: 
1. Use the available tools to get REAL DATA from premium sources
2. Call multiple tools when relevant for comprehensive answers
3. Choose the RIGHT tool(s) for the user's question
4. Base your response on ACTUAL DATA from the tools
5. Format responses clearly and professionally

Provide helpful, accurate information based on REAL DATA from premium sources.`
        }],
      });

      console.log(`📞 Initial Claude response - Stop reason: ${response.stop_reason}`);

      // Handle tool use (iterative conversation)
      const conversationMessages: any[] = [{
        role: 'user',
        content: `You are a helpful research agent with access to premium data sources via x402 paid endpoints.

USER REQUEST: ${userQuery}

You have access to these tools (all paid via Locus x402):
- ai_research(query) - AI-powered research on any topic (Capminal)
- weather_data(location) - Weather forecasts and conditions (SAPA AI)
- llm_research(query) - LLM-powered topic research (Otto AI)
- job_search(query) - Job listings and opportunities (Otaku)
- crypto_gems(category) - Promising crypto tokens (Canza)
- technical_analysis(symbol) - Crypto technical analysis (EthyAI)

IMPORTANT: 
1. Use the available tools to get REAL DATA from premium sources
2. Call multiple tools when relevant for comprehensive answers
3. Choose the RIGHT tool(s) for the user's question
4. Base your response on ACTUAL DATA from the tools
5. Format responses clearly and professionally

Provide helpful, accurate information based on REAL DATA from premium sources.`
      }];

      let iterationCount = 0;
      const maxIterations = 10; // Prevent infinite loops

      while (response.stop_reason === 'tool_use' && iterationCount < maxIterations) {
        iterationCount++;
        console.log(`\n🔧 Tool use iteration ${iterationCount}:`);

        // Add assistant's response to conversation
        conversationMessages.push({
          role: 'assistant',
          content: response.content
        });

        // Process tool calls
        const toolResults: any[] = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            console.log(`   Calling: ${block.name}(${JSON.stringify(block.input)})`);
            
            // Call the actual x402 endpoint via Locus
            const toolResult = await this.callX402Endpoint(block.name, block.input);
            
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(toolResult)
            });

            console.log(`   ✅ ${block.name} completed (payment processed via Locus)`);
          }
        }

        // Add tool results to conversation
        conversationMessages.push({
          role: 'user',
          content: toolResults
        });

        // Continue conversation with tool results
        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          tools: tools,
          messages: conversationMessages,
        });

        console.log(`   Stop reason: ${response.stop_reason}`);
      }

      // Extract final text response
      let fullResponse = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          fullResponse += block.text;
        }
      }

      console.log(`\n✅ Research completed`);
      console.log(`   Model: ${response.model}`);
      console.log(`   Tool calls: ${iterationCount} iterations`);
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
        } else if (error.message.includes('Locus') || error.message.includes('x402')) {
          return `❌ Payment service error: ${error.message}. Check your Locus configuration and wallet balance.`;
        }
      }
      
      throw error;
    }
  }

  /**
   * Call x402 endpoint via Locus MCP
   * This is where payments are actually made
   */
  private async callX402Endpoint(toolName: string, params: any): Promise<any> {
    try {
      // Map tool names to APPROVED x402 endpoints in Locus
      const endpointMap: Record<string, string> = {
        'ai_research': 'https://www.capminal.ai/api/x402/research',
        'weather_data': 'http://sbx-x402.sapa-ai.com/weather',
        'llm_research': 'https://x402.ottoai.services/llm-research',
        'job_search': 'https://otaku.so/api/messaging/jobs',
        'crypto_gems': 'https://api.canza.app/token/gems-list',
        'technical_analysis': 'http://api.ethyai.app/x402/ta'
      };

      const endpoint = endpointMap[toolName];
      if (!endpoint) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      console.log(`   💰 Making x402 payment call to: ${endpoint}`);

      // Prepare request body based on parameter names
      const requestBody: any = {};
      if (params.symbol) requestBody.symbol = params.symbol;
      if (params.query) requestBody.query = params.query;
      if (params.location) requestBody.location = params.location;
      if (params.category) requestBody.category = params.category;

      // Call the endpoint via Locus MCP
      // Locus will handle authentication and payment
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOCUS_API_KEY}`,
          // Locus MCP headers for payment handling
          'X-Locus-Policy-Group': 'default',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`   ❌ x402 endpoint error (${response.status}): ${errorText}`);
        throw new Error(`Endpoint ${toolName} returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`   ✅ Data received from ${toolName}`);
      
      return data;

    } catch (error) {
      console.error(`   ❌ Error calling x402 endpoint:`, error);
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
