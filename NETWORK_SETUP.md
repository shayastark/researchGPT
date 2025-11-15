# 🌐 XMTP Network Setup Guide

## Understanding XMTP Networks

XMTP has **separate networks** that don't communicate with each other:

- **DEV Network** (`XMTP_ENV=dev`) - For development and testing
- **PRODUCTION Network** (`XMTP_ENV=production`) - For real users

**Important:** An agent on the DEV network CANNOT receive messages from users on the PRODUCTION network!

## 🔍 The Problem You're Facing

**xmtp.chat uses the PRODUCTION network**, but your agent might be on the DEV network.

When someone tries to message your address on xmtp.chat, they get:
```
"Unable to get inbox ID for address. Try again."
```

This happens because your agent hasn't been initialized on the PRODUCTION network yet.

## ✅ Solution: Initialize on Production

### Step 1: Check Which Networks You're On

```bash
npm run check-network
```

This will show you:
```
📊 Summary:
════════════════════════════════════════════════════════════
DEV Network:        ✅ Registered
PRODUCTION Network: ❌ Not registered
════════════════════════════════════════════════════════════
```

### Step 2: Initialize on Production Network

**Before running this, make sure:**
1. You have backed up your `XMTP_DB_ENCRYPTION_KEY` (you provided: `c16cc423a51ee545d6845d3b76526851352d93e7634c7469dbc7fba7bce61212`)
2. You have set your environment variables (see below)

```bash
npm run initialize-production
```

This will:
- Create an XMTP identity on the PRODUCTION network
- Print your agent's address and InboxId
- Make your agent discoverable on xmtp.chat

### Step 3: Update Your Environment

Create a `.env` file with these values:

```env
# XMTP Configuration - MUST BE PRODUCTION for xmtp.chat
XMTP_WALLET_KEY=0x...  # Your wallet private key
XMTP_ENV=production     # CRITICAL: Must be production for xmtp.chat
XMTP_DB_ENCRYPTION_KEY=c16cc423a51ee545d6845d3b76526851352d93e7634c7469dbc7fba7bce61212

# OpenAI
OPENAI_API_KEY=sk-...

# Base Blockchain
PRIVATE_KEY=0x...  # For paying x402 services
BASE_RPC_URL=https://sepolia.base.org
USE_MAINNET=false

# x402 Service Endpoints
MARKET_DATA_SERVICE=http://localhost:3001
SENTIMENT_SERVICE=http://localhost:3002
ONCHAIN_SERVICE=http://localhost:3003
```

### Step 4: Start Your Agent

```bash
# Start services first
npm run services:all

# In a new terminal, start the agent
npm run dev
```

You should see:
```
🤖 XMTP Research Agent Configuration:
   XMTP Network: production  ← MUST say "production"
   Base Network: Base Sepolia (testnet)
   Wallet: 0xce8240B29DA4146Ae1094A977f2F63aC538B8E56

✅ XMTP Research Agent is now online!
📬 Agent Address: 0xce8240B29DA4146Ae1094A977f2F63aC538B8E56
```

### Step 5: Test on xmtp.chat

Now go to **xmtp.chat** and message: `0xce8240B29DA4146Ae1094A977f2F63aC538B8E56`

It should work! 🎉

## 🚀 Railway Deployment

When deploying to Railway, make sure to set:

```
XMTP_ENV=production  ← CRITICAL!
```

All other environment variables should be set as documented.

## 🔧 Troubleshooting

### "Unable to get inbox ID for address"

**Cause:** Agent not initialized on PRODUCTION network
**Fix:** Run `npm run initialize-production`

### "Failed to initialize agent"

**Possible causes:**
1. Missing `XMTP_DB_ENCRYPTION_KEY` - Generate one with `npm run generate-credentials`
2. Invalid `XMTP_WALLET_KEY` - Make sure it's a valid private key with `0x` prefix
3. Permission issues - Make sure the directory is writable

### Agent initializes but no one can message me

**Check:**
1. Is `XMTP_ENV=production`? (Check logs when agent starts)
2. Did you run `npm run initialize-production`?
3. Is the agent currently running? (It must be online to receive messages)

### How do I switch from DEV to PRODUCTION?

Simply change in your `.env`:
```env
XMTP_ENV=production  # Change this line
```

Then restart your agent. Your existing DEV messages won't be lost, but you'll need to initialize on production first.

## 📚 Network Comparison

| Feature | DEV Network | PRODUCTION Network |
|---------|-------------|-------------------|
| Purpose | Testing | Real users |
| xmtp.chat support | ❌ No | ✅ Yes |
| Converse app support | ✅ Yes (dev mode) | ✅ Yes |
| Data persistence | Separate DB | Separate DB |
| Can message between? | ❌ No | ❌ No |

## 💡 Best Practices

1. **Always test on DEV first** before deploying to production
2. **Use same wallet** for both networks (but they'll have separate identities)
3. **Back up encryption key** - It's the same for both networks
4. **Monitor both networks** during transition period
5. **Set Railway to production** - Never deploy to Railway with `XMTP_ENV=dev`

## 🎯 Quick Checklist

For xmtp.chat to work:
- [ ] Agent initialized on PRODUCTION network (`npm run initialize-production`)
- [ ] `XMTP_ENV=production` in environment variables
- [ ] Agent is currently running
- [ ] No firewall blocking connections
- [ ] Correct wallet address being messaged

## 🆘 Still Having Issues?

Run the diagnostics:
```bash
npm run check-network
```

This will tell you exactly which networks your agent is on and what needs to be fixed.
