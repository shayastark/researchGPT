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

const PORT = process.env.ONCHAIN_PORT || 3003;
const PAYMENT_AMOUNT = '0.20'; // 20 cents in USDC
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
 * On-Chain Analytics Service (x402-enabled)
 * Provides blockchain transaction and smart contract analytics
 */

app.post('/api/onchain', async (req: Request, res: Response) => {
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
      message: 'Payment required for premium on-chain analytics',
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
    const onchainData = await fetchOnchainData(query);
    
    res.json({
      success: true,
      data: onchainData,
      paymentVerified: true,
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

/**
 * Fetch on-chain data (mock implementation - replace with real API)
 */
async function fetchOnchainData(query: string): Promise<any> {
  // TODO: Integrate with Dune Analytics, The Graph, Etherscan, etc.
  console.log(`⛓️  Fetching on-chain data for: ${query}`);

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

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'onchain-analytics', payment: 'x402' });
});

app.listen(PORT, () => {
  console.log(`⛓️  On-Chain Analytics Service (x402) listening on port ${PORT}`);
  console.log(`💰 Payment: ${PAYMENT_AMOUNT} USDC to ${PAYMENT_ADDRESS}`);
});

export default app;
