# 🚀 QUICK FIX - Locus 404 Error Resolved

## ⚡ TL;DR

The `/x402/call` endpoint doesn't exist on Locus. I've switched your agent to **direct x402 payments** which actually work.

## 🎯 What You Need to Do

### 1. Generate a Payment Wallet (if you don't have one)

```bash
npm run generate-wallet
```

This will output:
- Private Key: `0x...` (keep secret!)
- Address: `0x...` (fund this)

### 2. Fund Your Wallet

Send to the address from step 1:
- **USDC on Base**: 1-10 USDC for testing
- **ETH on Base**: 0.001-0.01 ETH for gas

Bridge at: https://bridge.base.org

### 3. Update Railway Environment Variables

**Add this:**
```
PAYMENT_PRIVATE_KEY=0x...  # from step 1
```

**Keep these:**
```
ANTHROPIC_API_KEY=sk-ant-api03-...
XMTP_WALLET_KEY=0x...
XMTP_ENV=production
XMTP_DB_ENCRYPTION_KEY=...
```

**Remove (not needed anymore):**
```
LOCUS_API_KEY=...  # not used
```

### 4. Deploy

```bash
git add .
git commit -m "Fix: Switch to direct x402 payments"
git push
```

## ✅ Test It

Send via XMTP: **"Research the latest AI trends"**

You should see:
```
💰 Executing x402 payment call
💳 Making USDC payment...
✅ Payment successful!
✅ Data received via x402 protocol
```

## 📊 Costs

- **x402 API calls**: ~0.10 USDC each
- **Gas fees**: ~0.0001 ETH each

For 10 test queries: ~1 USDC + ~0.001 ETH

## 🔧 Files Changed

- `railway.json` - Points to working agent
- `FIX_LOCUS_404_ERROR.md` - Full explanation
- `scripts/generate-payment-wallet.ts` - Wallet generator

## ❓ Need Help?

See `FIX_LOCUS_404_ERROR.md` for:
- Detailed explanation
- Troubleshooting
- FAQ

---

**That's it! Your agent will work once you:**
1. Generate wallet
2. Fund it
3. Set `PAYMENT_PRIVATE_KEY`
4. Deploy

🎉 **Ready to go!**
