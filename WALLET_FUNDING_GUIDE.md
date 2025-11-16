# Wallet Funding Guide

## Issue Summary

Your x402 agent is calculating costs **correctly** but failing because the payment wallet is **empty**.

### The Cost Calculation is Correct ✅

- **Amount being charged:** 10,000 atomic units
- **USDC has 6 decimals:** 10,000 ÷ 1,000,000 = **0.01 USDC = $0.01 USD**
- This matches your expectation perfectly!

### The Real Problem: Empty Wallet ❌

Your payment wallet `0x7A53b92d25e652Ccb1e3Ff0194399d7a21528fbE` has:
- **ETH Balance:** 0 ETH (needed for gas fees)
- **USDC Balance:** 0 USDC (needed for service payments)

## Why Both Are Needed

When making x402 payments, you need:

1. **USDC** - To pay for the actual service ($0.01 per call in your case)
2. **ETH** - To pay for blockchain gas fees (estimated $0.10-$0.50 per transaction)

Without **both** of these, the transaction will fail with "insufficient funds for transfer".

## How to Fix

### Option 1: Fund Your Wallet (Recommended)

Send funds to your payment wallet on **Base Mainnet**:

**Wallet Address:** `0x7A53b92d25e652Ccb1e3Ff0194399d7a21528fbE`

**Recommended Amounts:**
- **ETH:** At least 0.01 ETH (for ~20-100 transactions worth of gas)
- **USDC:** At least 0.1 USDC (for 10 service calls)

**USDC Contract Address (Base Mainnet):**
`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

### Option 2: Use Base Sepolia Testnet

If you're testing, consider using Base Sepolia testnet instead:

1. Set `USE_MAINNET=false` in your environment
2. Get testnet ETH from Base Sepolia faucet
3. Get testnet USDC from [CDP Faucet](https://portal.cdp.coinbase.com/products/faucet)

## Improvements Made

I've added better error handling to help prevent this confusion:

### 1. Balance Checking Before Payment

The agent now checks wallet balances **before** attempting to make a payment, providing clear error messages:

```
❌ Insufficient funds:
   ETH Balance: 0 ETH (need: ~0.001 ETH for gas)
   USDC Balance: 0 USDC (need: 0.01 USDC)
   Wallet: 0x7A53b92d25e652Ccb1e3Ff0194399d7a21528fbE
```

### 2. Startup Balance Check

The agent now checks wallet balances when it starts up and warns you if funding is needed.

### 3. Balance Check Script

Use the new script to check your wallet at any time:

```bash
# Check your payment wallet
npx tsx scripts/check-wallet-balance.ts

# Or check any address
npx tsx scripts/check-address-balance.ts 0x7A53b92d25e652Ccb1e3Ff0194399d7a21528fbE
```

## Quick Start After Funding

Once you've funded your wallet:

1. Restart your agent
2. You should see: `✅ Wallet is funded and ready for payments`
3. Try your x402 payment again - it should work now!

## Cost Breakdown Example

For a typical x402 service call:
- **Service Cost:** $0.01 USDC (sent to service provider)
- **Gas Cost:** ~$0.10-0.50 in ETH (sent to Base network validators)
- **Total:** ~$0.11-0.51 per call

With 0.01 ETH (~$30) and 0.1 USDC ($0.10), you can make:
- ~60-300 service calls before needing to refill ETH
- ~10 service calls before needing to refill USDC

## Verification

After funding, verify your wallet has sufficient balance:

```bash
npx tsx scripts/check-address-balance.ts 0x7A53b92d25e652Ccb1e3Ff0194399d7a21528fbE
```

You should see:
```
✅ Your wallet is funded and ready to make x402 payments!
```

## Support

If you continue to see funding issues after adding ETH and USDC:

1. Verify you're on the correct network (Base Mainnet)
2. Check the transaction succeeded on [BaseScan](https://basescan.org/address/0x7A53b92d25e652Ccb1e3Ff0194399d7a21528fbE)
3. Ensure you sent USDC (not USD or another token)
4. Run the balance check script to verify
