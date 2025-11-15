# XMTP Research Agent with x402 Payments

An autonomous research agent that accepts research requests via XMTP, pays for premium data using the x402 protocol with USDC on Base blockchain, and returns comprehensive AI-synthesized reports.

## 🏗️ Architecture

```
User sends XMTP message
    ↓
Agent receives & plans research (GPT-4)
    ↓
Agent pays x402 services with USDC on Base
    ↓
Services verify payment on-chain
    ↓
Services return premium data
    ↓
Agent synthesizes report with GPT-4
    ↓
User receives comprehensive report via XMTP
```

## 🛠️ Tech Stack

- **Messaging**: XMTP Agent SDK
- **Blockchain**: Base (via viem)
- **Payment Protocol**: x402 (HTTP 402 Payment Required)
- **AI**: OpenAI GPT-4
- **Backend**: Express + TypeScript
- **Deploy**: Railway

## 📁 Project Structure

```
/workspace
├── src/
│   ├── agent/
│   │   └── index.ts              # Main XMTP agent
│   ├── lib/
│   │   └── x402-client.ts        # x402 payment client
│   └── services/
│       ├── market-data.ts        # Market data service (x402)
│       ├── sentiment.ts          # Sentiment analysis service (x402)
│       └── onchain.ts            # On-chain analytics service (x402)
├── package.json
├── tsconfig.json
├── railway.json
└── .env.example
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- XMTP account/key
- OpenAI API key
- Base wallet with USDC (testnet or mainnet)

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Copy environment file:**
```bash
cp .env.example .env
```

3. **Configure for TESTNET (Recommended first):**

Edit `.env`:
```env
# Required
XMTP_KEY=your_xmtp_key_here
OPENAI_API_KEY=your_openai_api_key_here
PRIVATE_KEY=0x_your_private_key_here        # Agent's wallet
PAYMENT_ADDRESS=0x_your_payment_address      # Where you receive USDC

# Testnet config
USE_MAINNET=false
BASE_RPC_URL=https://sepolia.base.org

# CDP keys NOT needed for testnet
```

4. **Get FREE testnet USDC:**
- Visit: https://faucet.circle.com/
- Select "USDC" + "Base Sepolia"
- Paste your agent wallet address (from PRIVATE_KEY)
- Get free USDC for testing!

### Running the Agent

**Option 1: Run all services together (recommended):**
```bash
# Start all 3 services in one command
npm run services:all

# In a new terminal, start the agent
npm run dev
```

**Option 2: Run services separately:**
```bash
# Terminal 1: Market Data Service ($0.10)
npm run service:market

# Terminal 2: Sentiment Analysis Service ($0.15)
npm run service:sentiment

# Terminal 3: On-Chain Analytics Service ($0.20)
npm run service:onchain

# Terminal 4: XMTP Agent
npm run dev
```

### Testing the Agent

1. **Health check all services:**
```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

2. **Send an XMTP message to your agent:**
```
"Analyze Bitcoin market conditions"
"What's the Ethereum sentiment?"
"Give me a full research report on Solana"
```

3. **Watch the agent:**
- Plan the research (GPT-4 decides what data to buy)
- Pay for each service (x402 automatic payments)
- Synthesize report (GPT-4 creates comprehensive analysis)
- Send response via XMTP

### Switching to MAINNET (Production)

When ready for real payments:

1. **Get CDP API keys:**
- Sign up: https://cdp.coinbase.com
- Create project and generate API keys

2. **Update `.env`:**
```env
USE_MAINNET=true
BASE_RPC_URL=https://mainnet.base.org
CDP_API_KEY_ID=your_api_key_id
CDP_API_KEY_SECRET=your_api_key_secret
```

3. **Fund agent wallet with real USDC on Base**

4. **Restart services and agent**

### Build & Deploy

```bash
# Build
npm run build

# Start production
npm start
```

## 💰 x402 Protocol Flow

The x402 protocol enables micropayments for API access:

1. **Initial Request**: Client requests data without payment
2. **402 Response**: Service returns payment info (amount, address, nonce)
3. **Payment**: Client sends USDC on Base blockchain
4. **Retry Request**: Client retries with payment hash in headers
5. **Verification**: Service verifies payment on-chain
6. **Data Delivery**: Service returns premium data

### Payment Amounts

- Market Data: **$0.10 USDC**
- Sentiment Analysis: **$0.15 USDC**
- On-Chain Analytics: **$0.20 USDC**

## 🤖 Agent Capabilities

The agent can research:

- **Market Data**: Prices, volumes, market cap, dominance
- **Sentiment**: Social media, news, influencer analysis
- **On-Chain**: Transactions, whale movements, holder analysis

Example queries:
- "What's the current Bitcoin market sentiment?"
- "Analyze Ethereum on-chain whale activity"
- "Give me a full research report on Solana"

## 🔧 API Endpoints

### Market Data Service
```
POST /api/market
Headers: X-Payment-Hash, X-Payment-Nonce
Body: { query: string }
```

### Sentiment Service
```
POST /api/sentiment
Headers: X-Payment-Hash, X-Payment-Nonce
Body: { query: string }
```

### On-Chain Service
```
POST /api/onchain
Headers: X-Payment-Hash, X-Payment-Nonce
Body: { query: string }
```

## 🚢 Railway Deployment

This project is configured for Railway deployment:

```bash
railway login
railway init
railway up
```

Set environment variables in Railway dashboard.

## 🧪 Testing

Send test message via XMTP to your agent's address:

```
"Analyze Bitcoin market conditions and sentiment"
```

The agent will:
1. Plan the research
2. Pay for needed data services
3. Synthesize a comprehensive report
4. Reply via XMTP

## 📝 License

MIT

## 🏆 Hackathon Project

Built for [Hackathon Name] - Demonstrating autonomous AI agents with micropayment capabilities on Base blockchain.
