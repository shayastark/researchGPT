/**
 * REST API Server for Frontend
 * Handles research data processing from frontend
 */

import express, { Router } from 'express';
import OpenAI from 'openai';
import { X402OfficialClient } from '../lib/x402-official-client.js';

// Create router instead of app (will be mounted on main Express app)
const router = Router();
// Note: CORS and JSON parsing are handled by the main Express app

// OpenAI client - lazy initialization
let openai: any = null;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }
  return openai;
}

// Store agent instance reference (set by agent)
let agentInstance: any = null;

function setAgentInstance(agent: any) {
  agentInstance = agent;
}

/**
 * Proxy x402 research request (handles CORS issue)
 * Backend makes the x402 call using agent's wallet
 */
router.post('/x402-research', async (req, res) => {
  try {
    const { query, walletAddress } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Get payment config from environment
    const PAYMENT_PRIVATE_KEY = process.env.PAYMENT_PRIVATE_KEY || process.env.PRIVATE_KEY || '';
    const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const USE_MAINNET = process.env.USE_MAINNET === 'true';

    if (!PAYMENT_PRIVATE_KEY) {
      return res.status(500).json({ 
        error: 'Payment wallet not configured',
        message: 'PAYMENT_PRIVATE_KEY is required for x402 payments'
      });
    }

    console.log(`\n🔍 Proxying x402 research request for ${walletAddress}`);
    console.log(`   Query: "${query}"`);
    console.log(`   Using agent's wallet for payment (CORS workaround)`);

    // Create x402 client using agent's wallet
    const x402Client = new X402OfficialClient({
      privateKey: PAYMENT_PRIVATE_KEY as `0x${string}`,
      rpcUrl: BASE_RPC_URL,
      useMainnet: USE_MAINNET,
    });

    // Make x402 call (backend handles payment)
    const researchData = await x402Client.callEndpoint(
      'https://www.capminal.ai/api/x402/research',
      {
        method: 'POST',
        body: { query },
      }
    );

    console.log(`✅ x402 research completed`);
    console.log(`   Data received:`, typeof researchData === 'object' ? 'Object' : 'String');

    // Return research data to frontend
    res.json({
      success: true,
      researchData,
      query,
      note: 'Payment made using agent wallet due to CORS limitations',
    });
  } catch (error: any) {
    console.error('❌ Error proxying x402 research:', error);
    res.status(500).json({
      error: 'Failed to fetch research data',
      message: error.message,
    });
  }
});

/**
 * Process research data from frontend
 * Frontend has already paid for x402 API, this just processes the results
 */
router.post('/process-research', async (req, res) => {
  try {
    const { query, researchData, walletAddress } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!researchData) {
      return res.status(400).json({ error: 'Research data is required' });
    }

    console.log(`\n📊 Processing research request from ${walletAddress}`);
    console.log(`   Query: "${query}"`);
    console.log(`   Research data received:`, typeof researchData === 'object' ? 'Object' : 'String');

    // Use OpenAI to synthesize the research data into a comprehensive report
    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a research assistant that synthesizes research data into comprehensive, well-structured reports. 
          Format your responses clearly with sections, bullet points, and actionable insights.
          Be thorough but concise.`,
        },
        {
          role: 'user',
          content: `Based on the following research data, create a comprehensive report addressing this query: "${query}"

Research Data:
${typeof researchData === 'object' ? JSON.stringify(researchData, null, 2) : researchData}

Please provide a well-structured report with:
1. Executive Summary
2. Key Findings
3. Detailed Analysis
4. Conclusions and Recommendations`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const synthesizedReport = completion.choices[0]?.message?.content || 'No response generated';

    console.log(`✅ Research processed successfully`);
    console.log(`   Response length: ${synthesizedReport.length} characters`);

    res.json({
      success: true,
      result: synthesizedReport,
      query,
      processedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error processing research:', error);
    res.status(500).json({
      error: 'Failed to process research',
      message: error.message,
    });
  }
});

/**
 * Send result via XMTP (optional feature)
 */
router.post('/send-xmtp', async (req, res) => {
  try {
    const { message, recipientAddress } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!recipientAddress) {
      return res.status(400).json({ error: 'Recipient address is required' });
    }

    if (!agentInstance) {
      return res.status(503).json({ error: 'XMTP agent not initialized' });
    }

    // TODO: Implement method to send XMTP message from agent
    // For now, just return success
    console.log(`📨 Would send XMTP message to ${recipientAddress}`);

    res.json({
      success: true,
      message: 'XMTP message sent (not yet implemented)',
    });
  } catch (error: any) {
    console.error('❌ Error sending XMTP message:', error);
    res.status(500).json({
      error: 'Failed to send XMTP message',
      message: error.message,
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/api-health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    agentInitialized: agentInstance !== null,
  });
});

export { router as default, setAgentInstance };

