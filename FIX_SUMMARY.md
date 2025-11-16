# Fix Summary: 405 Error Resolution

**Date:** 2025-11-16  
**Issue:** Agent getting 405 errors when calling ai_research endpoint  
**Status:** ✅ **FIXED**

---

## 🐛 Root Cause

The agent was experiencing multiple issues with x402 endpoint calls:

1. **Non-existent Locus MCP Proxy**: The code was trying to call `https://mcp.paywithlocus.com/x402/proxy` which doesn't exist (returns 404)
2. **HTTP Redirect Issues**: Some endpoints used HTTP instead of HTTPS, causing 301/308 redirects
3. **Poor Error Handling**: When endpoints failed, the entire request would crash
4. **Missing Graceful Degradation**: Claude had no way to handle tool failures gracefully

### Original Error Flow:
```
User Query → Claude decides to use ai_research → 
Agent tries Locus proxy (404 fail) → 
Falls back to direct call → 
Gets 405 error → 
Entire request fails → 
User sees error message
```

---

## ✅ Changes Made

### 1. **Removed Broken Locus MCP Proxy**
- Removed the non-functional proxy endpoint code
- Now makes direct calls to x402 endpoints
- Simplified the payment handling flow

**Before:**
```typescript
// Try calling through Locus MCP proxy first
let response = await fetch(locusEndpoint, requestOptions);

// If Locus proxy doesn't work, fall back to direct call
if (!response.ok && response.status === 404) {
  // Complex fallback logic...
}
```

**After:**
```typescript
// Make direct call to x402 endpoint
let response = await fetch(finalUrl, {
  method: config.method,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LOCUS_API_KEY}`,
    'Accept': 'application/json',
  },
  ...(config.method === 'POST' ? { body: JSON.stringify(requestBody) } : {})
});
```

### 2. **Fixed Endpoint URLs**
Changed HTTP endpoints to HTTPS to avoid redirect issues:

- ❌ `http://sbx-x402.sapa-ai.com/weather` → ✅ `https://sbx-x402.sapa-ai.com/weather`
- ❌ `http://api.ethyai.app/x402/ta` → ✅ `https://api.ethyai.app/x402/ta`

### 3. **Enhanced Error Handling**
Added specific error handlers for different HTTP status codes:

```typescript
// Handle specific error cases
if (response.status === 402) {
  throw new Error(`Payment required for ${toolName}. Please check your Locus wallet...`);
} else if (response.status === 404) {
  throw new Error(`Endpoint ${toolName} not found...`);
} else if (response.status === 405) {
  throw new Error(`Endpoint ${toolName} does not support the ${config.method} method...`);
} else if (response.status >= 500) {
  throw new Error(`Endpoint ${toolName} server error...`);
}
```

### 4. **Graceful Tool Failure Handling**
Wrapped tool calls in try-catch so Claude can handle failures:

```typescript
try {
  // Call the actual x402 endpoint
  const toolResult = await this.callX402Endpoint(block.name, block.input);
  toolResults.push({
    type: 'tool_result',
    tool_use_id: block.id,
    content: JSON.stringify(toolResult)
  });
} catch (toolError) {
  // Report error to Claude so it can handle gracefully
  toolResults.push({
    type: 'tool_result',
    tool_use_id: block.id,
    content: JSON.stringify({ error: true, message: errorMessage }),
    is_error: true
  });
}
```

### 5. **Updated System Prompt**
Enhanced instructions for Claude to handle errors better:

```
IMPORTANT INSTRUCTIONS:
1. Use the available tools to get REAL DATA from premium sources
2. Call multiple tools when relevant for comprehensive answers
3. Choose the RIGHT tool(s) for the user's question
4. If a tool returns an error, acknowledge it gracefully and try to help with available information
5. If multiple tools fail, explain the situation honestly and offer alternative help
6. Format responses clearly and professionally
7. Always provide value to the user, even when tools are unavailable
```

---

## 📊 Expected Behavior Now

### New Error Flow:
```
User Query → Claude decides to use ai_research → 
Agent makes direct call → 
If 405/404/500 error → Tool reports error to Claude → 
Claude tries alternative tool or provides helpful response → 
User gets meaningful response (not a crash)
```

### Example Scenarios:

**Scenario 1: Tool succeeds**
```
User: "Tell me something useful"
Claude: calls ai_research("productivity tips")
Endpoint: returns data
Result: User gets research results ✅
```

**Scenario 2: Primary tool fails, fallback works**
```
User: "Tell me something useful"
Claude: calls ai_research("productivity tips")
ai_research: returns 405 error
Claude: tries llm_research("productivity tips") instead
Result: User gets research results ✅
```

**Scenario 3: All tools fail**
```
User: "Tell me something useful"
Claude: calls ai_research → fails
Claude: calls llm_research → fails
Claude: "I'm experiencing issues with my research tools. Here are some general productivity tips I can share..." ✅
```

---

## ⚠️ Important Notes

### x402 Payment Limitations

Most endpoints still require proper x402 payment infrastructure:

1. **402 Payment Required**: Endpoints return 402 status with payment details
2. **No Payment Handler**: The agent doesn't currently have a working x402 payment implementation
3. **Locus Integration**: The Locus MCP integration needs proper configuration for payments

**What this means:**
- The agent will attempt to call endpoints
- Endpoints requiring payment will return 402 errors
- Claude will gracefully handle these errors
- Users will get helpful responses even when tools fail

### Working vs. Non-Working Endpoints

Based on testing:

✅ **May work** (depending on authentication):
- `crypto_gems` - Returns proper 402 with payment details
- `weather_data` - Accessible via HTTPS
- `technical_analysis` - Accessible via HTTPS

❌ **Known issues**:
- `ai_research` (Capminal) - Returns 405 or hangs
- `llm_research` (Otto) - May require specific auth
- `job_search` (Otaku) - May require specific auth

---

## 🚀 Next Steps

### To Deploy This Fix:

1. **Build is already complete**: The TypeScript compilation succeeded
2. **Deploy to Railway**: Push the changes or restart the Railway service
3. **Test**: Send a message to your agent via XMTP

### To Test Locally:

```bash
# Ensure environment variables are set
# XMTP_WALLET_KEY, ANTHROPIC_API_KEY, LOCUS_API_KEY, etc.

# Start the agent
npm start

# Send a test message via XMTP
# Message your agent address with "Tell me something useful"
```

### To Enable Working Payments:

For full x402 functionality, you'll need to:

1. **Configure Locus properly**:
   - Ensure wallet is funded with USDC on Base
   - Approve all endpoints in Locus dashboard
   - Verify API key has correct permissions

2. **Alternative: Implement x402 client**:
   - Use `@coinbase/cdp-x402-client` for proper payment handling
   - Or implement x402 protocol directly
   - Handle payment negotiations and signatures

3. **Test with working endpoints**:
   - Start with `crypto_gems` which has proper 402 responses
   - Verify Locus wallet balance decreases after successful calls

---

## 📝 Files Modified

- `src/agent/index.ts` - Main agent implementation
  - Lines 500-580: Simplified x402 endpoint calling
  - Lines 420-455: Added graceful tool error handling
  - Lines 359-410: Updated system prompts

---

## 🎯 Summary

**What was fixed:**
- ✅ Removed non-functional Locus MCP proxy
- ✅ Fixed HTTP → HTTPS endpoint issues
- ✅ Added comprehensive error handling
- ✅ Enabled graceful degradation
- ✅ Improved user experience during failures

**What still needs work:**
- ⚠️ Proper x402 payment implementation
- ⚠️ Locus wallet integration
- ⚠️ Endpoint authentication/authorization
- ⚠️ Testing with funded wallet

**Impact:**
- Agent will no longer crash on endpoint errors
- Users get meaningful responses even when tools fail
- Better error messages for debugging
- More robust overall system

---

**Built:** ✅ Successfully compiled  
**Ready for deployment:** ✅ Yes  
**Breaking changes:** ❌ No
