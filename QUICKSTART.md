# 🚀 Quick Start Guide

Get your XMTP research agent running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your keys:

```env
# Get from XMTP
XMTP_KEY=your_xmtp_key_here

# Get from OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Create a new wallet or use existing
PRIVATE_KEY=0x_your_private_key_here

# Your wallet address to receive payments
PAYMENT_ADDRESS=0x_your_address_here

# Use testnet for free testing
USE_MAINNET=false
```

## Step 3: Get Free Testnet USDC

1. Go to: https://faucet.circle.com/
2. Select **USDC** and **Base Sepolia**
3. Paste your wallet address (from the private key above)
4. Claim free USDC!

## Step 4: Start Services

**Terminal 1:**
```bash
npm run services:all
```

**Terminal 2:**
```bash
npm run dev
```

## Step 5: Test It!

Send a message to your XMTP agent:

```
"Analyze Bitcoin market conditions"
```

Watch the magic happen:
- ✅ Agent receives message
- 🧠 GPT-4 plans what data to buy
- 💸 Agent pays services automatically ($0.10, $0.15, $0.20)
- 📊 Services return premium data
- 🤖 GPT-4 synthesizes comprehensive report
- 📨 Agent sends report back

## Troubleshooting

### Services won't start
```bash
# Make sure no processes using ports 3001, 3002, 3003
lsof -ti:3001,3002,3003 | xargs kill -9
```

### Agent has no USDC
- Get free testnet USDC from Circle faucet
- Make sure you're using the correct wallet address

### Health checks failing
```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

All should return `{"status": "ok"}`

## What's Next?

- **Add real data sources**: Replace mock data in services with real APIs
- **Switch to mainnet**: Set `USE_MAINNET=true` and get CDP API keys
- **Deploy to Railway**: `railway up`
- **Customize pricing**: Edit service prices in `src/services/*.ts`

## Architecture Overview

```
User → XMTP Agent → GPT-4 (plan)
          ↓
    x402 Services (pay with USDC)
          ↓
    Premium Data Returns
          ↓
    GPT-4 (synthesize)
          ↓
    User ← Report via XMTP
```

## Key Files

- `src/agent/index.ts` - XMTP agent (buyer)
- `src/lib/x402-client.ts` - Payment client
- `src/services/*.ts` - x402 services (sellers)
- `.env` - Configuration

## Support

- x402 Discord: https://discord.gg/cdp
- x402 Docs: https://docs.cdp.coinbase.com/x402
- XMTP Docs: https://docs.xmtp.org

Happy building! 🎉
