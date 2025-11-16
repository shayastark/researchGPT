# CDP x402 Bazaar Integration Guide

This agent now uses the **CDP x402 Bazaar** for dynamic service discovery instead of hardcoded endpoints or Locus.

## What Changed

### ✅ New Components

1. **`src/lib/x402-bazaar-discovery.ts`** - Bazaar discovery client
   - Fetches available x402 services from CDP Bazaar API
   - Filters services by price, network, and asset
   - Provides utility functions for service metadata

2. **`src/lib/x402-client.ts`** - Enhanced x402 payment client
   - Added `callWithPaymentInfo()` method for pre-payment flow
   - Works with both 402-response and Bazaar discovery formats
   - Supports dynamic payment based on discovered service info

3. **`src/agent/index-bazaar.ts`** - Main agent with Bazaar discovery
   - Dynamically discovers services on startup
   - Builds Claude tools from discovered services
   - Automatically handles x402 payments using discovered payment info

4. **`scripts/test-bazaar-discovery.ts`** - Test script
   - Validates Bazaar API connectivity
   - Tests filtering and service discovery
   - Useful for debugging

### 📊 Test Results

The Bazaar discovery is working! Here's what we found:

```
✅ Found 100 total services in Bazaar
✅ Found 62 services under $1 USDC on Base Mainnet
✅ Services include:
   - Token analysis ($0.01 USDC)
   - Trading signals ($0.10 USDC)
   - API pings ($0.001 USDC)
   - Token lookups ($0.10-$1.00 USDC)
```

## How to Use

### 1. Test Discovery (No Agent)

Test the Bazaar discovery without running the full agent:

```bash
npm run test-bazaar
```

This will:
- Fetch all services from Bazaar
- Show affordable services under $1 USDC
- Display service details (price, endpoint, method)

### 2. Run the Agent with Bazaar Discovery

**Development mode:**
```bash
npm run dev
# or
npm run bazaar
```

**Production mode:**
```bash
npm run build
npm start
# or
npm run bazaar:build
```

### 3. Environment Variables

Required:
```bash
XMTP_WALLET_KEY=your_xmtp_private_key
ANTHROPIC_API_KEY=your_anthropic_api_key
PAYMENT_PRIVATE_KEY=your_payment_wallet_private_key
```

Optional (with defaults):
```bash
# Maximum price for discovered services (default: $1.00 USDC)
MAX_SERVICE_PRICE_USDC=1.0

# Use Base Mainnet (default: true for Bazaar)
USE_MAINNET=true

# XMTP network (production = users can message you on xmtp.chat)
XMTP_ENV=production

# Base RPC URL
BASE_RPC_URL=https://mainnet.base.org
```

### 4. How It Works

1. **Agent Startup:**
   - Connects to CDP Bazaar API
   - Fetches all x402-compatible services
   - Filters by max price and network (Base)
   - Discovers 60+ services automatically

2. **User Message:**
   - User sends query via XMTP
   - Agent uses Claude with dynamically-built tools
   - Claude selects appropriate discovered service

3. **x402 Payment:**
   - Agent pays using discovered payment requirements
   - Makes ERC-20 USDC transfer on Base
   - Waits for confirmation
   - Calls API with payment proof

4. **Response:**
   - Receives data from paid API
   - Claude synthesizes response
   - Sends back to user via XMTP

## Architecture

```
┌─────────────┐
│   User      │
│  (XMTP)     │
└──────┬──────┘
       │
       v
┌──────────────────────────────────────┐
│  XMTP Agent (index-bazaar.ts)        │
│  ┌────────────────────────────────┐  │
│  │  1. Discover Services          │  │
│  │     (X402BazaarClient)         │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  2. Build Dynamic Tools        │  │
│  │     (from discovered services) │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  3. Claude Decides Which Tool  │  │
│  │     (Anthropic API)            │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  4. Pay & Call Service         │  │
│  │     (X402Client)               │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
       │
       v
┌──────────────────────┐
│  CDP x402 Bazaar API │
│  (Discovery Layer)   │
└──────────────────────┘
       │
       v
┌──────────────────────┐
│  x402 Services       │
│  (60+ endpoints)     │
└──────────────────────┘
       │
       v
┌──────────────────────┐
│  Base Blockchain     │
│  (USDC Payments)     │
└──────────────────────┘
```

## Key Benefits vs Locus

✅ **Official CDP Integration** - Uses Coinbase's official Bazaar API  
✅ **60+ Services** - Access to all x402-compatible endpoints  
✅ **Dynamic Discovery** - No hardcoded endpoints  
✅ **Price Filtering** - Only use services within your budget  
✅ **Automatic Updates** - New services appear automatically  
✅ **Simple Setup** - Just one API endpoint  

## Troubleshooting

### No services discovered

Check `MAX_SERVICE_PRICE_USDC`:
```bash
# Increase the max price
MAX_SERVICE_PRICE_USDC=5.0 npm run dev
```

### Wrong network (testnet vs mainnet)

Most Bazaar services are on Base Mainnet:
```bash
USE_MAINNET=true npm run dev
```

### Payment failures

Ensure your payment wallet has USDC on Base Mainnet:
- USDC Contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Get USDC: Bridge from Ethereum or buy on Base

### Check health

```bash
curl http://localhost:3000/health
curl http://localhost:3000/status
```

## Example Usage

Once the agent is running, message it on XMTP:

```
"What are some promising tokens to watch?"
→ Agent discovers token analysis service ($0.01)
→ Pays and calls the service
→ Returns curated token recommendations

"Get me trading signals"
→ Agent uses trading signals service ($0.10)
→ Returns market signals and trends
```

## Scripts Reference

```bash
npm run dev              # Run agent with Bazaar (development)
npm run start            # Run agent with Bazaar (production)
npm run bazaar           # Same as dev
npm run bazaar:build     # Build and run production

npm run test-bazaar      # Test discovery without running agent

npm run demo             # Old: Hardcoded endpoints
npm run locus            # Old: Locus integration (deprecated)
```

## What's Next?

The agent is ready to use! It will:
1. Automatically discover 60+ x402 services on startup
2. Filter to services under $1 USDC (or your custom limit)
3. Let Claude intelligently choose the right service
4. Handle payments and API calls automatically

**You're all set!** 🚀

## Need Help?

- Check service status: `npm run test-bazaar`
- View discovered tools: Check `/status` endpoint
- Increase budget: Set `MAX_SERVICE_PRICE_USDC` higher
- Test a service manually: Use `X402Client.callWithPaymentInfo()`
