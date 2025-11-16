# Railway Environment Variables for CDP Bazaar Agent

## 🔴 Required Variables

These **MUST** be set in Railway:

```bash
# XMTP Agent Identity
XMTP_WALLET_KEY=0xYourXMTPPrivateKey

# AI Provider
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Payment Wallet (needs USDC on Base Mainnet)
PAYMENT_PRIVATE_KEY=0xYourPaymentWalletPrivateKey
```

## 🟡 Recommended Variables

Set these for production use:

```bash
# XMTP Network (IMPORTANT: use 'production' so users can message you on xmtp.chat)
XMTP_ENV=production

# Database Encryption (optional but recommended for security)
XMTP_DB_ENCRYPTION_KEY=your_32_byte_hex_key

# Use Base Mainnet (required for Bazaar - most services are on mainnet)
USE_MAINNET=true

# Maximum price per API call (default: $1.00 USDC)
MAX_SERVICE_PRICE_USDC=1.0
```

## 🟢 Optional Variables

These have sensible defaults:

```bash
# Base RPC URL (defaults to public mainnet RPC)
BASE_RPC_URL=https://mainnet.base.org

# Or use a premium RPC for better performance:
# BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

## 🔵 Railway Auto-Set Variables

Railway automatically sets these - **DO NOT SET MANUALLY**:

```bash
PORT=<auto>                          # Railway sets this for health checks
RAILWAY_VOLUME_MOUNT_PATH=<auto>    # Set if you have a volume configured
```

## ❌ Variables You Can REMOVE

These were for Locus and are no longer needed:

```bash
# REMOVED - No longer needed with CDP Bazaar:
LOCUS_API_URL
LOCUS_API_KEY
MCP_SERVER_URL
```

## 📋 Complete Railway Setup Checklist

### Step 1: Set Required Variables
```
✅ XMTP_WALLET_KEY
✅ ANTHROPIC_API_KEY
✅ PAYMENT_PRIVATE_KEY
```

### Step 2: Set Recommended Variables
```
✅ XMTP_ENV=production
✅ USE_MAINNET=true
✅ MAX_SERVICE_PRICE_USDC=1.0
```

### Step 3: Optional - Add Encryption Key
```
⭕ XMTP_DB_ENCRYPTION_KEY (generate with: openssl rand -hex 32)
```

### Step 4: Optional - Premium RPC
```
⭕ BASE_RPC_URL (if using Alchemy/Infura/QuickNode)
```

## 🔑 How to Generate Keys

### XMTP Wallet Key
If you need a new one:
```bash
npm run generate-credentials
```

### Payment Wallet Key
If you need a new one:
```bash
npm run generate-wallet
```

### Database Encryption Key
```bash
openssl rand -hex 32
```

## 💰 Fund Your Payment Wallet

Your payment wallet needs USDC on Base Mainnet:

1. **Get wallet address:**
   - Your `PAYMENT_PRIVATE_KEY` corresponds to a wallet address
   - Check it at: https://basescan.org

2. **Get USDC on Base:**
   - Bridge from Ethereum: https://bridge.base.org
   - Buy on Base: Use Coinbase, Uniswap, or other DEX
   - USDC Contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

3. **How much USDC?**
   - With `MAX_SERVICE_PRICE_USDC=1.0`, each API call costs up to $1
   - Start with $10-20 USDC for testing
   - Monitor usage via `/status` endpoint

## 🚀 Deployment Command

In Railway, set the start command to:

```bash
npm run start
```

Or for development/testing:
```bash
npm run dev
```

## 🔍 Verify Your Setup

After deployment, check these endpoints:

```bash
# Health check
https://your-app.railway.app/health

# Full status (shows discovered services)
https://your-app.railway.app/status
```

The `/status` endpoint will show:
- ✅ Number of discovered services
- ✅ Payment wallet address
- ✅ XMTP agent address
- ✅ List of available tools with prices

## 📊 Example Railway Variables Screenshot

```
Variable Name              | Value
---------------------------|----------------------------------
XMTP_WALLET_KEY           | 0x1234...
ANTHROPIC_API_KEY         | sk-ant-api03-...
PAYMENT_PRIVATE_KEY       | 0x5678...
XMTP_ENV                  | production
USE_MAINNET               | true
MAX_SERVICE_PRICE_USDC    | 1.0
XMTP_DB_ENCRYPTION_KEY    | a1b2c3d4...
```

## ⚠️ Important Notes

1. **USE_MAINNET=true** is critical - most Bazaar services are on Base Mainnet
2. **XMTP_ENV=production** is needed for users to message you on xmtp.chat
3. **MAX_SERVICE_PRICE_USDC** controls your spending - start low!
4. **PAYMENT_PRIVATE_KEY** needs USDC on Base Mainnet to work
5. Keep all private keys secret - never commit to git

## 🆘 Troubleshooting

### "No services discovered"
- Check `USE_MAINNET=true`
- Try increasing `MAX_SERVICE_PRICE_USDC`

### "Payment failed"
- Ensure wallet has USDC on Base Mainnet
- Check wallet address has funds: https://basescan.org

### "XMTP connection failed"
- Verify `XMTP_WALLET_KEY` is valid hex
- Check `XMTP_ENV=production` for xmtp.chat compatibility

### "x402 payments failing"
- Ensure `USE_MAINNET=true`
- Verify USDC balance on Base Mainnet
- Check RPC URL is responding

---

**You're all set!** These are the only variables you need for the CDP Bazaar integration. Much simpler than Locus! 🎉
