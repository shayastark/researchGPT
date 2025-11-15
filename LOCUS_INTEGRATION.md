# Locus MCP Integration Guide

## 🎯 Overview

This XMTP agent now uses **Locus MCP** for autonomous payments across **multiple x402 facilitators**:

- **Locus Facilitator**: ethyai.app services
- **CDP Facilitator**: x402scan marketplace services

Claude autonomously decides which services to use and Locus handles all payments with policy enforcement.

## 🏗️ Architecture

```
XMTP Message
  ↓
Claude Agent SDK (analyzes request)
  ↓
Locus MCP (orchestrates payments)
  ├─ Locus Facilitator → ethyai.app/x402/ta
  └─ CDP Facilitator → x402scan services
  ↓
Comprehensive response
```

## 📋 Setup Checklist

### 1. Locus Wallet Setup ✅
- [x] Create wallet at https://app.paywithlocus.com/dashboard/wallets
- [x] Fund with USDC on Base mainnet
- [x] Download private key backup (stored securely)

### 2. Policy Group Configuration ✅
- [x] Create policy group at https://app.paywithlocus.com/dashboard/agents
- [x] Set monthly budget
- [x] Configure permissions

### 3. Approve x402 Endpoints

#### Already Approved ✅
- `http://api.ethyai.app/x402/ta` - Technical analysis (Locus facilitator)

#### Need to Approve from x402scan 🔜
Browse https://www.x402scan.com/ and approve services with **CDP facilitator**.

**Recommended Services:**

**Market Data (CDP Facilitator):**
- Price feeds
- Volume data
- Market cap
- Trading pairs

**Sentiment Analysis (CDP Facilitator):**
- Social media sentiment
- News aggregation
- Fear & Greed index

**On-Chain Analytics (CDP Facilitator):**
- Transaction data
- Whale tracking
- Token holder analysis
- Smart contract metrics

**How to Find CDP Services:**
1. Visit https://www.x402scan.com/
2. Look for services marked with "CDP facilitator"
3. Note the endpoint URLs
4. In Locus dashboard, add these endpoints to your policy approvals

### 4. Agent Credentials ✅
- [x] Create agent at https://app.paywithlocus.com/dashboard/agents
- [x] Generate API key (stored as LOCUS_API_KEY)
- [x] Configure in Railway environment variables

### 5. Anthropic API Key ✅
- [x] Get key from https://console.anthropic.com/
- [x] Configure as ANTHROPIC_API_KEY

## 🚀 Running the Agent

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your keys:
# - ANTHROPIC_API_KEY
# - LOCUS_API_KEY
# - XMTP_WALLET_KEY
# - XMTP_DB_ENCRYPTION_KEY
```

3. **Start the agent:**
```bash
npm run dev
```

4. **Test via XMTP:**
Send a message to your agent address:
- "What's the technical analysis for ETH?"
- "Give me Bitcoin price and sentiment"
- "Full research on Base ecosystem"

### Railway Deployment

**Environment Variables Required:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
LOCUS_API_KEY=locus_...
XMTP_WALLET_KEY=0x...
XMTP_ENV=production
XMTP_DB_ENCRYPTION_KEY=...
```

**Deploy:**
```bash
npm run build
npm start
```

## 🔧 How It Works

### Query Flow

1. **User sends XMTP message**: "Give me Bitcoin analysis"

2. **Claude receives structured prompt:**
```
You are a crypto research agent with access to:
- ta(symbol) - Technical analysis (Locus facilitator)
- price_data() - Market data (CDP facilitator)
- sentiment() - Sentiment analysis (CDP facilitator)

Choose the best services to answer comprehensively.
```

3. **Claude autonomously:**
   - Decides which tools to call
   - Calls `ta("BTC")` → Locus pays via Locus facilitator
   - Calls `price_data("BTC")` → Locus pays via CDP facilitator
   - Synthesizes comprehensive report

4. **Locus MCP handles:**
   - Authentication
   - Payment execution (USDC on Base)
   - Policy enforcement (budget limits)
   - Multi-facilitator routing

5. **User receives:** Complete research report via XMTP

### Multi-Facilitator Magic

**Key Insight from CDP Team:**
> The facilitator is determined by the SERVICE, not the client.

This means:
- `ethyai.app/x402/ta` → automatically uses Locus facilitator
- `x402scan.com` service → automatically uses CDP facilitator
- Locus MCP orchestrates payments to BOTH seamlessly

## 📊 Example Interactions

### Simple Query
```
User: "What's ETH technical analysis?"

Agent calls:
- ta("ETH") via Locus facilitator

Response: Technical indicators, support/resistance, trends
```

### Complex Query
```
User: "Give me full Bitcoin research"

Agent calls:
- ta("BTC") via Locus facilitator
- price_data("BTC") via CDP facilitator  
- sentiment("BTC") via CDP facilitator
- onchain("BTC") via CDP facilitator

Response: Comprehensive report with TA, price, sentiment, on-chain
```

### Budget Enforcement
```
User: "Research all top 100 tokens"

Locus MCP:
- Checks monthly budget
- May limit number of calls
- Respects policy limits
- Transparent to Claude
```

## 🎓 Demo Talking Points

**For Judges:**

1. **Multi-Facilitator Innovation:**
   - First agent demonstrating cross-facilitator orchestration
   - Locus + CDP working together seamlessly
   - Agent doesn't care which facilitator - just gets data

2. **True Autonomy:**
   - Claude decides which services to use
   - No hardcoded logic
   - Adapts to any query

3. **Policy Enforcement:**
   - Locus provides spending guardrails
   - Budget limits enforced automatically
   - Safe autonomous operation

4. **Ecosystem Thinking:**
   - Not locked to one facilitator
   - Accesses entire x402 ecosystem
   - Demonstrates protocol maturity

## 🐛 Troubleshooting

### "Locus API key error"
- Check LOCUS_API_KEY is set correctly
- Verify key starts with `locus_`
- Regenerate key in Locus dashboard if needed

### "Error connecting to Locus MCP server"
- Check LOCUS_MCP_SERVER_URL (default should work)
- Verify internet connectivity
- Check Locus service status

### "Claude API error"
- Verify ANTHROPIC_API_KEY is valid
- Check API key has credits
- Ensure key starts with `sk-ant-api03-`

### "No tools available"
- Check you've approved x402 endpoints in Locus
- Verify policy group is active
- Ensure wallet has USDC balance

### Agent not responding via XMTP
- Verify XMTP_ENV=production for xmtp.chat users
- Check agent address with `/status` endpoint
- Ensure agent is running (check `/health`)

## 📚 Resources

- **Locus Dashboard**: https://app.paywithlocus.com
- **x402scan Marketplace**: https://www.x402scan.com/
- **Claude Console**: https://console.anthropic.com/
- **XMTP Docs**: https://docs.xmtp.org/
- **Agent Status**: http://your-railway-url/status

## 🏆 Hackathon Tracks

### CDP x402 Track ✅
- Using x402 protocol
- CDP facilitator for marketplace services
- Payments on Base blockchain

### Locus Track ✅
- Locus MCP integration
- Policy enforcement
- Autonomous agent payments

### XMTP Track ✅
- XMTP agent SDK
- Real-time messaging
- Multi-user support

## 🔜 Next Steps

1. **Approve more CDP services** from x402scan.com
2. **Test with real queries** via XMTP
3. **Monitor costs** in Locus dashboard
4. **Refine policy limits** based on usage
5. **Prepare demo** showing multi-facilitator calls

---

**Built for x402 Hackathon**
Multi-facilitator autonomous agent with Locus MCP + CDP infrastructure
