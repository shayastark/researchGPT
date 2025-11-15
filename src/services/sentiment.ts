import express from 'express';
import { paymentMiddleware } from 'x402-express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.SENTIMENT_PORT || 3002;
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || '';
const USE_MAINNET = process.env.USE_MAINNET === 'true';

// Configure facilitator based on environment
const facilitatorConfig = USE_MAINNET
  ? require('@coinbase/x402').facilitator // Mainnet (requires CDP API keys)
  : { url: 'https://x402.org/facilitator' }; // Testnet

const network = USE_MAINNET ? 'base' : 'base-sepolia';

console.log(`😊 Sentiment Analysis Service Configuration:`);
console.log(`   Network: ${network}`);
console.log(`   Facilitator: ${USE_MAINNET ? 'CDP (mainnet)' : 'x402.org (testnet)'}`);
console.log(`   Payment Address: ${PAYMENT_ADDRESS}`);

// Apply x402 payment middleware
app.use(
  paymentMiddleware(
    PAYMENT_ADDRESS,
    {
      'POST /api/sentiment': {
        price: '$0.15',
        network: network,
        config: {
          description: 'Get comprehensive sentiment analysis from social media, news, and influencer data',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Cryptocurrency or asset to analyze sentiment for',
              },
            },
            required: ['query'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  asset: { type: 'string' },
                  overallSentiment: { type: 'string' },
                  sentimentScore: { type: 'number' },
                  socialVolume: { type: 'number' },
                  socialDominance: { type: 'number' },
                  twitterMentions24h: { type: 'number' },
                  redditMentions24h: { type: 'number' },
                  newsArticles24h: { type: 'number' },
                  fearGreedIndex: { type: 'number' },
                  lastUpdated: { type: 'string' },
                  source: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    facilitatorConfig
  )
);

/**
 * Sentiment Analysis Endpoint (Protected by x402)
 * Price: $0.15 USDC
 */
app.post('/api/sentiment', async (req, res) => {
  const { query } = req.body;

  console.log(`😊 Processing sentiment analysis for: ${query}`);

  // Fetch sentiment data (mock implementation - replace with real API)
  const sentimentData = await fetchSentimentData(query);

  res.json({
    success: true,
    data: sentimentData,
  });
});

/**
 * Fetch sentiment data (mock implementation - replace with real API)
 * TODO: Integrate with Twitter API, LunarCrush, Santiment, etc.
 */
async function fetchSentimentData(query: string): Promise<any> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

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

// Health check endpoint (free, no payment required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sentiment-analysis',
    network: network,
    price: '$0.15',
  });
});

app.listen(PORT, () => {
  console.log(`😊 Sentiment Analysis Service (x402) listening on port ${PORT}`);
  console.log(`💰 Payment: $0.15 USDC on ${network}`);
  console.log(`🔗 Test with: curl http://localhost:${PORT}/health`);
});

export default app;
