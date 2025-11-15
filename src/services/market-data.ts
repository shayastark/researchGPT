import express from 'express';
import { paymentMiddleware } from 'x402-express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.MARKET_DATA_PORT || 3001;
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || '';
const USE_MAINNET = process.env.USE_MAINNET === 'true';

// Configure facilitator based on environment
const facilitatorConfig = USE_MAINNET
  ? require('@coinbase/x402').facilitator // Mainnet (requires CDP API keys)
  : { url: 'https://x402.org/facilitator' }; // Testnet

const network = USE_MAINNET ? 'base' : 'base-sepolia';

console.log(`📊 Market Data Service Configuration:`);
console.log(`   Network: ${network}`);
console.log(`   Facilitator: ${USE_MAINNET ? 'CDP (mainnet)' : 'x402.org (testnet)'}`);
console.log(`   Payment Address: ${PAYMENT_ADDRESS}`);

// Validate payment address
if (!PAYMENT_ADDRESS) {
  throw new Error('PAYMENT_ADDRESS environment variable is required');
}

// Apply x402 payment middleware
app.use(
  paymentMiddleware(
    PAYMENT_ADDRESS as `0x${string}`,
    {
      'POST /api/market': {
        price: '$0.10',
        network: network as any,
      },
    },
    facilitatorConfig
  )
);

/**
 * Market Data Endpoint (Protected by x402)
 * Price: $0.10 USDC
 */
app.post('/api/market', async (req, res) => {
  const { query } = req.body;

  console.log(`📊 Processing market data request for: ${query}`);

  // Fetch market data (mock implementation - replace with real API)
  const marketData = await fetchMarketData(query);

  res.json({
    success: true,
    data: marketData,
  });
});

/**
 * Fetch market data (mock implementation - replace with real API)
 * TODO: Integrate with CoinGecko, Dune, CoinMarketCap, etc.
 */
async function fetchMarketData(query: string): Promise<any> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock data for demonstration
  return {
    asset: query,
    price: 42069.69,
    volume24h: 28500000000,
    change24h: 5.23,
    marketCap: 820000000000,
    dominance: 54.2,
    lastUpdated: new Date().toISOString(),
    source: 'Premium Market Data Service',
  };
}

// Health check endpoint (free, no payment required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'market-data',
    network: network,
    price: '$0.10',
  });
});

app.listen(PORT, () => {
  console.log(`📊 Market Data Service (x402) listening on port ${PORT}`);
  console.log(`💰 Payment: $0.10 USDC on ${network}`);
  console.log(`🔗 Test with: curl http://localhost:${PORT}/health`);
});

export default app;
