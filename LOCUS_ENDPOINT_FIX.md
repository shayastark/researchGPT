# Locus x402 Endpoint Fix

## 🎯 Issue Identified

The agent was failing with a **404 error** when trying to call the Locus API:

```
❌ Locus API error (404): Cannot POST /v1/x402/call
```

## 🔍 Root Cause

The code was using the **wrong Locus API endpoint**:

**❌ Incorrect (OLD):**
```
URL: https://api.paywithlocus.com/v1/x402/call
```

**✅ Correct (FIXED):**
```
URL: https://mcp.paywithlocus.com/x402/call
```

## 🛠️ What Was Fixed

### Changed in `src/agent/index-locus-direct.ts`

1. **Updated Base URL** (Line 25):
```typescript
// Before
const LOCUS_API_BASE = process.env.LOCUS_API_BASE || 'https://api.paywithlocus.com';

// After
const LOCUS_API_BASE = process.env.LOCUS_API_BASE || 'https://mcp.paywithlocus.com';
```

2. **Updated Endpoint Path** (Line 416):
```typescript
// Before
const locusResponse = await fetch(`${LOCUS_API_BASE}/v1/x402/call`, {

// After
const locusResponse = await fetch(`${LOCUS_API_BASE}/x402/call`, {
```

## ✅ Expected Behavior After Fix

When you test the agent now, you should see:

```
🔍 Processing with Locus x402 Payment Orchestration
   Query: "can you help me research AI agent trends in 2025?"

🔄 Iteration 1:
   Stop reason: tool_use
   🔧 Tool: ai_research
      Input: {"query":"AI agent trends 2025"}
   💰 Calling x402 endpoint via Locus:
      Endpoint: https://www.capminal.ai/api/x402/research
      Query: AI agent trends 2025
      Method: POST (with Locus orchestration)
      📡 Locus API response: 200 OK  ✅
      ✅ Data received via Locus orchestration
      💳 Payment details:
         Amount: 0.10 USDC
         Tx: 0x...
      ✅ Success

🔄 Iteration 2:
   Stop reason: end_turn

✅ Research completed in 2 iteration(s)
✅ Response sent
```

## 🚀 Deploy the Fix

### Option 1: Automatic Deploy (Recommended)

If Railway is configured with auto-deploy from git:

```bash
git add .
git commit -m "Fix: Update Locus endpoint to mcp.paywithlocus.com/x402/call"
git push
```

Railway will automatically rebuild and redeploy.

### Option 2: Manual Deploy

1. Rebuild locally:
```bash
npm run build
```

2. Push to Railway:
```bash
git push railway main
```

## 🧪 Testing the Fix

Once deployed, test with an XMTP message:

```
"Can you help me research AI agent trends in 2025?"
```

**Watch the Railway logs** for:
- ✅ `📡 Locus API response: 200 OK` (not 404!)
- ✅ `✅ Data received via Locus orchestration`
- ✅ `💳 Payment details`

## 🔧 Environment Variables

No changes needed! Your existing environment variables are correct:

```bash
LOCUS_API_KEY=locus_dev_6gql3MusieEpdTJMWgele-NFYTdQHLip
# LOCUS_API_BASE is now optional and defaults to the correct URL
```

## 📊 Technical Details

### Locus MCP Architecture

The Locus system uses their **MCP (Model Context Protocol) server** for x402 orchestration:

- **MCP Server Base**: `https://mcp.paywithlocus.com`
- **x402 Call Endpoint**: `/x402/call`
- **Authentication**: Bearer token with `LOCUS_API_KEY`

### Request Format

```typescript
POST https://mcp.paywithlocus.com/x402/call

Headers:
  Content-Type: application/json
  Authorization: Bearer ${LOCUS_API_KEY}

Body:
{
  "endpoint": "https://www.capminal.ai/api/x402/research",
  "method": "POST",
  "body": {
    "query": "AI agent trends 2025"
  }
}
```

### Response Format

```json
{
  "data": { /* research results */ },
  "payment_info": {
    "amount": "0.10",
    "currency": "USDC",
    "transaction_hash": "0x..."
  }
}
```

## 🐛 If It Still Doesn't Work

### Error: 401 Unauthorized

**Issue**: Invalid API key

**Fix**:
1. Go to https://app.paywithlocus.com/dashboard/agents
2. Regenerate your API key
3. Update `LOCUS_API_KEY` in Railway

### Error: 403 Forbidden

**Issue**: Endpoint not approved in Locus policy

**Fix**:
1. Go to https://app.paywithlocus.com/dashboard/agents
2. Check "Enable x402 API payments"
3. Verify endpoint is in approved list
4. Click "Update Policy Group"

### Error: 500 Internal Server Error

**Issue**: Locus backend error (possibly wallet issue)

**Fix**:
1. Check wallet has USDC balance
2. Check wallet has ETH for gas
3. Try a test payment in Locus dashboard

## 📚 References

- **Locus Dashboard**: https://app.paywithlocus.com
- **Locus MCP Docs**: https://docs.paywithlocus.com/mcp
- **x402 Spec**: https://www.x402scan.com/

## 🎯 Summary

✅ **Fixed**: Changed Locus API endpoint from `api.paywithlocus.com/v1/x402/call` to `mcp.paywithlocus.com/x402/call`

✅ **Tested**: Code builds successfully

✅ **Ready**: Deploy and test with a real XMTP message!

---

**Built for x402 Hackathon**  
Autonomous AI agent with Locus-orchestrated x402 payments on XMTP
