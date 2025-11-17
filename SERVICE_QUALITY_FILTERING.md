# Service Quality Filtering

## Problem
The agent was repeatedly using services that return placeholder data (like `https://x402.aiape.tech/signals` which only returns a Twitter link), wasting money ($0.10 USDC per call) and providing no value to users.

## Solution: Multi-Layer Service Quality System

### 1. **Static Blacklist** (Prevents Known Bad Services)
A hardcoded blacklist of services known to return placeholder data:

```typescript
const SERVICE_BLACKLIST: string[] = [
  'https://x402.aiape.tech/signals', // Returns only Twitter link, not actual signals
  // Add more known bad services here as they're discovered
];
```

**When it applies:** During service discovery - bad services are never added to `discoveredTools`.

### 2. **Dynamic Quality Tracker** (In-Memory Session Tracking)
A Map that tracks service quality during the agent's runtime:

```typescript
private serviceQuality: Map<string, { isBad: boolean; reason?: string }> = new Map();
```

**When it applies:** 
- Services are checked during discovery (if marked bad, they're skipped)
- Services are marked as bad when they return placeholder data
- Bad services are removed from `discoveredTools` immediately

### 3. **Automatic Detection & Removal** (Runtime Quality Control)
When a service returns placeholder data (detected by `x402-official-client.ts`):

1. **Detection:** The result contains `_placeholder_data: true`
2. **Marking:** Service is added to `serviceQuality` Map with `isBad: true`
3. **Removal:** Service is immediately removed from `discoveredTools`
4. **Logging:** Clear log message explains why the service was removed

**Code:**
```typescript
if (resultObj._placeholder_data === true) {
  const serviceUrl = tool.service.resource;
  this.serviceQuality.set(serviceUrl, {
    isBad: true,
    reason: resultObj._warning || 'Returns placeholder data, not actual content'
  });
  this.discoveredTools.delete(toolCall.function.name);
  console.log(`   🚫 Service marked as bad and removed: ${serviceUrl}`);
}
```

## How It Works

### Service Discovery Flow
```
1. Fetch services from Bazaar
2. For each service:
   ├─ Check blacklist → Skip if blacklisted
   ├─ Check quality tracker → Skip if marked bad
   ├─ Validate payment options → Skip if invalid
   └─ Add to discoveredTools ✅
```

### Service Execution Flow
```
1. AI selects service from discoveredTools
2. Execute service via x402
3. Check result:
   ├─ If placeholder data detected:
   │  ├─ Mark service as bad
   │  ├─ Remove from discoveredTools
   │  └─ Log warning
   └─ Return result (with placeholder warning if applicable)
```

## Benefits

1. **Prevents Wasted Money:** Bad services are never used again in the same session
2. **Improves User Experience:** Agent won't repeatedly try broken services
3. **Easy to Maintain:** Add new bad services to blacklist as discovered
4. **Self-Healing:** Automatically detects and filters bad services at runtime
5. **Transparent:** Clear logging shows which services were filtered and why

## Example

**Before:**
```
User: "Get current trading signals"
Agent: Uses x402_signals → Returns Twitter link → User pays $0.10 for nothing
User: "Get trading signals again"
Agent: Uses x402_signals again → Returns Twitter link → User pays $0.10 again
```

**After:**
```
User: "Get current trading signals"
Agent: Uses x402_signals → Returns Twitter link → Service marked bad and removed
User: "Get trading signals again"
Agent: Uses api_signals_current (better service) → Returns actual signals ✅
```

## Adding New Bad Services

When you discover a service that returns placeholder data:

1. **Add to blacklist** (if it's consistently bad):
   ```typescript
   const SERVICE_BLACKLIST: string[] = [
     'https://x402.aiape.tech/signals',
     'https://new-bad-service.com/api', // Add here
   ];
   ```

2. **Or let automatic detection handle it** (if it's intermittent):
   - The quality tracker will catch it on first use
   - It will be removed for the rest of the session

## Limitations

- **Session-Only:** Quality tracker resets when agent restarts (by design - services might improve)
- **No Persistence:** Bad services aren't saved to disk (keeps it simple)
- **First Call Cost:** User still pays for the first call to a bad service (but not subsequent ones)

## Future Improvements

1. **Persistent Blacklist:** Save known bad services to a file/database
2. **Service Health Checks:** Periodically test blacklisted services to see if they've improved
3. **User Reporting:** Allow users to report bad services
4. **Service Ratings:** Track success rates and prefer higher-rated services
5. **Cost Tracking:** Track total money wasted on bad services

