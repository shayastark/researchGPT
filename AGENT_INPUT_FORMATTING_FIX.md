# Agent Input Formatting Fix

## Problem Identified

The XMTP agent was experiencing issues where GPT-4o would:
1. **Hallucinate outdated date parameters** - Using dates from September 2023 instead of current dates (November 2025)
2. **Be too eager to call tools** - Would call paid APIs even when users asked ABOUT the services rather than requesting actual data
3. **Lack temporal awareness** - No knowledge of the current date when filling parameters

### Example Issue

User query: "looking for news about services that accept payment from x402 protocol"

GPT-4o generated:
```json
{
  "feed_categories": "tech,crypto,blockchain",
  "from_date": "2023-09-01",
  "to_date": "2023-10-01"
}
```

**Problems:**
- Dates from **2 years ago** (September 2023)
- Should have used November 2025 dates
- Called a paid API when user was asking ABOUT the services, not requesting data

## Solutions Implemented

### 1. System Prompt with Current Date Context

Added comprehensive system prompts to all agent variants:

**For Bazaar Agent (`index-bazaar.ts`):**
```typescript
{
  role: 'system',
  content: `You are a helpful research assistant with access to paid data services via the x402 protocol.

CURRENT DATE: ${today}

IMPORTANT GUIDELINES:
1. Only use paid tools when the user explicitly requests data, research, or information that requires calling an API
2. If the user asks ABOUT the services, protocol, or capabilities, answer directly without calling tools
3. When filling date parameters (from_date, to_date, etc.):
   - For "latest" or "recent" news/data: Use ${sevenDaysAgo} to ${today} (last 7 days)
   - For "current" information: Use ${thirtyDaysAgo} to ${today} (last 30 days)
   - NEVER use dates from 2023 or earlier unless explicitly requested
   - Always use YYYY-MM-DD format
4. Use appropriate, recent date ranges that match the user's intent
5. Each tool call costs money, so only use them when necessary

Remember: You are operating in November 2025. Any "recent" data should be from 2025.`
}
```

Applied similar prompts to:
- ✅ `index.ts` (Direct x402)
- ✅ `index-locus-direct.ts` (Locus orchestration)
- ✅ `index-x402-demo.ts` (Demo mode)

### 2. Enhanced Date Parameter Descriptions

For Bazaar agent, enhanced tool parameter descriptions to include date guidance:

```typescript
if (paramName.includes('date') || paramName.includes('time')) {
  description += ` (Use format YYYY-MM-DD. For recent/current data, use dates from the last 30 days. Today is ${new Date().toISOString().split('T')[0]})`;
}
```

### 3. Date Validation with Warnings

Added validation in `index-bazaar.ts` to catch and warn about outdated dates:

```typescript
private validateDateParameters(input: Record<string, any>): void {
  const currentYear = new Date().getFullYear();
  const oneYearAgo = currentYear - 1;
  
  for (const [key, value] of Object.entries(input)) {
    if ((key.includes('date') || key.includes('time')) && typeof value === 'string') {
      const dateMatch = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1]);
        if (year < oneYearAgo) {
          console.log(`\n   ⚠️  WARNING: Potentially outdated date parameter detected`);
          console.log(`      Parameter: ${key} = ${value}`);
          console.log(`      This is from ${year}, but current year is ${currentYear}`);
          console.log(`      API call will proceed, but results may be historical data`);
        }
      }
    }
  }
}
```

## Expected Behavior After Fix

### Scenario 1: User Asks ABOUT Services
**Query:** "What x402 services are available?"
**Expected:** Agent responds directly without calling paid tools

### Scenario 2: User Requests Recent News
**Query:** "Get me the latest news about crypto"
**Expected:** Agent uses dates like `from_date: "2025-11-09"` to `to_date: "2025-11-16"` (last 7 days)

### Scenario 3: User Requests Current Data
**Query:** "What's the current sentiment on Bitcoin?"
**Expected:** Agent uses recent date range from last 30 days (October-November 2025)

### Scenario 4: User Requests Historical Data
**Query:** "What was the crypto sentiment in January 2024?"
**Expected:** Agent uses `from_date: "2024-01-01"` to `to_date: "2024-01-31"` as specified

## Files Modified

1. ✅ `/workspace/src/agent/index-bazaar.ts`
   - Added system prompt with date awareness
   - Enhanced date parameter descriptions
   - Added date validation function

2. ✅ `/workspace/src/agent/index.ts`
   - Added system prompt with current date context

3. ✅ `/workspace/src/agent/index-locus-direct.ts`
   - Added system prompt with current date context

4. ✅ `/workspace/src/agent/index-x402-demo.ts`
   - Added system prompt with current date context

## Testing Recommendations

Test these scenarios to verify the fix:

1. **Meta Questions** (should NOT call paid tools):
   - "What x402 services do you have access to?"
   - "Tell me about the x402 protocol"
   - "How much do your services cost?"

2. **Recent Data Requests** (should use current dates):
   - "Get me the latest crypto news"
   - "What's the recent news about AI?"
   - "Show me current blockchain trends"

3. **Historical Requests** (should respect specified dates):
   - "What was happening in crypto in March 2024?"
   - "Get news from the first week of 2025"

4. **Validation Warnings** (should warn if 2023 dates are used):
   - If GPT still tries to use old dates, you'll see a warning in logs

## Benefits

✅ **Temporal Awareness**: Agent now knows the current date is November 2025
✅ **Cost Optimization**: Won't call paid APIs for meta-questions about services
✅ **Accurate Date Ranges**: Uses recent dates for "latest" and "current" requests
✅ **Historical Capability**: Still respects user-specified historical date ranges
✅ **Validation Layer**: Warns operators if outdated dates are detected
✅ **Better UX**: More relevant, timely data for users

## Implementation Date

November 16, 2025

---

**Note:** The fix ensures GPT-4o has proper temporal context and understands the difference between asking ABOUT services vs. requesting data FROM services.
