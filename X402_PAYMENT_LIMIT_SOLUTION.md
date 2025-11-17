# x402 Payment Limit Solutions & Future Service Access

## Problem
x402-fetch has a built-in maximum payment limit (appears to be ~$0.20 USDC) that prevents accessing higher-priced services. We need strategies to:
1. **Bypass the limit** for services we control or trust
2. **Access additional services** in the future that may exceed the limit

---

## Solution 1: Check x402-fetch Configuration Options ⚙️

### Current Implementation
```typescript
this.fetchWithPayment = wrapFetchWithPayment(fetch, this.account);
```

### Potential Options
x402-fetch may support configuration options. Check the package documentation or source:

```typescript
// Try passing options (if supported)
this.fetchWithPayment = wrapFetchWithPayment(fetch, this.account, {
  maxPaymentAmount: '1000000', // 1.0 USDC in atomic units (6 decimals)
  // or
  maxPaymentAmountUSDC: 1.0,
});
```

**Action Items:**
1. Check `node_modules/x402-fetch/README.md` or source code
2. Check x402-fetch GitHub repository for configuration options
3. Test if passing a third parameter works

---

## Solution 2: Environment Variable Configuration 🌍

Based on web search results, there may be an environment variable:

```bash
X_402_USDC_DATA_EGRESS_MAX_PRICE=1.0  # Set max to 1.0 USDC
```

**Implementation:**
```typescript
// In x402-official-client.ts constructor
const maxPrice = process.env.X_402_USDC_DATA_EGRESS_MAX_PRICE 
  ? parseFloat(process.env.X_402_USDC_DATA_EGRESS_MAX_PRICE) 
  : undefined;

// If x402-fetch supports it via options
this.fetchWithPayment = wrapFetchWithPayment(fetch, this.account, {
  maxPaymentAmount: maxPrice ? Math.floor(maxPrice * 1_000_000).toString() : undefined,
});
```

**Action Items:**
1. Add `X_402_USDC_DATA_EGRESS_MAX_PRICE` to `.env.example`
2. Test if this environment variable is respected by x402-fetch
3. Document in Railway environment variables

---

## Solution 3: Dual Client Strategy (Recommended) 🔄

Use **x402-fetch** for services under the limit, and **custom X402Client** for higher-priced services.

### Architecture
```typescript
class XMTPBazaarAgent {
  private x402OfficialClient: X402OfficialClient;  // For services ≤ $0.20
  private x402CustomClient: X402Client;            // For services > $0.20
  
  async executeDiscoveredService(toolName: string, input: Record<string, any>) {
    const tool = this.discoveredTools.get(toolName);
    const price = parseFloat(this.bazaarClient.formatPrice(tool.paymentInfo.maxAmountRequired, 6));
    
    // Use custom client for high-priced services
    if (price > 0.20) {
      return await this.x402CustomClient.callWithPaymentInfo(
        tool.service.resource,
        tool.paymentInfo,
        { method, body, queryParams }
      );
    } else {
      // Use official client for standard services
      return await this.x402OfficialClient.callEndpoint(
        tool.service.resource,
        { method, body, queryParams }
      );
    }
  }
}
```

### Benefits
- ✅ Automatic routing based on price
- ✅ No limit for custom client
- ✅ Best of both worlds (official protocol + flexibility)
- ✅ Backward compatible

**Action Items:**
1. Keep both clients initialized
2. Add price-based routing logic
3. Add logging to show which client is used

---

## Solution 4: Service Tiering Strategy 📊

Categorize services by price and handle them differently:

### Tiers
- **Tier 1 (≤ $0.20)**: Use x402-fetch (automatic, safe)
- **Tier 2 ($0.21 - $1.00)**: Use custom X402Client (manual payment flow)
- **Tier 3 (> $1.00)**: Require explicit user approval or admin config

### Implementation
```typescript
interface ServiceTier {
  maxPrice: number;
  requiresApproval: boolean;
  client: 'official' | 'custom' | 'manual';
}

const SERVICE_TIERS: ServiceTier[] = [
  { maxPrice: 0.20, requiresApproval: false, client: 'official' },
  { maxPrice: 1.00, requiresApproval: false, client: 'custom' },
  { maxPrice: Infinity, requiresApproval: true, client: 'manual' },
];

function getServiceTier(price: number): ServiceTier {
  return SERVICE_TIERS.find(tier => price <= tier.maxPrice) || SERVICE_TIERS[SERVICE_TIERS.length - 1];
}
```

---

## Solution 5: Upgrade x402-fetch Package 🔄

Check if newer versions of x402-fetch have removed or increased the limit:

```bash
npm outdated x402-fetch
npm install x402-fetch@latest
```

**Action Items:**
1. Check x402-fetch changelog/release notes
2. Test latest version
3. Report issue to x402-fetch maintainers if limit is too restrictive

---

## Solution 6: Fork/Modify x402-fetch (Last Resort) ⚠️

If x402-fetch doesn't support configuration and we need immediate access:

1. Fork `x402-fetch` repository
2. Remove or increase the payment limit check
3. Use forked version: `npm install github:your-org/x402-fetch#your-branch`

**⚠️ Warning:** This bypasses safety checks and should only be used if:
- You trust the services you're calling
- You have proper balance checks in place
- You understand the risks

---

## Recommended Implementation Plan 🎯

### Phase 1: Immediate (This Week)
1. ✅ **Implement Solution 3 (Dual Client Strategy)**
   - Add price-based routing
   - Keep both clients initialized
   - Test with services > $0.20

2. ✅ **Add Service Tiering**
   - Categorize services by price
   - Log which client is used
   - Add warnings for high-priced services

### Phase 2: Short-term (Next Week)
3. **Investigate x402-fetch Options**
   - Check package documentation
   - Test configuration parameters
   - Check GitHub issues/PRs

4. **Environment Variable Support**
   - Add `X_402_USDC_DATA_EGRESS_MAX_PRICE` if supported
   - Document in Railway config

### Phase 3: Long-term (Future)
5. **Upgrade Strategy**
   - Monitor x402-fetch updates
   - Test new versions
   - Contribute improvements if needed

6. **User Approval Flow** (for very expensive services)
   - Add confirmation for services > $1.00
   - Track service costs per user
   - Add spending limits

---

## Code Changes Required

### 1. Update X402OfficialClientConfig
```typescript
export interface X402OfficialClientConfig {
  privateKey: `0x${string}`;
  rpcUrl: string;
  useMainnet: boolean;
  maxPaymentAmountUSDC?: number; // Optional override
}
```

### 2. Update XMTPBazaarAgent Constructor
```typescript
// Keep both clients
this.x402OfficialClient = new X402OfficialClient({...});
this.x402Client = new X402Client({...}); // Keep for high-priced services
```

### 3. Add Price-Based Routing
```typescript
private async executeDiscoveredService(...) {
  const price = parseFloat(this.bazaarClient.formatPrice(tool.paymentInfo.maxAmountRequired, 6));
  const tier = getServiceTier(price);
  
  if (tier.client === 'custom' && this.x402Client) {
    // Use custom client for high-priced services
    return await this.x402Client.callWithPaymentInfo(...);
  } else {
    // Use official client
    return await this.x402OfficialClient.callEndpoint(...);
  }
}
```

---

## Testing Strategy

1. **Test Low-Priced Service** (≤ $0.20)
   - Should use x402-fetch
   - Should work automatically

2. **Test Medium-Priced Service** ($0.21 - $1.00)
   - Should use custom X402Client
   - Should complete payment flow
   - Should return data

3. **Test High-Priced Service** (> $1.00)
   - Should use custom X402Client
   - Should log warning
   - Should require approval (future)

---

## Future Considerations

1. **Service Whitelist**: Pre-approve trusted high-priced services
2. **Cost Tracking**: Track total spending per user/session
3. **Rate Limiting**: Prevent abuse of expensive services
4. **User Preferences**: Let users set their own price limits
5. **Service Quality**: Track which high-priced services are worth it

---

## Summary

**Immediate Solution:** Implement **Solution 3 (Dual Client Strategy)** - this gives us:
- ✅ Access to all services regardless of price
- ✅ Automatic routing based on price
- ✅ No breaking changes
- ✅ Best of both worlds

**Long-term:** Investigate x402-fetch configuration options and contribute improvements to the package if needed.

