# 🚀 x402 Demo Agent - Deployment Guide

**This is the working solution for your hackathon demo!**

## 🎯 Quick Start

### Step 1: Update Railway Configuration

Edit `railway.json` to use the demo version:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "node dist/src/agent/index-x402-demo.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**OR** just change the startCommand in Railway dashboard to:
```
node dist/src/agent/index-x402-demo.js
```

### Step 2: Set Environment Variables in Railway

Go to your Railway project settings and set these:

```bash
# XMTP Configuration
XMTP_WALLET_KEY=0xYOUR_XMTP_WALLET_KEY
XMTP_ENV=production
XMTP_DB_ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY

# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY

# x402 Payment Wallet (CRITICAL for payments!)
PAYMENT_PRIVATE_KEY=0xYOUR_PAYMENT_WALLET_KEY
# This wallet needs USDC on Base!

# Base Network Configuration
BASE_RPC_URL=https://mainnet.base.org
# OR use a premium RPC:
# BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

USE_MAINNET=true  # Set to 'false' for testnet

# HTTP Server (Railway sets this automatically)
PORT=3000
```

### Step 3: Fund Your Payment Wallet

**CRITICAL:** Your payment wallet needs USDC to make x402 payments!

#### For Testnet (Base Sepolia):
1. Set `USE_MAINNET=false`
2. Set `BASE_RPC_URL=https://sepolia.base.org`
3. Get free testnet ETH: https://www.alchemy.com/faucets/base-sepolia
4. Get free testnet USDC: https://faucet.circle.com/

#### For Mainnet (Base):
1. Set `USE_MAINNET=true`
2. Send real USDC to your payment wallet address
3. Ensure wallet also has some ETH for gas (~0.001 ETH should be plenty)

**Check your wallet:**
- Mainnet: https://basescan.org/address/YOUR_WALLET_ADDRESS
- Testnet: https://sepolia.basescan.org/address/YOUR_WALLET_ADDRESS

**How much USDC to fund?**
- Each x402 call costs ~0.10 USDC
- Fund with 10 USDC for ~100 queries
- Fund with 1 USDC for ~10 queries (good for testing)

### Step 4: Deploy

```bash
# Commit the changes
git add .
git commit -m "Deploy working x402 demo agent"
git push

# Railway will automatically deploy
```

### Step 5: Verify Deployment

```bash
# Check health endpoint
curl https://your-app.railway.app/health

# Expected response:
{
  "status": "healthy",
  "service": "x402-demo-agent",
  "payments": "x402-direct",
  "paymentWallet": "0x...",
  "x402Configured": true,
  "xmtpNetwork": "production"
}

# Check status endpoint for full details
curl https://your-app.railway.app/status
```

## 🧪 Testing the x402 Protocol

### Send a Test Message

1. Open XMTP chat client (https://xmtp.chat or Converse app)
2. Start conversation with your agent address
3. Send: `"Research the latest trends in AI agents"`

### What You Should See in Railway Logs

```
================================================================================
📨 Received message from 9ba58d50e58c30228b03783a0845f78609f2ea0f802483ff2e6690ab7fd14e96
   Query: "Research the latest trends in AI agents"
================================================================================

🔍 Processing with x402 Agent Payments Protocol
   Query: "Research the latest trends in AI agents"

🔄 Iteration 1:
   Stop reason: tool_use

   🔧 Tool: ai_research
      Input: {"query":"latest trends in AI agents"}

   💰 Executing x402 payment call:
      Endpoint: https://www.capminal.ai/api/x402/research
      Method: POST
      Query: latest trends in AI agents

   📡 Initial request to: https://www.capminal.ai/api/x402/research
   💳 Payment required (402 response)
   📋 Payment details: {
     "accepts": [{
       "type": "erc20",
       "quantity": "100000",
       "address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
       "receiver": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
       "chainId": 8453
     }],
     "nonce": "abc123xyz..."
   }
   💰 Sending 100000 USDC payment to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   ✅ Payment transaction sent: 0x8f3e2a1b...
   ⏳ Waiting for confirmation...
   ✅ Payment confirmed on-chain
   🔄 Retrying request with payment proof
   ✅ Data received successfully
      ✅ Data received via x402 protocol
      ✅ Success

🔄 Iteration 2:
   Stop reason: end_turn

✅ Research completed in 2 iteration(s)

✅ Response sent to 9ba58d50e58c30228b03783a0845f78609f2ea0f802483ff2e6690ab7fd14e96
================================================================================
```

**THIS is what judges want to see!** Every step of the x402 protocol clearly demonstrated! 🎉

## 🎭 Demo Script for Hackathon

### What to Show Judges

1. **Open Railway logs** (show live logs during demo)

2. **Open XMTP chat** (show the conversation)

3. **Send a message**: `"What's the weather in San Francisco?"`

4. **Point out in logs:**
   - "💳 Payment required (402 response)" ← **x402 protocol!**
   - "💰 Sending USDC payment" ← **Real blockchain transaction!**
   - "✅ Payment confirmed on-chain" ← **USDC transfer on Base!**
   - "🔄 Retrying with payment proof" ← **x402 protocol flow!**
   - "✅ Data received successfully" ← **Payment worked!**

5. **Show the response** in XMTP chat with real weather data

6. **Optional:** Show the transaction on BaseScan:
   - Copy transaction hash from logs
   - Visit https://basescan.org/tx/TRANSACTION_HASH
   - Show USDC transfer to endpoint provider

### Talking Points

> "Our AI agent autonomously pays for premium data using the x402 protocol. 
> Here you can see it receiving a 402 Payment Required response, making a 
> USDC payment on Base blockchain, and then receiving the data with payment 
> proof. This enables truly autonomous AI agents that can access premium 
> services without human intervention."

## 📊 Monitoring

### Railway Logs

```bash
# In Railway dashboard, click "View Logs"
# Or use Railway CLI:
railway logs --follow
```

### Check Wallet Balance

Monitor your USDC being spent:

```bash
# Mainnet
https://basescan.org/address/YOUR_PAYMENT_WALLET

# Testnet
https://sepolia.basescan.org/address/YOUR_PAYMENT_WALLET
```

You should see USDC transfers after each query!

### Health Checks

```bash
# Railway pings this automatically
curl https://your-app.railway.app/health
```

## 🛠️ Available Tools

Your agent can call these x402 endpoints:

| Tool | Endpoint | Cost | Description |
|------|----------|------|-------------|
| ai_research | Capminal AI | ~0.10 USDC | AI & tech research |
| weather_forecast | SAPA | ~0.01 USDC | Weather forecasts |
| llm_research | Otto AI | ~0.10 USDC | LLM research |
| job_search | Otaku | ~0.05 USDC | Job listings |
| crypto_gems | Canza | ~0.05 USDC | Crypto tokens |
| technical_analysis | EthyAI | ~0.05 USDC | TA analysis |

*Costs are approximate and determined by endpoint providers*

## 🐛 Troubleshooting

### ❌ "x402 payment client not configured"

**Problem:** No payment wallet set

**Fix:**
```bash
# In Railway, set:
PAYMENT_PRIVATE_KEY=0xYOUR_WALLET_KEY
```

### ❌ "Insufficient USDC balance"

**Problem:** Wallet has no USDC

**Fix:**
- Testnet: Get free USDC from https://faucet.circle.com/
- Mainnet: Send USDC to wallet address

### ❌ "Payment transaction reverted"

**Problem:** Wallet has no ETH for gas

**Fix:**
- Testnet: Get free ETH from https://www.alchemy.com/faucets/base-sepolia
- Mainnet: Send ~0.001 ETH to wallet for gas

### ❌ Agent not responding on XMTP

**Problem:** XMTP network mismatch

**Fix:**
```bash
# Check XMTP_ENV is set to 'production'
XMTP_ENV=production
```

### ✅ Agent running but no payments happening

**Problem:** Endpoints might be down or changed

**Check logs for:**
- "📡 Initial request to: ..." 
- If you see immediate errors, endpoint might be unavailable
- Try different queries to test other endpoints

## 📈 Success Metrics

### For Judges

- ✅ Agent receives XMTP messages
- ✅ Agent calls x402 endpoints
- ✅ **402 Payment Required responses received**
- ✅ **USDC payments made on Base blockchain**
- ✅ **Transactions confirmed on-chain**
- ✅ **Data received with payment proof**
- ✅ Responses sent back via XMTP
- ✅ Complete autonomous agent payment flow!

### Technical Metrics

Monitor these in Railway logs:
- Query response time (should be < 30 seconds)
- Payment confirmation time (typically 2-10 seconds on Base)
- Success rate of x402 calls
- USDC spent per query

## 🎯 Why This Works

### The Problem with Other Approaches

1. **Locus MCP**: Abstracts away the x402 protocol
   - Judges don't see the payment flow
   - Payments happen behind the scenes
   - Less impressive for demo

2. **Claude Agent SDK**: Subprocess issues
   - Fails in containerized environments
   - Falls back to no payments
   - Defeats the demo purpose

### Our Approach

- **Direct x402 implementation**: Crystal clear payment flow
- **Visible in logs**: Every step is logged
- **Reliable**: No subprocess, no abstraction layers
- **Perfect for demo**: Judges see exactly what's happening
- **True to protocol**: Implements x402 as designed

## 🚀 Deployment Checklist

Before presenting to judges:

- [ ] Railway environment variables set (especially `PAYMENT_PRIVATE_KEY`)
- [ ] Payment wallet has USDC (check on BaseScan)
- [ ] Payment wallet has ETH for gas
- [ ] `USE_MAINNET=true` for mainnet USDC
- [ ] Agent deployed and health check returns 200
- [ ] Test message sent and response received
- [ ] Railway logs show successful payment flow
- [ ] Transaction visible on BaseScan
- [ ] XMTP agent address shared with judges

## 💡 Pro Tips

### For Best Demo Experience

1. **Use mainnet** if possible (more impressive than testnet)
2. **Pre-fund wallet** with ~5-10 USDC
3. **Test beforehand** with multiple queries
4. **Keep logs open** during demo
5. **Prepare BaseScan tab** to show transaction
6. **Have backup queries** ready in case one endpoint is down

### Impressive Queries

```
"Research the latest trends in AI agent payments"
"What's the weather in San Francisco?"
"Find me some promising crypto gems under $100M market cap"
"Technical analysis for Bitcoin over the past week"
```

## 📚 Resources

- **x402 Protocol**: https://docs.cdp.coinbase.com/x402/
- **Base Network**: https://docs.base.org/
- **BaseScan**: https://basescan.org/
- **XMTP**: https://xmtp.org/
- **USDC Faucet** (testnet): https://faucet.circle.com/

## 🎉 Final Checklist

Ready to impress judges when you have:

- ✅ Agent deployed on Railway
- ✅ Payment wallet funded with USDC
- ✅ Test query successful with payment flow visible
- ✅ Transaction confirmed on BaseScan
- ✅ Logs clearly showing x402 protocol steps
- ✅ Response delivered via XMTP

**You're ready to win that hackathon!** 🏆

---

**Any issues? The logs will tell you exactly what's wrong. The demo agent has extensive logging at every step!**
