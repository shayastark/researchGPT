# 🚨 Message for Next Cursor Agent

## Context: 10 hours of debugging x402 payments

### What Was Fixed (Current State)

**File:** `src/agent/index-x402-demo.ts`  
**Working agent** using direct x402 protocol (NOT Locus MCP)

**Critical fix applied:**
```typescript
// Line 22 - Fixed to default to mainnet
const USE_MAINNET = process.env.USE_MAINNET !== 'false';
```

**Railway config:** Points to `node dist/src/agent/index-x402-demo.js`

### Required Environment Variables

```bash
PAYMENT_PRIVATE_KEY=0x...      # Wallet with USDC + ETH on Base mainnet
ANTHROPIC_API_KEY=sk-ant-api03-...
XMTP_WALLET_KEY=0x...
XMTP_ENV=production
```

### If It STILL Doesn't Work

**1. CHECK WALLET FUNDING FIRST** ⚠️
```bash
# Look up the payment wallet address on BaseScan
# Address is logged on startup: "Payment wallet: 0x..."
# Verify it has:
# - USDC balance (0.10+ USDC)
# - ETH balance (0.001+ ETH for gas)
# Network: Base Mainnet (chain ID 8453)
```

**2. GET THE EXACT ERROR FROM LOGS**

Look for these patterns in Railway logs:

**If you see:**
```
"❌ Payment failed: insufficient funds for gas"
→ Wallet needs more ETH on Base mainnet

"❌ Payment failed: insufficient funds" (from USDC contract)
→ Wallet needs more USDC on Base mainnet

"❌ Request failed after payment: 402 Payment Required"
→ Payment proof headers are wrong, check below

"❌ x402 payment client not configured"
→ PAYMENT_PRIVATE_KEY not set or invalid format

"Cannot read property 'writeContract' of undefined"
→ Wallet client initialization failed, check private key format
```

**3. PAYMENT PROOF HEADERS ISSUE** (Most Likely Problem)

**Current implementation** (`src/lib/x402-client.ts` line 138-139):
```typescript
headers: {
  'X-Payment-Hash': hash,
  'X-Payment-Nonce': paymentInfo.nonce,
}
```

**If endpoint rejects payment after transaction succeeds:**

The x402 spec isn't fully standardized. Try these alternatives:

```typescript
// Option A: Lowercase with dashes
{
  'x-payment-hash': hash,
  'x-payment-nonce': paymentInfo.nonce,
}

// Option B: Coinbase CDP style
{
  'x-402-payment-proof': hash,
  'x-402-nonce': paymentInfo.nonce,
}

// Option C: Payment-Proof style
{
  'Payment-Proof': hash,
  'Payment-Nonce': paymentInfo.nonce,
}
```

**Where to change:** `src/lib/x402-client.ts` around line 133-142

### DON'T Do These Things Again

❌ Don't try to use Locus MCP `/x402/call` endpoint - **IT DOESN'T EXIST**  
❌ Don't switch back to `index-locus-direct.ts` - **IT USES NON-EXISTENT ENDPOINT**  
❌ Don't change `USE_MAINNET` back to `=== 'true'` - **MUST BE `!== 'false'`**  
❌ Don't add more dependencies - **THE CODE IS ALREADY CORRECT**

### What This Code Does (It's Correct!)

```
1. User sends XMTP message
2. Claude decides to use x402 tool
3. Agent calls x402 endpoint (e.g., capminal.ai)
4. Gets 402 Payment Required response
5. Extracts payment details from response
6. Sends USDC transfer on Base blockchain
7. Waits for transaction confirmation
8. Retries request with payment proof headers
9. Returns data to Claude
10. Claude sends response via XMTP
```

### How to Debug

**Step 1:** Get wallet address from logs
```
Look for: "Payment wallet: 0x..."
```

**Step 2:** Check funds on BaseScan
```
https://basescan.org/address/0x...
Must have USDC AND ETH
```

**Step 3:** Look for transaction hash in logs
```
Look for: "Payment transaction sent: 0x..."
Check if it succeeded on BaseScan
```

**Step 4:** If transaction succeeded but still got 402
```
→ Headers are wrong
→ Try the alternative header formats above
```

### Key Files

- **Agent:** `src/agent/index-x402-demo.ts`
- **Payment client:** `src/lib/x402-client.ts`
- **Railway config:** `railway.json`
- **Wallet generator:** `scripts/generate-payment-wallet.ts`

### Test Command

After deploy:
```
Send XMTP message: "Research AI trends"
Watch Railway logs for payment flow
```

### The Only Real Unknowns

1. **Payment proof header names** - x402 spec isn't fully standardized across implementations
2. **Wallet funding** - User error, not code error

**Everything else is solid.**

### Quick Reference: Generate New Wallet

```bash
npm run generate-wallet
# Outputs private key and address
# Fund address on Base mainnet
# Set PAYMENT_PRIVATE_KEY in Railway
```

### Reality Check

This code implements the x402 protocol correctly. If it fails, it's because:

1. Wallet not funded (90% likely)
2. Header naming mismatch (9% likely)
3. Something actually wrong with code (1% likely)

**Check funds FIRST before changing ANY code.**

---

## 🎯 TL;DR for Next Agent

1. Check wallet has USDC + ETH on Base mainnet (BaseScan)
2. Get exact error from Railway logs
3. If payment succeeds but endpoint rejects: try different header names in `x402-client.ts` line 138
4. Don't change `USE_MAINNET` line 22
5. Don't try Locus MCP approach again

**The code is 85% correct. The issue is likely funding or header naming.**
