# ✅ Base Mainnet Deployment Checklist

Quick reference for deploying your XMTP agent on Base mainnet with real USDC.

## 📋 Pre-Deployment Checklist

### 1. CDP API Keys (Required for Mainnet)

- [ ] Signed up at https://portal.cdp.coinbase.com/
- [ ] Created a project
- [ ] Generated API keys
- [ ] Copied Key ID and Private Key
- [ ] Keys saved securely

### 2. Wallet Setup

- [ ] Have wallet private key
- [ ] Wallet funded with USDC on Base mainnet
- [ ] Verified balance on https://basescan.org/
- [ ] Minimum 10 USDC recommended to start

### 3. Services Deployed

- [ ] Market Data Service deployed on Railway
- [ ] Sentiment Service deployed on Railway
- [ ] On-Chain Service deployed on Railway
- [ ] All services have mainnet environment variables
- [ ] All services are accessible (health check)

### 4. Environment Variables Ready

- [ ] `XMTP_ENV=production`
- [ ] `XMTP_WALLET_KEY=0x...`
- [ ] `XMTP_DB_ENCRYPTION_KEY=...`
- [ ] `OPENAI_API_KEY=sk-...`
- [ ] `PRIVATE_KEY=0x...`
- [ ] `BASE_RPC_URL=https://mainnet.base.org`
- [ ] `USE_MAINNET=true`
- [ ] `PAYMENT_ADDRESS=0x...`
- [ ] `CDP_API_KEY_ID=...`
- [ ] `CDP_API_KEY_SECRET=...`
- [ ] `MARKET_DATA_SERVICE=https://...`
- [ ] `SENTIMENT_SERVICE=https://...`
- [ ] `ONCHAIN_SERVICE=https://...`

## 🚀 Deployment Steps

### Step 1: Set Environment Variables

In Railway dashboard or CLI:

```bash
railway variables set XMTP_ENV=production
railway variables set USE_MAINNET=true
railway variables set BASE_RPC_URL=https://mainnet.base.org
railway variables set CDP_API_KEY_ID="organizations/..."
railway variables set CDP_API_KEY_SECRET="-----BEGIN EC PRIVATE KEY-----..."
# ... (set all other variables)
```

- [ ] All environment variables set in Railway

### Step 2: Deploy Agent

```bash
railway up
```

- [ ] Code deployed to Railway
- [ ] Build completed successfully
- [ ] Service started

### Step 3: Initialize on Production

Run once to register agent on XMTP production network:

**Option A: Locally (recommended)**
```bash
# Create local .env with production settings
npm run initialize-production
```

**Option B: On Railway**
```bash
railway run npm run initialize-production
```

- [ ] Initialization completed
- [ ] Agent address noted
- [ ] InboxId noted

### Step 4: Verify Deployment

Check Railway logs for:

```
🤖 XMTP Research Agent Configuration:
   XMTP Network: production  ← Must say production
   Base Network: Base (mainnet)  ← Must say mainnet
   Wallet: 0x...

✅ XMTP Research Agent is now online!
✅ Users can message you on xmtp.chat!
```

- [ ] Logs show "production" network
- [ ] Logs show "mainnet" 
- [ ] No errors in logs
- [ ] Agent is running

## 🧪 Testing

### Test 1: Message on xmtp.chat

1. Go to https://xmtp.chat/
2. Message your agent address
3. Send: "What's Bitcoin's price?"

- [ ] Message sent successfully
- [ ] Agent receives message (check logs)
- [ ] Agent responds with research report
- [ ] Response received in xmtp.chat

### Test 2: Verify Payment Flow

Check Railway logs should show:

```
📨 Received message
🔍 Processing research request
💰 Fetching market data ($0.10)...
🔄 x402 request to [service URL]
✅ Payment completed successfully
   Transaction: 0x...
💵 Total cost: $0.10 USDC
✅ Response sent
```

- [ ] Payment transaction logged
- [ ] Can verify transaction on https://basescan.org/
- [ ] Data received from service
- [ ] Report generated and sent

### Test 3: Verify USDC Balance

Check wallet on https://basescan.org/:

- [ ] USDC balance decreased by query cost
- [ ] Transaction appears in transaction history
- [ ] No errors in blockchain transactions

## 📊 Post-Deployment Monitoring

### First 24 Hours

- [ ] Check logs every few hours
- [ ] Monitor wallet balance
- [ ] Test multiple query types
- [ ] Verify all three services work
- [ ] Check OpenAI API usage

### Ongoing Monitoring

- [ ] Set up daily balance checks
- [ ] Monitor Railway uptime
- [ ] Track query volume
- [ ] Review costs weekly
- [ ] Update documentation as needed

## ⚠️ Important Notes

### Costs to Monitor

Every query can cost:
- **Agent costs:** $0.10-$0.45 USDC (x402 services)
- **GPT-4 costs:** ~$0.01-$0.05 (OpenAI API)
- **Gas fees:** ~$0.01 (Base network)
- **Total:** ~$0.12-$0.51 per query

### Security Reminders

- [ ] Private keys never committed to git
- [ ] Environment variables secured in Railway
- [ ] API keys rotated periodically
- [ ] Wallet balance monitored for unusual activity
- [ ] Logs checked for unauthorized access attempts

### Backup & Recovery

- [ ] Encryption key backed up securely
- [ ] Private keys backed up securely
- [ ] Service URLs documented
- [ ] CDP API keys backed up
- [ ] Recovery procedure documented

## 🐛 Common Issues & Solutions

### Issue: "Unable to get inbox ID"
**Solution:** Verify `XMTP_ENV=production` and run `npm run initialize-production`

### Issue: "Payment failed"
**Solution:** 
- Check wallet has USDC on Base mainnet
- Verify `USE_MAINNET=true`
- Check CDP API keys are correct

### Issue: "Service unavailable"
**Solution:**
- Verify all services are deployed and running
- Check service URLs are correct
- Test service health endpoints

### Issue: High costs
**Solution:**
- Add rate limiting
- Cache frequent queries
- Monitor and limit per-user requests

## 📈 Success Metrics

After 1 week, you should have:

- [ ] 90%+ uptime
- [ ] 0 security incidents
- [ ] Predictable cost per query
- [ ] Fast response times (<30s)
- [ ] Happy users on xmtp.chat

## 🎯 Next Steps After Deployment

1. **Replace Mock Data:**
   - Integrate real CoinGecko API
   - Add LunarCrush/Santiment
   - Connect to The Graph/Dune

2. **Add Features:**
   - Rate limiting per user
   - Query history
   - Cost tracking
   - Analytics dashboard

3. **Optimize:**
   - Cache frequent queries
   - Batch similar requests
   - Dynamic pricing

4. **Scale:**
   - Monitor performance
   - Add more services
   - Increase wallet funding
   - Promote to users

---

**Congratulations on deploying to mainnet!** 🎉

This is production with real money - monitor closely and iterate based on usage patterns.

See **[RAILWAY_MAINNET_SETUP.md](./RAILWAY_MAINNET_SETUP.md)** for detailed troubleshooting and configuration.
