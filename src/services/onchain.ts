import express from 'express';
import { paymentMiddleware } from 'x402-express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.ONCHAIN_PORT || 3003;
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || '';
const USE_MAINNET = process.env.USE_MAINNET === 'true';

// Configure facilitator based on environment
const facilitatorConfig = USE_MAINNET
  ? require('@coinbase/x402').facilitator // Mainnet (requires CDP API keys)
  : { url: 'https://x402.org/facilitator' }; // Testnet

const network = USE_MAINNET ? 'base' : 'base-sepolia';

console.log(`⛓️  On-Chain Analytics Service Configuration:`);
console.log(`   Network: ${network}`);
console.log(`   Facilitator: ${USE_MAINNET ? 'CDP (mainnet)' : 'x402.org (testnet)'}`);
console.log(`   Payment Address: ${PAYMENT_ADDRESS}`);

// Apply x402 payment middleware
app.use(
  paymentMiddleware(
    PAYMENT_ADDRESS,
    {
      'POST /api/onchain': {
        price: '$0.20',
        network: network,
        config: {
          description: 'Get comprehensive on-chain analytics including transactions, whale activity, and holder distribution',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Cryptocurrency or asset to analyze on-chain data for',
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
                  network: { type: 'string' },
                  activeAddresses24h: { type: 'number' },
                  transactions24h: { type: 'number' },
                  transactionVolume24h: { type: 'number' },
                  exchangeInflows24h: { type: 'number' },
                  exchangeOutflows24h: { type: 'number' },
                  netFlow24h: { type: 'number' },
                  dexVolume24h: { type: 'number' },
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
 * On-Chain Analytics Endpoint (Protected by x402)
 * Price: $0.20 USDC
 */
app.post('/api/onchain', async (req, res) => {
  const { query } = req.body;

  console.log(`⛓️  Processing on-chain analytics for: ${query}`);

  // Fetch on-chain data (mock implementation - replace with real API)
  const onchainData = await fetchOnchainData(query);

  res.json({
    success: true,
    data: onchainData,
  });
});

/**
 * Fetch on-chain data (mock implementation - replace with real API)
 * TODO: Integrate with Dune Analytics, The Graph, Etherscan, etc.
 */
async function fetchOnchainData(query: string): Promise<any> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock data for demonstration
  return {
    asset: query,
    network: 'Base',
    activeAddresses24h: 145000,
    transactions24h: 892000,
    transactionVolume24h: 4200000000,
    avgTransactionSize: 4712.32,
    whaleTransactions: [
      {
        hash: '0xabc...123',
        from: '0x742...d2f',
        to: '0x9f8...a3e',
        value: 5000000,
        timestamp: Date.now() - 3600000,
      },
      {
        hash: '0xdef...456',
        from: '0x123...4f5',
        to: '0x8e7...b2c',
        value: 3200000,
        timestamp: Date.now() - 7200000,
      },
    ],
    topHolders: [
      { address: '0x742...d2f', balance: 250000000, percentage: 12.5 },
      { address: '0x9f8...a3e', balance: 180000000, percentage: 9.0 },
      { address: '0x123...4f5', balance: 150000000, percentage: 7.5 },
    ],
    exchangeInflows24h: 25000000,
    exchangeOutflows24h: 42000000,
    netFlow24h: 17000000, // Positive = accumulation
    dexVolume24h: 125000000,
    smartContractInteractions24h: 45000,
    gasUsed24h: 850000000000,
    lastUpdated: new Date().toISOString(),
    source: 'Premium On-Chain Analytics Service',
  };
}

// Health check endpoint (free, no payment required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'onchain-analytics',
    network: network,
    price: '$0.20',
  });
});

app.listen(PORT, () => {
  console.log(`⛓️  On-Chain Analytics Service (x402) listening on port ${PORT}`);
  console.log(`💰 Payment: $0.20 USDC on ${network}`);
  console.log(`🔗 Test with: curl http://localhost:${PORT}/health`);
});

export default app;
