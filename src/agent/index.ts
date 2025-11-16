import { Agent, filter, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import dotenv from 'dotenv';
import { X402Client } from '../lib/x402-client.js';

dotenv.config();

// Environment variables - XMTP
const XMTP_WALLET_KEY = process.env.XMTP_WALLET_KEY || '';
const XMTP_ENV = (process.env.XMTP_ENV || 'dev') as 'local' | 'dev' | 'production';
const XMTP_DB_ENCRYPTION_KEY = process.env.XMTP_DB_ENCRYPTION_KEY;

// Environment variables - AI & Payments
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const LOCUS_API_KEY = process.env.LOCUS_API_KEY || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.XMTP_WALLET_KEY || '';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USE_MAINNET = process.env.USE_MAINNET !== 'false'; // Defaults to true (mainnet)

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
  private x402Client?: X402Client;
  private useLocus: boolean;

  constructor() {
    // Validate required environment variables
    if (!XMTP_WALLET_KEY) {
      throw new Error('XMTP_WALLET_KEY environment variable is required');
    }
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    // Payment configuration: Locus or direct x402
    this.useLocus = !!LOCUS_API_KEY;
    
    if (!this.useLocus && !PRIVATE_KEY) {
      throw new Error('Either LOCUS_API_KEY or PRIVATE_KEY is required for payments');
    }
    
    // Initialize x402 client if not using Locus
    if (!this.useLocus) {
      this.x402Client = new X402Client({
        privateKey: PRIVATE_KEY as `0x${string}`,
        rpcUrl: BASE_RPC_URL,
        useMainnet: USE_MAINNET,
      });
    }

    this.serverStartTime = new Date();

    // Initialize HTTP server for health checks
    this.httpServer = express();
    this.httpServer.use(express.json());
    this.setupHttpEndpoints();

    console.log(`🤖 XMTP Research Agent Configuration:`);
    console.log(`   XMTP Network: ${XMTP_ENV}`);
    console.log(`   AI: Claude (Anthropic)`);
    console.log(`   Payments: ${this.useLocus ? 'Locus MCP' : 'Direct x402'}`);
    console.log(`   Blockchain: Base ${USE_MAINNET ? 'Mainnet' : 'Sepolia'}`);
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

You have access to these tools (all paid via x402):
- ai_research(query) - AI-powered research on any topic (Capminal)
- weather_data(location) - Weather forecasts and conditions (SAPA AI)
- llm_research(query) - LLM-powered topic research (Otto AI)
- job_search(query) - Job listings and opportunities (Otaku)
- crypto_gems(category) - Promising crypto tokens (Canza)
- technical_analysis(symbol) - Crypto technical analysis (EthyAI)

IMPORTANT INSTRUCTIONS:
1. Use the available tools to get REAL DATA from premium sources
2. Call multiple tools when relevant for comprehensive answers
3. Choose the RIGHT tool(s) for the user's question
4. If a tool returns an error, acknowledge it gracefully and try to help with available information
5. If multiple tools fail, explain the situation honestly and offer alternative help
6. Format responses clearly and professionally
7. Always provide value to the user, even when tools are unavailable

Provide helpful, accurate information based on REAL DATA from premium sources when available.`
        }],
      });

      console.log(`📞 Initial Claude response - Stop reason: ${response.stop_reason}`);

      // Handle tool use (iterative conversation)
      const conversationMessages: any[] = [{
        role: 'user',
        content: `You are a helpful research agent with access to premium data sources via x402 paid endpoints.

USER REQUEST: ${userQuery}

You have access to these tools (all paid via x402):
- ai_research(query) - AI-powered research on any topic (Capminal)
- weather_data(location) - Weather forecasts and conditions (SAPA AI)
- llm_research(query) - LLM-powered topic research (Otto AI)
- job_search(query) - Job listings and opportunities (Otaku)
- crypto_gems(category) - Promising crypto tokens (Canza)
- technical_analysis(symbol) - Crypto technical analysis (EthyAI)

IMPORTANT INSTRUCTIONS:
1. Use the available tools to get REAL DATA from premium sources
2. Call multiple tools when relevant for comprehensive answers
3. Choose the RIGHT tool(s) for the user's question
4. If a tool returns an error, acknowledge it gracefully and try to help with available information
5. If multiple tools fail, explain the situation honestly and offer alternative help
6. Format responses clearly and professionally
7. Always provide value to the user, even when tools are unavailable

Provide helpful, accurate information based on REAL DATA from premium sources when available.`
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
            
            try {
              // Call the actual x402 endpoint
              const toolResult = await this.callX402Endpoint(block.name, block.input);
              
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(toolResult)
              });

              console.log(`   ✅ ${block.name} completed`);
            } catch (toolError) {
              // If a tool fails, report the error to Claude so it can handle gracefully
              const errorMessage = toolError instanceof Error ? toolError.message : 'Unknown error';
              console.error(`   ❌ ${block.name} failed: ${errorMessage}`);
              
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify({
                  error: true,
                  message: errorMessage
                }),
                is_error: true
              });
            }
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
   * Call x402 endpoint with payment handling
   * Supports both Locus MCP and direct x402 payment
   */
  private async callX402Endpoint(toolName: string, params: any): Promise<any> {
    try {
      // Map tool names to x402 endpoints and their HTTP methods
      const endpointConfig: Record<string, { url: string; method: 'GET' | 'POST' }> = {
        'ai_research': { url: 'https://www.capminal.ai/api/x402/research', method: 'POST' },
        'weather_data': { url: 'https://sbx-x402.sapa-ai.com/weather', method: 'GET' },
        'llm_research': { url: 'https://x402.ottoai.services/llm-research', method: 'POST' },
        'job_search': { url: 'https://otaku.so/api/messaging/jobs', method: 'POST' },
        'crypto_gems': { url: 'https://api.canza.app/token/gems-list', method: 'GET' },
        'technical_analysis': { url: 'https://api.ethyai.app/x402/ta', method: 'GET' }
      };

      const config = endpointConfig[toolName];
      if (!config) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      console.log(`   💰 Making x402 payment call to: ${config.url}`);
      console.log(`   📊 Payment method: ${this.useLocus ? 'Locus MCP' : 'Direct on-chain'}`);

      if (this.useLocus) {
        // Use Locus MCP for payment orchestration
        return await this.callViaLocus(config.url, config.method, params);
      } else if (this.x402Client) {
        // Use direct x402 payment client
        return await this.callViaX402(config.url, config.method, params);
      } else {
        throw new Error('No payment method configured');
      }

    } catch (error) {
      console.error(`   ❌ Error calling x402 endpoint:`, error);
      throw error;
    }
  }

  /**
   * Call endpoint via Locus MCP server
   */
  private async callViaLocus(url: string, method: 'GET' | 'POST', params: any): Promise<any> {
    // Prepare parameters
    const queryParams: Record<string, string> = {};
    const bodyParams: any = {};
    
    if (params.symbol) {
      queryParams.ticker = params.symbol;
      bodyParams.symbol = params.symbol;
    }
    if (params.query) {
      queryParams.query = params.query;
      bodyParams.query = params.query;
    }
    if (params.location) {
      queryParams.location = params.location;
      bodyParams.location = params.location;
    }
    if (params.category) {
      queryParams.category = params.category;
      bodyParams.category = params.category;
    }

    try {
      // Call Locus MCP proxy endpoint
      const locusMcpResponse = await fetch(`${LOCUS_MCP_SERVER_URL}/x402/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOCUS_API_KEY}`,
        },
        body: JSON.stringify({
          endpoint: url,
          method: method,
          params: method === 'GET' ? queryParams : bodyParams,
        }),
      });

      if (!locusMcpResponse.ok) {
        const errorText = await locusMcpResponse.text().catch(() => 'Unknown error');
        console.error(`   ❌ Locus MCP error (${locusMcpResponse.status}): ${errorText}`);
        throw new Error(`Locus MCP returned ${locusMcpResponse.status}: ${errorText}`);
      }

      const data = await locusMcpResponse.json();
      console.log(`   ✅ Data received via Locus MCP`);
      return data;
      
    } catch (error) {
      // If Locus MCP fails, fall back to direct x402 client
      console.warn(`   ⚠️  Locus MCP failed, falling back to direct x402...`);
      
      if (this.x402Client) {
        return await this.callViaX402(url, method, params);
      }
      
      throw error;
    }
  }

  /**
   * Call endpoint via direct x402 payment protocol
   */
  private async callViaX402(url: string, method: 'GET' | 'POST', params: any): Promise<any> {
    if (!this.x402Client) {
      throw new Error('x402 client not initialized');
    }

    const queryParams: Record<string, string> = {};
    const bodyParams: any = {};
    
    if (params.symbol) {
      queryParams.ticker = params.symbol;
      bodyParams.symbol = params.symbol;
    }
    if (params.query) {
      queryParams.query = params.query;
      bodyParams.query = params.query;
    }
    if (params.location) {
      queryParams.location = params.location;
      bodyParams.location = params.location;
    }
    if (params.category) {
      queryParams.category = params.category;
      bodyParams.category = params.category;
    }

    return await this.x402Client.callEndpoint(url, {
      method,
      body: method === 'POST' ? bodyParams : undefined,
      queryParams: method === 'GET' ? queryParams : undefined,
    });
  }

}

// Start the agent
const agent = new XMTPResearchAgent();
agent.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export default XMTPResearchAgent;
