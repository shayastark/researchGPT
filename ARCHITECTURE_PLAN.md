# 🏗️ Architecture Plan: User Wallet Integration with Privy

## Current State vs. Desired State

### Current Architecture
- **Backend Agent**: Single XMTP agent running continuously
- **Payment Model**: One hardcoded wallet (`PAYMENT_PRIVATE_KEY`) pays for all users
- **Flow**: User → XMTP → Agent → x402 Payment (agent's wallet) → Response

### Desired Architecture
- **Frontend**: Web UI where users connect wallets via Privy
- **Payment Model**: Each user pays with their own wallet
- **Flow Options**:
  - **Option A**: Frontend → Privy x402 → x402 APIs → Backend processes → XMTP response
  - **Option B**: Frontend → Backend API → Backend uses user's wallet → x402 APIs → XMTP response

---

## 🎯 Recommended Architecture: Hybrid Approach

### Keep Everything in ONE Repo (Recommended)

**Why?**
- ✅ Shared TypeScript types between frontend/backend
- ✅ Easier to maintain and deploy
- ✅ Better code reuse (x402 client logic)
- ✅ Single deployment pipeline
- ✅ Easier local development

**Structure:**
```
researchGPT/
├── src/
│   ├── agent/          # Existing XMTP agent (backend)
│   ├── lib/            # Shared utilities (x402, etc.)
│   ├── api/            # NEW: REST API endpoints for frontend
│   └── services/       # Existing x402 services
├── frontend/           # NEW: React/Next.js app with Privy
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/      # Privy hooks, x402 integration
│   └── package.json
├── package.json        # Root package.json (workspace)
└── tsconfig.json
```

---

## 🔄 Payment Flow Options

### Option A: Frontend-Handled Payments (Recommended)

**How it works:**
1. User connects wallet via Privy in frontend
2. Frontend uses `useX402Fetch` to call x402 APIs directly
3. Frontend sends results to backend API
4. Backend processes/synthesizes with AI
5. Backend responds via XMTP (if user requested via XMTP) or returns to frontend

**Pros:**
- ✅ Users pay directly (no trust needed)
- ✅ Simpler security model (no private keys on backend)
- ✅ Better UX (users see payment prompts in browser)
- ✅ Uses Privy's built-in x402 support

**Cons:**
- ⚠️ Frontend needs to know about x402 endpoints
- ⚠️ More complex frontend code

**Implementation:**
```typescript
// frontend/src/hooks/useResearch.ts
import { useX402Fetch, useWallets } from '@privy-io/react-auth';

export function useResearch() {
  const { wallets } = useWallets();
  const { wrapFetchWithPayment } = useX402Fetch();

  async function research(query: string) {
    const fetchWithPayment = wrapFetchWithPayment({
      walletAddress: wallets[0]?.address,
      fetch,
      maxValue: BigInt(1000000) // Max 1 USDC
    });

    // Call x402 endpoint directly
    const response = await fetchWithPayment('https://api.example.com/research', {
      method: 'POST',
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    // Send to backend for AI processing
    const processed = await fetch('/api/process-research', {
      method: 'POST',
      body: JSON.stringify({ data, query })
    });

    return processed.json();
  }

  return { research };
}
```

---

### Option B: Backend-Handled Payments (Alternative)

**How it works:**
1. User connects wallet via Privy in frontend
2. Frontend sends wallet address + signed message to backend
3. Backend creates x402 client with user's wallet (via Privy API or delegation)
4. Backend makes x402 payments on user's behalf
5. Backend responds via XMTP or returns to frontend

**Pros:**
- ✅ Backend controls all x402 logic
- ✅ Easier to coordinate complex multi-service calls
- ✅ Can batch payments

**Cons:**
- ❌ Requires Privy backend SDK or wallet delegation
- ❌ More complex security model
- ❌ Users must trust backend with payment authorization

**Implementation:**
```typescript
// src/api/routes/research.ts
import { PrivyClient } from '@privy-io/server-auth';

export async function handleResearch(req, res) {
  const { query, walletAddress, signature } = req.body;
  
  // Verify signature
  // Create x402 client using Privy's backend SDK
  // Make x402 payments
  // Process results
}
```

---

## 🚀 Implementation Plan

### Phase 1: Add REST API to Backend

Create API endpoints that the frontend can call:

```typescript
// src/api/index.ts
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint for frontend to trigger research
app.post('/api/research', async (req, res) => {
  const { query, walletAddress } = req.body;
  
  // Process research (without x402 payments - frontend handles that)
  // Or coordinate x402 payments if using Option B
  
  res.json({ result: '...' });
});

// Endpoint to send XMTP message (if user wants response via XMTP)
app.post('/api/send-xmtp', async (req, res) => {
  const { message, recipientAddress } = req.body;
  // Send via XMTP agent
});
```

### Phase 2: Create Frontend with Privy

```bash
# In root directory
mkdir frontend
cd frontend
npx create-next-app@latest . --typescript --tailwind --app
npm install @privy-io/react-auth
```

### Phase 3: Integrate Privy x402

Use Privy's `useX402Fetch` hook in frontend components.

### Phase 4: Connect Frontend to Backend

Frontend calls backend API after getting x402 data, or backend coordinates everything.

---

## 🔐 Security Considerations

### Option A (Frontend Payments)
- ✅ No private keys on backend
- ✅ Users sign payments in browser
- ✅ Backend only processes data (no payment access)

### Option B (Backend Payments)
- ⚠️ Need Privy backend SDK
- ⚠️ Must verify user signatures
- ⚠️ Consider rate limiting per wallet

---

## 📦 Package Structure

### Root `package.json` (Workspace)
```json
{
  "name": "researchgpt",
  "private": true,
  "workspaces": [
    "frontend",
    "."
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "npm run dev --workspace=.",
    "dev:frontend": "npm run dev --workspace=frontend",
    "build": "npm run build --workspace=. && npm run build --workspace=frontend"
  }
}
```

### Backend `package.json` (Current)
Keep as-is, add CORS if needed.

### Frontend `package.json`
```json
{
  "name": "researchgpt-frontend",
  "dependencies": {
    "@privy-io/react-auth": "^3.7.0",
    "next": "^14.0.0",
    "react": "^18.0.0"
  }
}
```

---

## 🎨 Frontend UI Components Needed

1. **Wallet Connection** - Privy login button
2. **Research Input** - Text area for queries
3. **Payment Status** - Show x402 payment progress
4. **Results Display** - Show research results
5. **XMTP Integration** - Option to send results via XMTP

---

## 🔄 Migration Path

### Step 1: Keep Current Agent Running
- Existing XMTP agent continues to work
- Add new REST API alongside it

### Step 2: Add Frontend
- Build frontend in same repo
- Connect to new REST API

### Step 3: Optional - Deprecate Agent Wallet
- Once frontend is working, you can:
  - Keep agent wallet as fallback
  - Or require users to use frontend

---

## ❓ Decision: Option A vs Option B?

**Recommendation: Option A (Frontend-Handled Payments)**

**Reasons:**
1. Privy's `useX402Fetch` is designed for frontend use
2. Better security (no private keys on backend)
3. Better UX (users see payment prompts)
4. Simpler implementation
5. Aligns with Privy's intended usage

**When to use Option B:**
- If you need complex multi-service coordination
- If you want to batch payments
- If you need server-side payment logic

---

## 📝 Next Steps

1. **Decide on Option A or B** (recommend A)
2. **Create frontend directory** in same repo
3. **Set up Privy** in frontend
4. **Add REST API** to backend
5. **Integrate x402** using Privy hooks
6. **Test end-to-end flow**

---

## 🔗 Resources

- [Privy x402 Docs](https://docs.privy.io/guides/x402) (you shared)
- [Privy React Auth](https://docs.privy.io/guides/react)
- [x402 Protocol Spec](https://x402.gitbook.io/x402)

