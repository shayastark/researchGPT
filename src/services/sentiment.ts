import express, { Request, Response } from 'express';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.SENTIMENT_PORT || 3002;
const PAYMENT_AMOUNT = '0.15'; // 15 cents in USDC
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || '';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

// Initialize Base client for payment verification
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

// In-memory payment tracking (use Redis in production)
const processedPayments = new Set<string>();
const pendingNonces = new Map<string, number>();

/**
 * Sentiment Analysis Service (x402-enabled)
 * Provides social media and news sentiment analysis
 */

app.post('/api/sentiment', async (req: Request, res: Response) => {
  const { query } = req.body;
  const paymentHash = req.headers['x-payment-hash'] as string;
  const paymentNonce = req.headers['x-payment-nonce'] as string;

  // Check if payment is provided
  if (!paymentHash || !paymentNonce) {
    // Return 402 Payment Required with payment info
    const nonce = crypto.randomBytes(16).toString('hex');
    pendingNonces.set(nonce, Date.now());

    return res.status(402).json({
      amount: PAYMENT_AMOUNT,
      recipient: PAYMENT_ADDRESS,
      nonce: nonce,
      message: 'Payment required for premium sentiment analysis',
    });
  }

  // Verify payment hasn't been used before
  if (processedPayments.has(paymentHash)) {
    return res.status(409).json({ error: 'Payment already processed' });
  }

  // Verify nonce is valid and recent (10 minutes)
  const nonceTimestamp = pendingNonces.get(paymentNonce);
  if (!nonceTimestamp || Date.now() - nonceTimestamp > 10 * 60 * 1000) {
    return res.status(400).json({ error: 'Invalid or expired nonce' });
  }

  // Verify payment on Base blockchain
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: paymentHash as `0x${string}`,
    });

    if (!receipt || receipt.status !== 'success') {
      return res.status(402).json({ error: 'Payment transaction failed or not found' });
    }

    // Mark payment as processed
    processedPayments.add(paymentHash);
    pendingNonces.delete(paymentNonce);

    // Provide the premium data
    const sentimentData = await fetchSentimentData(query);
    
    res.json({
      success: true,
      data: sentimentData,
      paymentVerified: true,
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

/**
 * Fetch sentiment data (mock implementation - replace with real API)
 */
async function fetchSentimentData(query: string): Promise<any> {
  // TODO: Integrate with Twitter API, LunarCrush, Santiment, etc.
  console.log(`😊 Fetching sentiment data for: ${query}`);

  // Mock data for demonstration
  return {
    asset: query,
    overallSentiment: 'bullish',
    sentimentScore: 7.8, // 0-10 scale
    socialVolume: 125000,
    socialDominance: 12.5,
    twitterMentions24h: 45000,
    redditMentions24h: 8500,
    newsArticles24h: 342,
    influencerMentions: [
      { username: '@cryptowhale', followers: 500000, sentiment: 'bullish' },
      { username: '@blockchainpro', followers: 250000, sentiment: 'neutral' },
    ],
    topKeywords: ['adoption', 'ETF', 'institutional', 'halvening'],
    fearGreedIndex: 72,
    lastUpdated: new Date().toISOString(),
    source: 'Premium Sentiment Analysis Service',
  };
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'sentiment-analysis', payment: 'x402' });
});

app.listen(PORT, () => {
  console.log(`😊 Sentiment Analysis Service (x402) listening on port ${PORT}`);
  console.log(`💰 Payment: ${PAYMENT_AMOUNT} USDC to ${PAYMENT_ADDRESS}`);
});

export default app;
