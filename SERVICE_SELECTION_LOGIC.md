# Service Selection Logic

## How the Agent Distinguishes Between Similar Services

### Problem
When multiple similar services exist (e.g., `api_signals_current` and `evplus_funding_server_signals_bias_optimized`), the agent needs to choose the most appropriate one.

### Solution: Multi-Layer Approach

#### 1. **Enhanced Service Descriptions** (Inference Layer)
The `inferServiceFunction()` method in `x402-bazaar-discovery.ts` now:

- **Extracts specific keywords** from URLs/paths:
  - `current`, `latest`, `now`, `real-time` → "current/latest signals"
  - `bias`, `optimized`, `optimize` → "bias-optimized signals"
  - `sentiment` → "sentiment-based signals"

- **Matches specific patterns first** before generic ones:
  ```typescript
  // Specific patterns (checked first)
  [/signal.*current|current.*signal/i, 'Get current/latest trading signals']
  [/signal.*bias|bias.*signal|bias.*optimized/i, 'Get bias-optimized trading signals']
  
  // Generic pattern (checked last)
  [/signal|sentiment|analysis|trading/i, 'Get trading signals, market sentiment...']
  ```

- **Enhances descriptions with path context**:
  - `https://api.evplus.ai/api/x402/signals/current` → "Get current/latest trading signals"
  - `https://evplus-funding-server.onrender.com/api/x402/signals/bias-optimized` → "Get bias-optimized trading signals"

#### 2. **Complete Tool Descriptions** (Tool Building Layer)
Each tool description includes:
- **Functional description** (from inference)
- **Cost** (e.g., "$0.10 USDC" vs "$0.01 USDC")
- **Metadata** (if available from service provider)
- **Endpoint URL** (for reference)

Example tool descriptions:
```
api_signals_current: 
  "Get current/latest trading signals (crypto/blockchain) | Cost: $0.10 USDC | Endpoint: https://api.evplus.ai/api/x402/signals/current"

evplus_funding_server_signals_bias_optimized:
  "Get bias-optimized trading signals (crypto/blockchain) | Cost: $0.01 USDC | Endpoint: https://evplus-funding-server.onrender.com/api/x402/signals/bias-optimized"
```

#### 3. **AI System Prompt Guidance** (Decision Layer)
The system prompt now includes explicit guidance:

```
**Choosing Between Similar Services**: When multiple similar services exist:
- Prefer more specific services over generic ones
- Match the service type to the query intent:
  * "current/latest signals" for "what's happening now"
  * "bias-optimized signals" for "best trading opportunities"
- If services are equivalent, prefer the cheaper one
- Read the full tool description including cost and endpoint
```

### Example: Trading Signals Query

**User Query:** "Get current trading signals for Base ecosystem tokens"

**Available Services:**
1. `api_signals_current` - "Get current/latest trading signals" ($0.10 USDC)
2. `evplus_funding_server_signals_bias_optimized` - "Get bias-optimized trading signals" ($0.01 USDC)

**Agent Decision Process:**
1. ✅ Query asks for "current" signals → matches `api_signals_current` description
2. ✅ `api_signals_current` is more specific to the query intent
3. ✅ Agent selects `api_signals_current` despite higher cost (specificity > cost)

**User Query:** "What are the best trading opportunities right now?"

**Agent Decision Process:**
1. ✅ Query asks for "best opportunities" → matches "bias-optimized" (optimized for best results)
2. ✅ `evplus_funding_server_signals_bias_optimized` is more specific to the query intent
3. ✅ Agent selects `evplus_funding_server_signals_bias_optimized` (cheaper AND more appropriate)

### Decision Hierarchy

When choosing between similar services, the agent prioritizes:

1. **Specificity** (highest priority)
   - More specific service descriptions match query intent better
   - "current" for real-time queries
   - "bias-optimized" for trading strategy queries
   - "sentiment" for sentiment analysis queries

2. **Query Intent Matching**
   - Match the service type to what the user is asking for
   - Don't use "current" signals for historical analysis
   - Don't use "bias-optimized" for simple data retrieval

3. **Cost** (lowest priority, only when services are equivalent)
   - If two services are truly equivalent, prefer the cheaper one
   - Cost is visible in tool descriptions, so AI can factor it in

### Testing

To verify the agent chooses correctly:

1. **Test Current Signals:**
   ```
   "Get current trading signals for Base ecosystem tokens"
   ```
   Expected: `api_signals_current` (matches "current")

2. **Test Optimized Signals:**
   ```
   "What are the best trading opportunities with optimized signals?"
   ```
   Expected: `evplus_funding_server_signals_bias_optimized` (matches "optimized")

3. **Test Generic Signals:**
   ```
   "Get trading signals"
   ```
   Expected: Either service (but likely the cheaper one: `evplus_funding_server_signals_bias_optimized`)

### Future Improvements

1. **Service Metadata**: If services provide rich metadata (name, description, tags), use that instead of URL inference
2. **Usage History**: Track which services work best for which query types
3. **Cost-Aware Selection**: Add explicit cost comparison in system prompt for equivalent services
4. **Service Quality Metrics**: Track success rates, data quality, response times

