# Test Messages for Your XMTP Agent

Based on the services your agent has access to via the x402 Bazaar, here are test messages organized by service type.

## 🌤️ Weather Services

**Note:** The weather API at `api.settleonbase.xyz` appears to be broken (only returns payment confirmation). Try these but expect it may not work:

- "What's the weather in New York today?"
- "Get me the weather forecast for London"
- "What's the weather like in Tokyo right now?"

---

## 📈 Trading Signals & Market Analysis

These should work well - your agent has access to several signal services:

- "Get me trading signals for Bitcoin"
- "What's the current sentiment on Ethereum?"
- "Fetch sentiment analysis for $BNKR"
- "Get me trading signals for Solana"
- "What's the market sentiment on crypto today?"
- "Get bias-optimized trading signals"

**Services available:**
- `api_signals_current` - $0.10 USDC
- `evplus_funding_server_signals_bias_optimized` - $0.01 USDC
- `api_signals` (from earlier logs) - $0.10 USDC

---

## 🖼️ Image Generation

- "Generate an image of a futuristic city"
- "Create a picture of a robot in space"
- "Make an image of a sunset over mountains"
- "Generate an image of a cat wearing sunglasses"

**Service:** `api_v1_images_generate` - $0.006955 USDC

---

## 🎬 Video Generation (Sora)

- "Create a video of a cat playing piano"
- "Generate a video of waves crashing on a beach"
- "Make a video of a city at night with neon lights"
- "Create a video of a robot dancing"

**Services:**
- `genbase_video_create_sora2` - $0.20 USDC
- `genbase_video_create` - $0.20 USDC

---

## 🔍 Search & Information

- "Search for information about Base blockchain"
- "Find me data about Ethereum"
- "Look up information about DeFi"

**Services:**
- `gg402_search` - $0.01 USDC
- `staging_tool_exa_crawling` - $0.05 USDC (URL crawling/extraction)

---

## 📱 Social Media / Twitter

- "Get Twitter insights for @canza_io"
- "Find smart mentions feed for crypto"
- "Get Twitter data about Bitcoin"

**Services:**
- `flip_coin_eta_twitter_canza_io` - $0.10 USDC
- `mesh_agents_MoniTwitterInsightAgent_get_smart_mentions_feed` - $0.01 USDC

---

## 💰 Financial & Trading

- "Find arbitrage opportunities"
- "Get Kalshi prediction market categories"
- "Show me arbitrage opportunities in crypto"

**Services:**
- `arb_opportunities` - $0.50 USDC
- `polymarketeer_kalshi_categories` - $0.01 USDC

---

## 🔐 Wallet & Blockchain

- "Check wallet reputation for 0x1234..."
- "Get wallet information"
- "Analyze this wallet address: 0x..."

**Services:**
- `slamai_wallet_reputation_full` - $0.001 USDC

---

## 🎨 Utility Services

### QR Codes
- "Generate a QR code for https://example.com"
- "Create a QR code"

**Service:** `xluihnzwcmxybtygewvy_functions_v1_qr_code_generator` - $0.01 USDC

### Email Validation
- "Validate this email: test@example.com"
- "Check if this email is valid: user@domain.com"

**Service:** `xluihnzwcmxybtygewvy_functions_v1_email_validator` - $0.01 USDC

### GIF Search
- "Search for a GIF of a cat"
- "Find a GIF of dancing"
- "Get me a GIF of celebration"

**Service:** `gifu_server_search_gif` - $0.05 USDC

### URL Metadata Extraction
- "Extract metadata from https://example.com"
- "Get information about this URL: https://..."

**Service:** `minifetch_v1_extract_url_metadata` - $0.01 USDC

---

## 🛠️ Development & Tools

### Script Generation
- "Generate a script for me"
- "Create a premium script"

**Service:** `script_generator_agent_premium_script` - $0.01 USDC

### Data Conversion
- "Convert this data"
- "Transform this information"

**Service:** `cnvrt_convert` - $0.01 USDC

---

## 🎯 Recommended Test Sequence

Start with services that are most likely to work:

1. **Trading Signals** (most reliable):
   ```
   "Get me trading signals for Bitcoin"
   ```

2. **Image Generation** (should work):
   ```
   "Generate an image of a futuristic city"
   ```

3. **Wallet Reputation** (cheap, should work):
   ```
   "Check wallet reputation for 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
   ```

4. **QR Code** (simple, should work):
   ```
   "Generate a QR code for https://base.org"
   ```

5. **Email Validation** (simple, should work):
   ```
   "Validate this email: test@example.com"
   ```

6. **GIF Search** (fun, should work):
   ```
   "Search for a GIF of a cat"
   ```

---

## ⚠️ Services That May Not Work

Based on testing, these services may have issues:

- **Weather API** (`api.settleonbase.xyz/api/weather`) - Only returns payment confirmation, no actual data
- Some services may be broken or not fully implemented

---

## 💡 Tips for Testing

1. **Start with cheap services** ($0.01 USDC) to test the flow
2. **Check the logs** to see:
   - Which service was selected
   - What data was returned
   - If extraction worked correctly
3. **Try different phrasings** - The AI might interpret requests differently
4. **Watch for the new logging**:
   - `📊 Response structure:` - Shows what API returned
   - `🔍 Extracting data from...` - Shows data extraction
   - `⚠️ WARNING:` - Shows if API is broken

---

## 📊 Expected Log Output

When a service works correctly, you should see:

```
🔧 Tool: api_signals_current
   Input: {"query":"Bitcoin"}
💰 Executing discovered service via x402:
   📊 Response structure: { type: 'object', keys: ['data', 'signals'], ... }
   🔍 Extracting data from 'data' field
   ✅ Data received successfully
```

When a service is broken:

```
⚠️  Response appears to be payment confirmation only
⚠️  WARNING: Response contains only payment confirmation, no data fields found!
⚠️  The API appears to be broken or not implemented correctly.
```

---

## 🎯 Best Services to Test First

Based on reliability and cost:

1. **Wallet Reputation** - $0.001 USDC (cheapest!)
2. **Email Validator** - $0.01 USDC (simple, should work)
3. **QR Code Generator** - $0.01 USDC (simple, should work)
4. **Trading Signals** - $0.10 USDC (more expensive but likely to work)
5. **Image Generation** - $0.007 USDC (very cheap, should work)

Start with these to verify the payment flow and data extraction are working!

