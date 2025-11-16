# ⏳ Awaiting Locus MCP Specification

**Date:** 2025-11-16  
**Status:** Waiting for documentation

---

## 📚 Requested Documentation

Please share:
1. **Locus MCP Specification** - To verify correct integration
2. **CDP Server/Client Flow Documentation** - To understand the complete x402 flow

---

## 🔍 What I Need to Verify

### Current Locus MCP Implementation

I've implemented Locus MCP integration based on my understanding, but I want to verify:

**Current implementation in `src/agent/index.ts`:**
```typescript
// Call Locus MCP proxy endpoint
const locusMcpResponse = await fetch(`${LOCUS_MCP_SERVER_URL}/x402/call`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LOCUS_API_KEY}`,
  },
  body: JSON.stringify({
    endpoint: url,
    method: method,
    params: method === 'GET' ? queryParams : bodyParams,
  }),
});
```

### Questions to Verify with Spec

1. **Endpoint**: Is `/x402/call` the correct Locus MCP endpoint?
2. **Request Format**: Is the request body structure correct?
3. **Authentication**: Is `Authorization: Bearer ${LOCUS_API_KEY}` correct?
4. **Response Format**: What does a successful response look like?
5. **Error Handling**: What error codes/formats does Locus MCP return?
6. **Payment Flow**: Does Locus handle the full 402 → payment → retry internally?

---

## 🔧 Network Configuration Fixed

**Updated to Base Mainnet by default:**

```typescript
// Before
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
const USE_MAINNET = process.env.USE_MAINNET === 'true';

// After ✅
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const USE_MAINNET = process.env.USE_MAINNET !== 'false'; // Defaults to true
```

**What this means:**
- ✅ Agent now defaults to Base **mainnet**
- ✅ Uses `https://mainnet.base.org` by default
- ✅ Can still use Sepolia by setting `USE_MAINNET=false`
- ✅ viem chains import includes both for flexibility

---

## 🎯 Current Endpoint Configuration

All endpoints configured for **mainnet**:

```typescript
const endpointConfig: Record<string, { url: string; method: 'GET' | 'POST' }> = {
  'ai_research': { 
    url: 'https://www.capminal.ai/api/x402/research', 
    method: 'POST' 
  },
  'weather_data': { 
    url: 'https://sbx-x402.sapa-ai.com/weather', 
    method: 'GET' 
  },
  'llm_research': { 
    url: 'https://x402.ottoai.services/llm-research', 
    method: 'POST' 
  },
  'job_search': { 
    url: 'https://otaku.so/api/messaging/jobs', 
    method: 'POST' 
  },
  'crypto_gems': { 
    url: 'https://api.canza.app/token/gems-list', 
    method: 'GET' 
  },
  'technical_analysis': { 
    url: 'https://api.ethyai.app/x402/ta', 
    method: 'GET' 
  }
};
```

**Questions:**
1. Are these the correct **mainnet** URLs for these services?
2. Are the HTTP methods correct for each?
3. Should any of these be different for production?

---

## 🤔 Potential Issues to Verify

### 1. Locus MCP Server URL
**Current:** `https://mcp.paywithlocus.com`
- Is this correct?
- Is there a different URL for production vs staging?

### 2. Endpoint Approvals
**Process:** User needs to approve endpoints in Locus dashboard
- Is there a specific format for approval?
- Do the URLs need to match exactly?
- Are there any wildcards or patterns allowed?

### 3. Payment Parameters
**For GET requests:** Query parameters (e.g., `?ticker=BTC`)
**For POST requests:** JSON body (e.g., `{"query": "..."}`)
- Does Locus MCP expect a specific format?
- Should params be flattened or nested?

### 4. Error Responses
**Current error handling:**
```typescript
if (!locusMcpResponse.ok) {
  const errorText = await locusMcpResponse.text().catch(() => 'Unknown error');
  throw new Error(`Locus MCP returned ${locusMcpResponse.status}: ${errorText}`);
}
```
- What HTTP status codes can Locus MCP return?
- What's the error response format?
- Are there retryable errors?

---

## 📊 What the Spec Will Help With

With the Locus MCP spec and CDP flow docs, I can:

1. ✅ Verify the Locus MCP endpoint and request format
2. ✅ Confirm authentication method
3. ✅ Ensure proper error handling
4. ✅ Validate endpoint configurations
5. ✅ Implement any missing features
6. ✅ Add proper retry logic
7. ✅ Optimize the integration

---

## 🚀 Next Steps

**Once you share the docs:**

1. I'll review the specifications
2. Update the Locus MCP integration if needed
3. Verify endpoint configurations
4. Add any missing error handling
5. Update documentation
6. Provide updated deployment instructions

**In the meantime:**

The current implementation should work if:
- The Locus MCP endpoint is `/x402/call`
- The request format matches what I've implemented
- The endpoints are approved in your Locus policy
- Your wallet has USDC balance

---

## 📝 Current Status

✅ **Completed:**
- Base mainnet configuration (default)
- Locus MCP integration attempt
- Direct x402 fallback
- Error handling
- Logging

⏳ **Waiting for:**
- Locus MCP specification
- CDP Server/Client flow docs
- Verification of endpoint URLs
- Verification of HTTP methods

🔜 **Will do after receiving docs:**
- Verify/update Locus MCP implementation
- Confirm endpoint configurations
- Add any missing features
- Update documentation

---

**Ready to review the specs as soon as you share them!** 📚
