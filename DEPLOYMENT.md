# 🚢 Deployment Guide

Deploy your XMTP research agent to production on Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- GitHub repository (optional but recommended)
- CDP API keys for mainnet (https://cdp.coinbase.com)
- Production wallet with USDC on Base

## Option 1: Deploy via Railway CLI (Recommended)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login

```bash
railway login
```

### Step 3: Initialize Project

```bash
railway init
```

### Step 4: Set Environment Variables

```bash
# Required variables
railway variables set XMTP_KEY=your_xmtp_key
railway variables set OPENAI_API_KEY=your_openai_key
railway variables set PRIVATE_KEY=0x_your_private_key
railway variables set PAYMENT_ADDRESS=0x_your_payment_address

# Mainnet configuration
railway variables set USE_MAINNET=true
railway variables set BASE_RPC_URL=https://mainnet.base.org

# CDP API keys (required for mainnet)
railway variables set CDP_API_KEY_ID=your_cdp_key_id
railway variables set CDP_API_KEY_SECRET=your_cdp_key_secret

# Service endpoints (Railway will auto-assign URLs)
railway variables set MARKET_DATA_SERVICE=https://your-market-service.railway.app
railway variables set SENTIMENT_SERVICE=https://your-sentiment-service.railway.app
railway variables set ONCHAIN_SERVICE=https://your-onchain-service.railway.app

# Ports
railway variables set MARKET_DATA_PORT=3001
railway variables set SENTIMENT_PORT=3002
railway variables set ONCHAIN_PORT=3003
```

### Step 5: Deploy

```bash
railway up
```

## Option 2: Deploy via GitHub

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Connect to Railway

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect the project

### Step 3: Configure Services

You'll need to create **4 separate Railway services**:

1. **Market Data Service**
   - Start Command: `npm run service:market`
   - Port: 3001

2. **Sentiment Service**
   - Start Command: `npm run service:sentiment`
   - Port: 3002

3. **On-Chain Service**
   - Start Command: `npm run service:onchain`
   - Port: 3003

4. **XMTP Agent**
   - Start Command: `npm start`
   - No port needed (runs as background service)

### Step 4: Set Environment Variables

For each service, add the environment variables in Railway dashboard.

### Step 5: Get Service URLs

Railway will assign URLs like:
- `https://market-data-production-abc123.railway.app`
- `https://sentiment-production-def456.railway.app`
- `https://onchain-production-ghi789.railway.app`

Update the agent service with these URLs.

## Deployment Architecture

```
Railway Service 1: Market Data (Port 3001)
Railway Service 2: Sentiment (Port 3002)
Railway Service 3: On-Chain (Port 3003)
Railway Service 4: XMTP Agent (Background)
```

The agent communicates with services via their public Railway URLs.

## Post-Deployment Checklist

- [ ] All 4 services are running
- [ ] Health checks return 200 OK
- [ ] Agent wallet has USDC on Base mainnet
- [ ] CDP facilitator is configured (mainnet)
- [ ] XMTP agent is receiving messages
- [ ] Test with small payment first

## Testing Production

1. **Health checks:**
```bash
curl https://your-market-service.railway.app/health
curl https://your-sentiment-service.railway.app/health
curl https://your-onchain-service.railway.app/health
```

2. **Send test XMTP message:**
```
"Quick Bitcoin price check"
```

3. **Monitor logs:**
- Check Railway dashboard for each service
- Look for payment confirmations
- Verify USDC transfers on Basescan

## Scaling Considerations

### Cost Optimization
- Use Railway's sleep feature for low-traffic services
- Monitor USDC balance in agent wallet
- Set up alerts for low balance

### Performance
- Enable Railway's auto-scaling
- Use Redis for payment tracking (replace in-memory storage)
- Add rate limiting to services

### Security
- Rotate API keys regularly
- Use Railway's secrets management
- Enable CORS only for known origins
- Monitor for unusual payment patterns

## Monitoring

### Railway Logs
```bash
railway logs
```

### Payment Tracking
- Monitor agent wallet on Basescan: https://basescan.org/
- Check payment receipt wallet for incoming USDC
- Track service usage and costs

### Alerts
Set up alerts for:
- Service downtime
- Low USDC balance (< $5)
- Failed payments
- High request volume

## Mainnet Costs

**Agent Costs (per research request):**
- Market Data: $0.10 USDC
- Sentiment: $0.15 USDC
- On-Chain: $0.20 USDC
- Full Report: $0.45 USDC total

**Gas Fees:**
- ✅ Paid by CDP facilitator (free for you!)
- Agent only needs USDC, not ETH

**Infrastructure:**
- Railway: ~$5-20/month depending on usage
- OpenAI: ~$0.01-0.05 per research request

## Rolling Back

If something goes wrong:

```bash
railway rollback
```

Or in Railway dashboard:
1. Go to service
2. Click "Deployments"
3. Click "Rollback" on previous working version

## Environment-Specific Configurations

### Testnet (Staging)
```env
USE_MAINNET=false
BASE_RPC_URL=https://sepolia.base.org
# No CDP keys needed
```

### Mainnet (Production)
```env
USE_MAINNET=true
BASE_RPC_URL=https://mainnet.base.org
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
```

## Support

- Railway Discord: https://discord.gg/railway
- x402 Discord: https://discord.gg/cdp
- Railway Docs: https://docs.railway.app

## Security Best Practices

1. **Never commit secrets**
   - Use Railway's environment variables
   - Keep `.env` in `.gitignore`

2. **Rotate keys regularly**
   - CDP API keys every 90 days
   - Private keys if compromised

3. **Monitor wallet**
   - Set up balance alerts
   - Use separate wallet for agent (not your main wallet)

4. **Rate limiting**
   - Add rate limits to services
   - Prevent abuse and unexpected costs

## Troubleshooting

### Deployment fails
- Check build logs in Railway dashboard
- Verify all environment variables are set
- Ensure TypeScript compiles: `npm run build`

### Services can't connect
- Check service URLs are correct
- Verify network configuration
- Test health endpoints

### Payments failing
- Verify CDP API keys are correct
- Check agent wallet has USDC
- Ensure USE_MAINNET matches network

### High costs
- Monitor request volume
- Add user rate limits
- Consider caching responses

Good luck with your deployment! 🚀
