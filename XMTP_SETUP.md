# 🚀 XMTP Agent Setup Guide

Complete guide to setting up your XMTP Research Agent with proper credentials.

## 📋 Prerequisites

Before you begin, make sure you have:

- Node.js 18+ installed
- A wallet private key (you can use an existing one or generate a new one)
- OpenAI API key
- Base Sepolia testnet access (for testing) or Base mainnet (for production)

## 🔑 Step 1: Generate XMTP Credentials

The XMTP agent requires an encryption key to secure the message database.

Run the credential generator:

```bash
npm run generate-credentials
```

This will output something like:

```
🔐 XMTP Credential Generator

════════════════════════════════════════════════════════════

Generated Credentials:

XMTP_DB_ENCRYPTION_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2

════════════════════════════════════════════════════════════
```

**⚠️ IMPORTANT:** Save this encryption key somewhere safe! If you lose it, you lose access to all your XMTP messages.

## 📝 Step 2: Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your values:

### Required Variables

```env
# XMTP Configuration
XMTP_WALLET_KEY=0x1234...abcd  # Your wallet private key (with 0x prefix)
XMTP_ENV=dev                     # Use 'dev' for testing
XMTP_DB_ENCRYPTION_KEY=a1b2c3...  # From step 1

# OpenAI
OPENAI_API_KEY=sk-proj-...      # Your OpenAI API key

# Base Blockchain
PRIVATE_KEY=0x1234...abcd        # Wallet for paying x402 services (can be same as XMTP_WALLET_KEY)
BASE_RPC_URL=https://sepolia.base.org
USE_MAINNET=false                # false for testnet, true for mainnet
```

## 💰 Step 3: Get Testnet USDC (For Testing)

To test the agent, you need USDC on Base Sepolia:

1. Visit: https://faucet.circle.com/
2. Select **"USDC"** as the token
3. Select **"Base Sepolia"** as the network
4. Paste your wallet address (from `PRIVATE_KEY`)
5. Click "Get USDC"

You'll receive free testnet USDC to pay for research data!

## 🏗️ Step 4: Install Dependencies

```bash
npm install
```

## 🚀 Step 5: Start the Services

The agent needs three x402-enabled data services running:

**Option A: Start all services at once (recommended)**
```bash
npm run services:all
```

**Option B: Start services individually**
```bash
# Terminal 1 - Market Data Service
npm run service:market

# Terminal 2 - Sentiment Service
npm run service:sentiment

# Terminal 3 - On-chain Service
npm run service:onchain
```

You should see:
```
💰 Market Data Service running on port 3001
😊 Sentiment Analysis Service running on port 3002
⛓️  On-Chain Analytics Service running on port 3003
```

## 🤖 Step 6: Start the XMTP Agent

In a new terminal:

```bash
npm run dev
```

You should see:

```
🤖 XMTP Research Agent Configuration:
   XMTP Network: dev
   Base Network: Base Sepolia (testnet)
   Wallet: 0x1234...abcd

🔄 Initializing XMTP Agent...
✅ XMTP Agent initialized
   Address: 0x1234...abcd
   InboxId: a1b2c3d4e5f6...

════════════════════════════════════════════════════════════
✅ XMTP Research Agent is now online!
════════════════════════════════════════════════════════════

📬 Agent Address: 0x1234...abcd
📊 InboxId: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
🌐 Environment: dev
```

**🎉 Your agent is now live!**

## 📨 Step 7: Test the Agent

### Using XMTP CLI (Recommended)

Install XMTP CLI:
```bash
npm install -g @xmtp/cli
```

Send a test message:
```bash
xmtp send <your-agent-address> "What's Bitcoin's price?"
```

### Using XMTP Mobile App

1. Download [Converse](https://getconverse.app/) or another XMTP client
2. Start a new conversation with your agent address
3. Send a message like: "Full research on Ethereum"

### Test Queries

Try these example queries:

- **Simple query:** "What's Bitcoin's price?"
  - Agent will only fetch market data ($0.10)

- **Sentiment query:** "Is Ethereum sentiment bullish?"
  - Agent will only fetch sentiment data ($0.15)

- **Full research:** "Give me a full research report on Solana"
  - Agent will fetch all data: market + sentiment + on-chain ($0.45)

## 🔍 What Happens Next?

When you send a message, the agent will:

1. **🧠 Plan** - Use GPT-4 to determine what data is needed
2. **💳 Pay** - Automatically pay x402 services with USDC
3. **📊 Collect** - Fetch premium data from services
4. **✍️ Synthesize** - Create comprehensive report with GPT-4
5. **📤 Reply** - Send report back via XMTP

You'll see logs like:

```
📨 Received message from 0x5678...efgh
   Query: "What's Bitcoin's price?"

🔍 Processing research request: "What's Bitcoin's price?"
📋 Research plan: {"needsMarketData":true,"needsSentiment":false,"needsOnchain":false}

💰 Fetching market data ($0.10)...
🔄 x402 request to http://localhost:3001/api/market
✅ Payment completed successfully
✅ Market data received

💵 Total cost: $0.10 USDC

🤖 Synthesizing research report with GPT-4...
✅ Report generated
✅ Response sent to 0x5678...efgh
```

## 🚀 Going to Production

When you're ready to deploy to mainnet:

### 1. Get CDP API Keys

Sign up at https://cdp.coinbase.com/ and create API keys.

### 2. Update Environment Variables

```env
# Switch to mainnet
XMTP_ENV=production
USE_MAINNET=true
BASE_RPC_URL=https://mainnet.base.org

# Add CDP keys
CDP_API_KEY_ID=your_key_id
CDP_API_KEY_SECRET=your_key_secret
```

### 3. Fund Your Wallet

Transfer real USDC to your wallet on Base mainnet.

### 4. Deploy to Railway

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Railway deployment instructions.

## 🔧 Troubleshooting

### "XMTP_WALLET_KEY environment variable is required"

Make sure your `.env` file has `XMTP_WALLET_KEY` set with a valid private key starting with `0x`.

### "Failed to initialize XMTP Agent"

- Check that `XMTP_DB_ENCRYPTION_KEY` is 64 hex characters (no `0x` prefix)
- Make sure you have write permissions in the directory
- Try deleting the `.db3` file and restarting

### "x402 request failed"

- Make sure all three services are running (`npm run services:all`)
- Check that your wallet has USDC on Base Sepolia
- Verify service endpoints in `.env` are correct

### "Payment completed successfully" but no data returned

- The service might be returning mock data - this is expected in testing
- Check service logs to see what data was returned

## 📚 Additional Resources

- [XMTP Agent SDK Docs](https://docs.xmtp.org/agents/get-started/build-an-agent)
- [x402 Protocol Docs](https://docs.cdp.coinbase.com/x402/docs/welcome)
- [Base Network Docs](https://docs.base.org/)
- [Railway Deployment Guide](./DEPLOYMENT.md)

## 💡 Tips

1. **Use testnet first** - Always test on Base Sepolia before going to mainnet
2. **Backup encryption key** - Store `XMTP_DB_ENCRYPTION_KEY` securely
3. **Monitor costs** - Each query can cost $0.10-$0.45 depending on data needed
4. **Rate limiting** - Consider adding rate limits for production
5. **Real data sources** - Replace mock data in services with real APIs (CoinGecko, Dune, etc.)

## 🎯 Next Steps

Now that your agent is running:

1. ✅ Test different query types
2. ✅ Monitor x402 payment flows
3. ✅ Replace mock data with real APIs
4. ✅ Add more data sources
5. ✅ Deploy to Railway for 24/7 operation

Need help? Check the main [README.md](./README.md) or open an issue!
