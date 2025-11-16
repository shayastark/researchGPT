# 🚀 Deployment Steps - x402 Payment Fix

**Status:** Code updated, ready for deployment  
**Date:** 2025-11-16

---

## ✅ What Was Fixed

1. **Created x402 Payment Client** (`src/lib/x402-client.ts`)
   - Implements full x402 payment protocol
   - Handles 402 responses correctly
   - Makes on-chain USDC payments
   - Retries with payment proof

2. **Updated Agent** (`src/agent/index.ts`)
   - Supports Locus MCP integration (primary method)
   - Falls back to direct x402 payments
   - Proper error handling and logging
   - Automatic payment method detection

3. **Added Dependencies** (`package.json`)
   - Added `viem: ^2.21.0` for blockchain interactions

---

## 🔧 Deployment Instructions

### Step 1: Install Dependencies

```bash
npm install
```

This will install the new `viem` dependency required for blockchain interactions.

### Step 2: Build the Code

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Step 3: Configure Environment Variables

Choose **ONE** of these payment methods:

#### Option A: Locus MCP (Recommended)

```bash
# In Railway dashboard, set these variables:
ANTHROPIC_API_KEY=sk-ant-api03-...
LOCUS_API_KEY=locus_...
XMTP_WALLET_KEY=0x...
XMTP_ENV=production
XMTP_DB_ENCRYPTION_KEY=...
PORT=3000
```

#### Option B: Direct x402 Payments

```bash
# In Railway dashboard, set these variables:
ANTHROPIC_API_KEY=sk-ant-api03-...
PRIVATE_KEY=0x...  # Wallet with USDC
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
USE_MAINNET=true
XMTP_WALLET_KEY=0x...
XMTP_ENV=production
XMTP_DB_ENCRYPTION_KEY=...
PORT=3000
```

### Step 4: Approve Endpoints in Locus (if using Locus MCP)

1. Go to: https://app.paywithlocus.com/dashboard/agents
2. Select your agent
3. Edit policy group
4. Add these endpoints:
   - `https://www.capminal.ai/api/x402/research`
   - `https://sbx-x402.sapa-ai.com/weather`
   - `https://x402.ottoai.services/llm-research`
   - `https://otaku.so/api/messaging/jobs`
   - `https://api.canza.app/token/gems-list`
   - `https://api.ethyai.app/x402/ta`
5. Set spending limits
6. Save

### Step 5: Fund Wallet (if using direct payments)

**Testnet (for testing):**
```bash
# Visit https://faucet.circle.com/
# Select: USDC + Base Sepolia
# Enter your wallet address (from PRIVATE_KEY)
# Get free testnet USDC + ETH
```

**Mainnet (for production):**
```bash
# Send USDC to your wallet address on Base
# Also ensure you have some ETH for gas fees
# Minimum: ~$10 USDC + $1 ETH
```

### Step 6: Deploy

```bash
# Commit changes
git add .
git commit -m "Fix: Implement proper x402 payment protocol with Locus MCP"
git push

# Railway will auto-deploy
# Or manually trigger: railway up
```

### Step 7: Verify Deployment

```bash
# Check health
curl https://your-app.railway.app/health

# Check status
curl https://your-app.railway.app/status

# Should show:
# - "status": "healthy"
# - "payments": "Locus MCP" or "Direct x402"
# - "ready": true
```

### Step 8: Test with XMTP

Send a message to your agent via XMTP:

```
"What is the current social sentiment about AI agents and payments?"
```

Watch the logs:
```bash
railway logs --follow
```

Expected output:
```
📨 Received message from [user]
🔍 Processing research request with Claude + Locus MCP: "..."
🔧 Tool use iteration 1:
   Calling: ai_research({"query":"..."})
   💰 Making x402 payment call to: https://www.capminal.ai/api/x402/research
   💲 Payment method: Locus MCP
   ✅ Data received via Locus MCP
   ✅ ai_research completed
✅ Research completed
✅ Response sent to [user]
```

---

## 🔍 Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Code builds successfully (`npm run build`)
- [ ] Environment variables set correctly
- [ ] Endpoints approved in Locus (if using Locus MCP)
- [ ] Wallet funded with USDC (if using direct payments)
- [ ] Deployed to Railway (or your platform)
- [ ] Health check returns 200 OK
- [ ] Status shows correct payment method
- [ ] Test message sent via XMTP
- [ ] Agent responds with real data (not generic answers)
- [ ] Logs show successful payment processing
- [ ] Wallet balance decreases (Locus dashboard or blockchain)

---

## 🐛 Common Issues

### Issue: "tsc: not found"
**Solution:** Run `npm install` first

### Issue: "viem not found"
**Solution:** Run `npm install` to get new dependencies

### Issue: "No payment method configured"
**Solution:** Set either `LOCUS_API_KEY` or `PRIVATE_KEY`

### Issue: "Locus MCP returned 401"
**Solution:** Regenerate API key in Locus dashboard

### Issue: "Endpoint not approved"
**Solution:** Add endpoints to Locus policy group

### Issue: "Insufficient USDC balance"
**Solution:** Fund wallet (faucet for testnet, buy for mainnet)

### Issue: Still getting 405/499 errors
**Solution:** 
1. Check endpoint URLs are correct
2. Verify HTTP methods (GET vs POST)
3. Check endpoint is online (curl test)
4. Contact endpoint provider if issues persist

---

## 📊 Monitoring

### Railway Logs
```bash
railway logs --follow
```

### Locus Dashboard
- https://app.paywithlocus.com/dashboard/wallets (balance)
- https://app.paywithlocus.com/dashboard/payments (history)
- https://app.paywithlocus.com/dashboard/agents (policy)

### Blockchain Explorer
- Mainnet: https://basescan.org/
- Testnet: https://sepolia.basescan.org/

---

## 📚 Documentation Files

- **X402_PAYMENT_FIX.md** - Detailed technical explanation of the fix
- **DEPLOYMENT_STEPS.md** - This file (quick reference)
- **LOCUS_INTEGRATION.md** - Locus MCP integration guide
- **README.md** - Project overview

---

## 🎯 Quick Reference Commands

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm run dev

# Check agent network
npm run check-network

# Deploy to Railway
git push

# View logs
railway logs --follow

# Test health
curl https://your-app.railway.app/health
```

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Agent responds to XMTP messages
2. ✅ Logs show "Making x402 payment call"
3. ✅ Logs show "Data received via Locus MCP" or "Payment confirmed on-chain"
4. ✅ Responses contain real data from endpoints (not generic answers)
5. ✅ Wallet balance decreases in Locus dashboard
6. ✅ No more 405 or 499 errors in logs

---

**Need Help?**
- Check logs first: `railway logs --follow`
- Review X402_PAYMENT_FIX.md for troubleshooting
- Verify environment variables are set
- Ensure wallet has USDC balance
- Check endpoints are approved in Locus

---

**Ready to deploy!** 🚀
