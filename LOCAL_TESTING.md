# Local Testing Guide

## Quick Start

Test your x402 agent changes locally before deploying to production.

## Prerequisites

1. **Node.js 18+** installed
2. **Environment variables** set up in `.env` file
3. **Wallet funded** with USDC on Base (for x402 payments)

## Step 1: Create `.env` File

Create a `.env` file in the project root with these variables:

```env
# XMTP Agent (use your production key to test on production network)
XMTP_WALLET_KEY=0xYourXMTPPrivateKeyHere
XMTP_ENV=production

# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-key-here

# Payment Wallet (needs USDC on Base Mainnet)
PAYMENT_PRIVATE_KEY=0xYourPaymentWalletPrivateKeyHere

# Network Configuration
USE_MAINNET=true
BASE_RPC_URL=https://mainnet.base.org

# Optional: Database encryption
XMTP_DB_ENCRYPTION_KEY=your_32_byte_hex_key_here

# Optional: Max service price
MAX_SERVICE_PRICE_USDC=1.0
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Build the Project

```bash
npm run build
```

## Step 4: Run the Agent Locally

### Option A: Development Mode (with hot reload via ts-node)

```bash
npm run dev
```

This runs: `npm run bazaar` which uses ts-node to run TypeScript directly.

### Option B: Production Mode (build then run)

```bash
npm run build
npm start
```

## Step 5: Test the Agent

### 1. Check Health Endpoint

In another terminal:

```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "healthy",
  "service": "xmtp-x402-bazaar-agent",
  "x402Configured": true,
  "discoveredServices": 66
}
```

### 2. Check Status Endpoint

```bash
curl http://localhost:3000/status
```

This shows:
- Discovered services
- Payment wallet address
- XMTP agent address
- Available tools with prices

### 3. Send a Test Message via XMTP

Use an XMTP client (like xmtp.chat or a dev client) to message your agent's address.

Example queries:
- "Use that first tool to fetch sentiment about $BNKR"
- "Get me trading signals for Bitcoin"
- "What's the sentiment on Ethereum?"

### 4. Watch the Logs

You'll see detailed logs showing:
- Service discovery
- Payment processing
- **Response structure** (new logging we added!)
- Data extraction

Look for these new log lines:
```
📊 Response structure: { type, isArray, keys, sample }
🔍 Extracting data from 'data' field
ℹ️  Ignoring metadata fields: links, metadata
```

## What to Look For

### ✅ Success Indicators

1. **Agent starts successfully:**
   ```
   ✅ XMTP Agent initialized
   ✅ Discovered 66 available services
   ✅ XMTP x402 BAZAAR AGENT IS NOW ONLINE!
   ```

2. **Payment works:**
   ```
   ✅ Payment completed: { success: true, transaction: '0x...' }
   ```

3. **Data extraction works:**
   ```
   📊 Response structure: { ... }
   🔍 Extracting data from 'data' field
   ✅ Data received successfully
   ```

### ❌ Common Issues

1. **"No services discovered"**
   - Check `USE_MAINNET=true`
   - Try increasing `MAX_SERVICE_PRICE_USDC`

2. **"Payment failed"**
   - Ensure wallet has USDC on Base Mainnet
   - Check balance: https://basescan.org/address/YOUR_ADDRESS

3. **"x402 request failed"**
   - Check RPC URL is correct
   - Verify network connectivity

4. **Still getting only Twitter links**
   - Check the logs for `📊 Response structure`
   - Look for `🔍 Extracting data from...` to see what field is being extracted
   - The logs will show the actual response structure so we can adjust extraction logic

## Testing the New Data Extraction

The new code automatically extracts data from common response structures. To verify it's working:

1. **Send a query** that triggers an x402 service call
2. **Check logs** for the response structure:
   ```
   📊 Response structure: {
     type: 'object',
     isArray: false,
     keys: ['links', 'data', 'metadata'],
     sample: '{"links":["https://x.com/..."],"data":{"sentiment":"..."}}'
   }
   ```
3. **Verify extraction:**
   ```
   🔍 Extracting data from 'data' field
   ℹ️  Ignoring metadata fields: links, metadata
   ```

If the extraction isn't working correctly, the logs will show the actual structure so we can adjust the extraction logic.

## Debugging Tips

### Enable More Verbose Logging

The code already includes detailed logging. If you need more, you can add console.log statements in:
- `src/lib/x402-official-client.ts` - Response handling
- `src/agent/index-bazaar.ts` - Tool execution

### Test a Specific Endpoint

You can test the x402 client directly by creating a simple test script:

```typescript
// test-x402.ts
import { X402OfficialClient } from './src/lib/x402-official-client.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new X402OfficialClient({
  privateKey: process.env.PAYMENT_PRIVATE_KEY as `0x${string}`,
  rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  useMainnet: process.env.USE_MAINNET === 'true',
});

async function test() {
  const result = await client.callEndpoint(
    'https://x402.aiape.tech/signals',
    {
      method: 'GET',
      queryParams: { query: '$BNKR sentiment' },
    }
  );
  
  console.log('Result:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
```

Run with:
```bash
node --loader ts-node/esm test-x402.ts
```

## Next Steps

After testing locally:

1. **Verify the data extraction is working** - Check logs show proper extraction
2. **Test with multiple queries** - Try different services
3. **Check the actual data returned** - Not just links
4. **Commit and push** when ready:
   ```bash
   git add .
   git commit -m "Fix x402 response data extraction"
   git push origin main
   ```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `XMTP_WALLET_KEY` | ✅ | Your XMTP agent's private key |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for GPT-4 |
| `PAYMENT_PRIVATE_KEY` | ✅ | Wallet private key (needs USDC) |
| `XMTP_ENV` | ⚠️ | `production` for xmtp.chat users |
| `USE_MAINNET` | ⚠️ | `true` for Base Mainnet (most services) |
| `BASE_RPC_URL` | ⚠️ | Base RPC endpoint |
| `MAX_SERVICE_PRICE_USDC` | ⚠️ | Max price per service call |
| `XMTP_DB_ENCRYPTION_KEY` | ⭕ | Optional database encryption |

## Quick Commands

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in dev mode
npm run dev

# Run in production mode
npm start

# Check health
curl http://localhost:3000/health

# Check status
curl http://localhost:3000/status
```

---

**Ready to test!** Start the agent and send it a message via XMTP. The new logging will help us see exactly what data is being returned and how it's being extracted.

