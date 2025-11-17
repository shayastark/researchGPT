# 💼 User Wallet Integration - Quick Answers

## Your Questions Answered

### Q1: How to allow PAYMENT_ADDRESS/PAYMENT_PRIVATE_KEY to change per user?

**Short Answer:** You don't change the env vars. Instead, users connect their wallets in the frontend, and payments happen client-side using Privy's `useX402Fetch` hook.

**Long Answer:**
- Keep `PAYMENT_PRIVATE_KEY` for agent's own operations (optional)
- Frontend users connect wallets via Privy
- Frontend uses `useX402Fetch` to make x402 payments directly from user's wallet
- Backend receives the research data (already paid for) and processes it

### Q2: Should I create a new repo or keep everything together?

**Answer: Keep everything in this repo** (monorepo)

**Recommended Structure:**
```
researchGPT/
├── src/              # Backend (existing)
│   ├── agent/        # XMTP agent
│   ├── api/          # NEW: REST API for frontend
│   └── lib/          # Shared utilities
├── frontend/         # NEW: React/Next.js app
│   └── app/          # Next.js app directory
└── package.json      # Workspace config
```

**Why same repo?**
- ✅ Shared TypeScript types
- ✅ Easier maintenance
- ✅ Single deployment
- ✅ Better code reuse

---

## 🎯 Architecture Decision: Frontend vs Backend Payments

### Recommended: Frontend-Handled Payments (Option A)

**Flow:**
```
User → Frontend (Privy wallet) → x402 Payment (user's wallet) → x402 API
                                                                    ↓
Backend API ← Frontend sends results ← x402 API returns data
     ↓
AI Processing
     ↓
Response to Frontend (or XMTP)
```

**Why?**
- ✅ Privy's `useX402Fetch` is designed for frontend
- ✅ Users pay directly (no trust needed)
- ✅ Better security (no private keys on backend)
- ✅ Better UX (payment prompts in browser)

### Alternative: Backend-Handled Payments (Option B)

**Flow:**
```
User → Frontend → Backend API (with wallet address)
                              ↓
                    Backend uses Privy SDK
                              ↓
                    x402 Payment (user's wallet)
                              ↓
                    x402 API → Backend → Response
```

**When to use:**
- Complex multi-service coordination needed
- Want to batch payments
- Need server-side payment logic

---

## 🚀 Quick Start Implementation

### 1. Add REST API to Backend

```typescript
// src/api/server.ts
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint: Process research (frontend sends already-paid-for data)
app.post('/api/process-research', async (req, res) => {
  const { query, researchData } = req.body;
  // Process with OpenAI
  res.json({ result: '...' });
});

export default app;
```

### 2. Create Frontend with Privy

```bash
mkdir frontend
cd frontend
npx create-next-app@latest . --typescript --tailwind
npm install @privy-io/react-auth
```

### 3. Use Privy x402 Hook

```typescript
// frontend/app/components/ResearchForm.tsx
import { useX402Fetch, useWallets } from '@privy-io/react-auth';

export function ResearchForm() {
  const { wallets } = useWallets();
  const { wrapFetchWithPayment } = useX402Fetch();

  async function research(query: string) {
    const fetchWithPayment = wrapFetchWithPayment({
      walletAddress: wallets[0]?.address,
      fetch,
      maxValue: BigInt(1000000), // Max 1 USDC
    });

    // User pays directly here
    const response = await fetchWithPayment(
      'https://www.capminal.ai/api/x402/research',
      {
        method: 'POST',
        body: JSON.stringify({ query }),
      }
    );

    const data = await response.json();
    
    // Send to backend for processing
    const processed = await fetch('/api/process-research', {
      method: 'POST',
      body: JSON.stringify({ query, researchData: data }),
    });

    return processed.json();
  }
}
```

---

## 📋 What You Need

1. **Privy Account**: Sign up at https://privy.io
2. **Privy App ID**: Get from Privy dashboard
3. **Frontend Setup**: Next.js app with Privy provider
4. **Backend API**: REST endpoints for frontend

---

## 🔄 Migration Path

**Phase 1 (Now)**: 
- Keep XMTP agent running as-is
- Add REST API alongside it
- Create frontend

**Phase 2 (Later)**:
- Users can use either:
  - XMTP (agent pays from `PAYMENT_PRIVATE_KEY`)
  - Frontend (users pay from their wallets)

**Phase 3 (Optional)**:
- Deprecate agent wallet
- Require frontend for new users

---

## 📚 Documentation Files Created

1. **ARCHITECTURE_PLAN.md** - Detailed architecture decisions
2. **IMPLEMENTATION_GUIDE.md** - Step-by-step code examples
3. **USER_WALLET_INTEGRATION.md** - This file (quick answers)

---

## 🎯 Next Steps

1. **Decide**: Frontend payments (Option A) or Backend payments (Option B)
2. **Get Privy App ID**: Sign up at privy.io
3. **Create frontend**: Follow IMPLEMENTATION_GUIDE.md
4. **Test**: End-to-end flow with testnet USDC

---

## 💡 Key Insight

**You don't need to change `PAYMENT_PRIVATE_KEY` at all!**

Instead:
- Frontend users connect their own wallets
- Privy's `useX402Fetch` handles payments client-side
- Backend just processes the results

This is simpler, more secure, and aligns with Privy's design.

