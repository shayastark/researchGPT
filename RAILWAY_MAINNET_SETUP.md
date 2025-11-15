# 🚀 Railway Mainnet Deployment Guide

## ⚠️ Important: Mainnet Configuration

This guide is for deploying your XMTP agent on **Base mainnet** with real USDC payments.

## 📋 Required Environment Variables

Set these in your Railway project:

### XMTP Configuration (Production Network)

```env
# CRITICAL: Must be 'production' for xmtp.chat
XMTP_ENV=production

# Your wallet private key (with 0x prefix)
XMTP_WALLET_KEY=0x...

# Database encryption key
XMTP_DB_ENCRYPTION_KEY=c16cc423a51ee545d6845d3b76526851352d93e7634c7469dbc7fba7bce61212
```

### Base Mainnet Configuration

```env
# CRITICAL: Use mainnet RPC
BASE_RPC_URL=https://mainnet.base.org

# CRITICAL: Must be 'true' for mainnet
USE_MAINNET=true

# Your wallet private key for x402 payments (can be same as XMTP_WALLET_KEY)
PRIVATE_KEY=0x...

# Where you receive USDC payments for x402 services
PAYMENT_ADDRESS=0x...
```

### Coinbase Developer Platform (CDP) API Keys

**Required for mainnet facilitator:**

```env
# Get these from https://portal.cdp.coinbase.com/
CDP_API_KEY_ID=organizations/your-org-id/apiKeys/your-key-id
CDP_API_KEY_SECRET=-----BEGIN EC PRIVATE KEY-----\nYourKeyHere\n-----END EC PRIVATE KEY-----
```

To get CDP API keys:
1. Go to https://portal.cdp.coinbase.com/
2. Create a project
3. Generate API keys
4. Copy the Key ID and Private Key

### OpenAI Configuration

```env
OPENAI_API_KEY=sk-proj-...
```

### x402 Service Endpoints

```env
# Your Railway service URLs (deploy services first)
MARKET_DATA_SERVICE=https://your-market-service.railway.app
SENTIMENT_SERVICE=https://your-sentiment-service.railway.app
ONCHAIN_SERVICE=https://your-onchain-service.railway.app
```

## 💰 Fund Your Wallet

**CRITICAL:** Your agent wallet needs **real USDC on Base mainnet** to pay for x402 services.

### How to Fund:

1. **Bridge USDC to Base:**
   - Use https://bridge.base.org/
   - Or transfer directly from Coinbase

2. **Check Balance:**
   ```bash
   # Check your wallet has USDC on Base
   # Address: [your PRIVATE_KEY address]
   ```

3. **Recommended Amount:**
   - Start with at least **10 USDC** on Base mainnet
   - Each research query costs $0.10 - $0.45

## 🏗️ Deployment Steps

### Step 1: Deploy x402 Services First

Deploy these three services to Railway (separate projects):

1. **Market Data Service** (port 3001)
2. **Sentiment Service** (port 3002)
3. **On-Chain Service** (port 3003)

Each needs:
```env
USE_MAINNET=true
BASE_RPC_URL=https://mainnet.base.org
PAYMENT_ADDRESS=0x...  # Your payment receiving address
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
```

### Step 2: Deploy XMTP Agent

1. **Create Railway Project:**
   ```bash
   railway login
   railway init
   ```

2. **Set Environment Variables:**
   
   Use the Railway dashboard or CLI to set all the environment variables listed above.

3. **Add Volume (Optional but Recommended):**
   
   In Railway dashboard:
   - Go to your service
   - Add a Volume
   - Mount path: `/data`
   - Set `RAILWAY_VOLUME_MOUNT_PATH=/data`

4. **Deploy:**
   ```bash
   railway up
   ```

### Step 3: Initialize on Production Network

Before your agent can receive messages on xmtp.chat, initialize it once:

**Option A: Run locally first (recommended):**
```bash
# Set your .env with production settings
npm run initialize-production
```

**Option B: Run on Railway:**
```bash
railway run npm run initialize-production
```

You should see:
```
✅ SUCCESS! Agent initialized on PRODUCTION network
📬 Agent Address: 0x...
🌐 Network: PRODUCTION
✅ Users can now message this address on xmtp.chat!
```

### Step 4: Start the Agent

Railway will automatically run `npm start` which executes:
```bash
npm run build
node dist/agent/index.js
```

Check the logs for:
```
🤖 XMTP Research Agent Configuration:
   XMTP Network: production
   Base Network: Base (mainnet)
   Wallet: 0x...

✅ XMTP Research Agent is now online!
✅ Users can message you on xmtp.chat!
```

## ✅ Verification Checklist

Before going live:

- [ ] `XMTP_ENV=production` set
- [ ] `USE_MAINNET=true` set
- [ ] `BASE_RPC_URL=https://mainnet.base.org` set
- [ ] CDP API keys configured
- [ ] Wallet funded with USDC on Base mainnet (check: https://basescan.org/)
- [ ] All three x402 services deployed and running
- [ ] Service URLs configured in agent environment
- [ ] Agent initialized on production network
- [ ] Agent deployed and running on Railway
- [ ] Logs show "production" and "mainnet"

## 🧪 Testing

### Test on xmtp.chat:

1. Go to https://xmtp.chat/
2. Message your agent address: `0x...`
3. Send a test query: "What's Bitcoin's price?"

**What should happen:**
1. Agent receives your message
2. Agent plans research (GPT-4)
3. Agent pays x402 services with USDC on Base
4. Services verify payments on-chain
5. Agent synthesizes report with GPT-4
6. You receive comprehensive report via XMTP

**Check Railway logs for:**
```
📨 Received message from [your address]
🔍 Processing research request: "What's Bitcoin's price?"
💰 Fetching market data ($0.10)...
✅ Payment completed successfully
💵 Total cost: $0.10 USDC
🤖 Synthesizing research report with GPT-4...
✅ Response sent
```

## 💸 Cost Management

### Per-Query Costs:
- Market Data: **$0.10 USDC**
- Sentiment Analysis: **$0.15 USDC**
- On-Chain Analytics: **$0.20 USDC**
- **Full Research:** **$0.45 USDC**

### Plus:
- OpenAI GPT-4 API costs (varies)
- Base network gas fees (~$0.01 per transaction)

### Monitoring:

1. **Check wallet balance regularly:**
   - https://basescan.org/address/[your-wallet]

2. **Track spending:**
   - Monitor Railway logs for payment transactions
   - Each payment logs the transaction hash

3. **Set up alerts:**
   - Monitor wallet balance
   - Alert if balance drops below threshold

## 🔒 Security Best Practices

1. **Private Keys:**
   - Never commit to git
   - Use Railway's secret management
   - Consider using separate wallets for XMTP and payments

2. **CDP API Keys:**
   - Keep secret
   - Rotate periodically
   - Monitor usage in CDP dashboard

3. **Rate Limiting:**
   - Consider adding rate limits per user
   - Prevent spam queries
   - Monitor for abuse

4. **Wallet Security:**
   - Start with small USDC amount
   - Add more as needed
   - Monitor transactions

## 🐛 Troubleshooting

### "Unable to get inbox ID" on xmtp.chat
- Check: `XMTP_ENV=production`?
- Run: `npm run check-network`
- Fix: `npm run initialize-production`

### "Payment failed" errors
- Check: Wallet has USDC on Base mainnet?
- Check: `USE_MAINNET=true`?
- Check: CDP API keys configured?
- Check: Service endpoints accessible?

### "Failed to fetch data" errors
- Check: All three services deployed?
- Check: Service URLs correct in environment?
- Check: Services have same mainnet config?

### Agent not responding
- Check: Railway logs for errors
- Check: Agent is running (not crashed)
- Check: OpenAI API key valid and has credits

## 📊 Monitoring

### Key Metrics to Track:

1. **Uptime:** Agent should be running 24/7
2. **Response Time:** How long queries take
3. **Success Rate:** % of queries completed successfully
4. **Cost:** USDC spent per day/week
5. **Volume:** Number of queries per day

### Railway Dashboard:

- Check CPU/Memory usage
- Monitor restart count
- Review logs for errors
- Track deployment history

## 🔄 Updates & Maintenance

### Updating the Agent:

1. Push code changes to git
2. Railway auto-deploys (if configured)
3. Or manually: `railway up`

### Updating Environment Variables:

```bash
railway variables set VARIABLE_NAME=value
```

Or use the Railway dashboard.

### Database Backups:

If using Railway volumes:
- Database is persistent
- Backup encryption key securely
- Consider periodic volume snapshots

## 💡 Production Tips

1. **Start Conservative:**
   - Fund wallet with small amount initially
   - Monitor first few days closely
   - Increase funding as comfortable

2. **Monitor Costs:**
   - Track daily USDC spending
   - Monitor OpenAI API usage
   - Set budget alerts

3. **User Communication:**
   - Document costs for users
   - Set expectations on response time
   - Provide status updates

4. **Scale Gradually:**
   - Start with single instance
   - Monitor performance
   - Scale up as needed

## 🆘 Support

If issues persist:
1. Check Railway logs for specific errors
2. Verify all environment variables
3. Test services individually
4. Check blockchain explorer for payment transactions

## 📚 Related Documentation

- **[NETWORK_SETUP.md](./NETWORK_SETUP.md)** - XMTP network configuration
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - General Railway deployment
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Project overview

---

**You're now running on mainnet with real USDC!** 💰

Monitor closely and adjust as needed. Start small and scale up as you gain confidence.
