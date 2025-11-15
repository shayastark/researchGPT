import { Agent } from '@xmtp/agent-sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { X402Client } from '../lib/x402-client';

dotenv.config();

// Environment variables
const XMTP_KEY = process.env.XMTP_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const USDC_ADDRESS = process.env.USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

// Service endpoints (x402-enabled)
const MARKET_DATA_SERVICE = process.env.MARKET_DATA_SERVICE || 'http://localhost:3001';
const SENTIMENT_SERVICE = process.env.SENTIMENT_SERVICE || 'http://localhost:3002';
const ONCHAIN_SERVICE = process.env.ONCHAIN_SERVICE || 'http://localhost:3003';

interface ResearchRequest {
  query: string;
  needsMarketData: boolean;
  needsSentiment: boolean;
  needsOnchain: boolean;
}

class XMTPResearchAgent {
  private agent: Agent;
  private openai: OpenAI;
  private x402Client: X402Client;

  constructor() {
    this.agent = new Agent({
      key: XMTP_KEY,
      // Additional XMTP configuration
    });

    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    this.x402Client = new X402Client({
      rpcUrl: BASE_RPC_URL,
      privateKey: PRIVATE_KEY,
      usdcAddress: USDC_ADDRESS,
    });
  }

  async start() {
    console.log('🤖 XMTP Research Agent starting...');

    // Listen for incoming messages
    this.agent.on('message', async (message: any) => {
      console.log(`📨 Received message from ${message.sender}: ${message.content}`);

      try {
        // Process the research request
        const response = await this.handleResearchRequest(message.content, message.sender);
        
        // Send response back via XMTP
        await this.agent.sendMessage(message.sender, response);
      } catch (error) {
        console.error('Error handling message:', error);
        await this.agent.sendMessage(
          message.sender,
          `❌ Error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    console.log('✅ Agent is now listening for messages');
  }

  private async handleResearchRequest(query: string, sender: string): Promise<string> {
    console.log(`🔍 Processing research request: ${query}`);

    // Step 1: Analyze the query with GPT-4 to determine what data is needed
    const researchPlan = await this.planResearch(query);
    console.log('📋 Research plan:', researchPlan);

    // Step 2: Fetch data from x402 services (paying with USDC)
    const data: any = {};

    if (researchPlan.needsMarketData) {
      console.log('💰 Fetching market data...');
      data.marketData = await this.x402Client.request(MARKET_DATA_SERVICE, '/api/market', {
        query: query,
      });
    }

    if (researchPlan.needsSentiment) {
      console.log('😊 Fetching sentiment analysis...');
      data.sentiment = await this.x402Client.request(SENTIMENT_SERVICE, '/api/sentiment', {
        query: query,
      });
    }

    if (researchPlan.needsOnchain) {
      console.log('⛓️  Fetching on-chain data...');
      data.onchain = await this.x402Client.request(ONCHAIN_SERVICE, '/api/onchain', {
        query: query,
      });
    }

    // Step 3: Synthesize results with GPT-4
    const report = await this.synthesizeReport(query, data);

    return report;
  }

  private async planResearch(query: string): Promise<ResearchRequest> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a research planner. Analyze the user's query and determine which data sources are needed:
- Market data: price, volume, trading data
- Sentiment: social media, news sentiment
- Onchain: blockchain transactions, smart contract data

Respond with JSON: {"needsMarketData": boolean, "needsSentiment": boolean, "needsOnchain": boolean}`,
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

  private async synthesizeReport(query: string, data: any): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a crypto research analyst. Synthesize the provided data into a clear, actionable report.',
        },
        {
          role: 'user',
          content: `Query: ${query}\n\nData collected:\n${JSON.stringify(data, null, 2)}\n\nProvide a comprehensive research report.`,
        },
      ],
    });

    return completion.choices[0].message.content || 'No report generated';
  }
}

// Start the agent
const agent = new XMTPResearchAgent();
agent.start().catch(console.error);

export default XMTPResearchAgent;
