# 🛠️ Implementation Guide: Adding User Wallet Support

## Quick Answer to Your Questions

### 1. How to allow PAYMENT_ADDRESS/PAYMENT_PRIVATE_KEY to change per user?

**Answer:** You don't need to change these env vars. Instead:
- **Keep** `PAYMENT_PRIVATE_KEY` for the agent's own operations (optional fallback)
- **Add** frontend where users connect their own wallets via Privy
- **Use** Privy's `useX402Fetch` hook so users pay directly from their wallets

### 2. Should you create a new repo or keep everything together?

**Answer: Keep everything in this repo** (monorepo structure)

**Why:**
- Shared TypeScript types
- Easier maintenance
- Single deployment
- Better code reuse

---

## 🚀 Step-by-Step Implementation

### Step 1: Add REST API to Backend

Create a new API server that works alongside your XMTP agent:

```typescript
// src/api/server.ts
import express from 'express';
import cors from 'cors';
import { XMTPResearchAgent } from '../agent/index.js';

const app = express();
app.use(cors());
app.use(express.json());

// Store agent instance (shared with XMTP agent)
let agentInstance: XMTPResearchAgent | null = null;

export function setAgentInstance(agent: XMTPResearchAgent) {
  agentInstance = agent;
}

// Endpoint: Process research data (frontend sends x402 results here)
app.post('/api/process-research', async (req, res) => {
  try {
    const { query, researchData, walletAddress } = req.body;
    
    // Use OpenAI to synthesize the research data
    // ... existing logic
    
    res.json({ result: synthesizedReport });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Send result via XMTP (optional)
app.post('/api/send-xmtp', async (req, res) => {
  try {
    const { message, recipientAddress } = req.body;
    
    if (!agentInstance) {
      return res.status(503).json({ error: 'Agent not initialized' });
    }
    
    // Send via XMTP
    // You'll need to add a method to your agent class for this
    await agentInstance.sendMessage(recipientAddress, message);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
```

### Step 2: Modify Agent to Support API Server

Update your agent to start the API server:

```typescript
// src/agent/index.ts (additions)
import apiServer from '../api/server.js';

class XMTPResearchAgent {
  // ... existing code ...

  async start() {
    // Start API server on port 3001
    apiServer.listen(3001, () => {
      console.log('🌐 API server listening on port 3001');
    });
    
    // Set agent instance for API routes
    setAgentInstance(this);
    
    // ... rest of existing start() code ...
  }
  
  // Add method to send XMTP messages programmatically
  async sendMessage(recipientAddress: string, message: string) {
    // Implementation to send XMTP message
    // You'll need to look up/create conversation
  }
}
```

### Step 3: Create Frontend Structure

```bash
# In project root
mkdir frontend
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
npm install @privy-io/react-auth
```

### Step 4: Set Up Privy Provider

```typescript
// frontend/app/layout.tsx
'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          config={{
            loginMethods: ['wallet', 'email'],
            appearance: {
              theme: 'light',
            },
            embeddedWallets: {
              createOnLogin: 'users-without-wallets',
            },
          }}
        >
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
```

### Step 5: Create Research Component with x402

```typescript
// frontend/app/components/ResearchForm.tsx
'use client';

import { useState } from 'react';
import { useX402Fetch, useWallets } from '@privy-io/react-auth';

export default function ResearchForm() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { wallets } = useWallets();
  const { wrapFetchWithPayment } = useX402Fetch();

  async function handleResearch() {
    if (!wallets[0]) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Step 1: User pays for x402 research directly
      const fetchWithPayment = wrapFetchWithPayment({
        walletAddress: wallets[0].address,
        fetch,
        maxValue: BigInt(1000000), // Max 1 USDC
      });

      console.log('Calling x402 research endpoint...');
      const x402Response = await fetchWithPayment(
        'https://www.capminal.ai/api/x402/research',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!x402Response.ok) {
        throw new Error(`x402 request failed: ${x402Response.statusText}`);
      }

      const researchData = await x402Response.json();
      console.log('Research data received:', researchData);

      // Step 2: Send to backend for AI processing
      const processedResponse = await fetch('http://localhost:3001/api/process-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          researchData,
          walletAddress: wallets[0].address,
        }),
      });

      const processed = await processedResponse.json();
      setResult(processed.result);
    } catch (error) {
      console.error('Research error:', error);
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ResearchGPT</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Research Query:</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-2 border rounded"
          rows={4}
          placeholder="Ask me anything..."
        />
      </div>

      <button
        onClick={handleResearch}
        disabled={loading || !wallets[0]}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Research (Pay with USDC)'}
      </button>

      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <p className="whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}
```

### Step 6: Create Main Page

```typescript
// frontend/app/page.tsx
'use client';

import { usePrivy } from '@privy-io/react-auth';
import ResearchForm from './components/ResearchForm';

export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      <nav className="p-4 border-b">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">ResearchGPT</h1>
          {authenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm">
                {user?.wallet?.address.slice(0, 6)}...
                {user?.wallet?.address.slice(-4)}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </nav>

      {authenticated ? (
        <ResearchForm />
      ) : (
        <div className="p-6 text-center">
          <p className="mb-4">Please connect your wallet to start researching</p>
        </div>
      )}
    </main>
  );
}
```

### Step 7: Update Package.json for Workspace

```json
// package.json (root)
{
  "name": "researchgpt",
  "private": true,
  "workspaces": [
    "frontend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "node --loader ts-node/esm src/agent/index-bazaar.ts",
    "dev:frontend": "npm run dev --workspace=frontend",
    "build": "npm run build --workspace=. && npm run build --workspace=frontend"
  }
}
```

---

## 🔧 Environment Variables

### Backend (.env)
```bash
# Keep existing vars
XMTP_WALLET_KEY=...
OPENAI_API_KEY=...
PAYMENT_PRIVATE_KEY=...  # Optional fallback

# Add API server port
API_PORT=3001
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🎯 Key Changes Summary

1. **No changes to PAYMENT_PRIVATE_KEY usage** - Keep it as fallback
2. **Add REST API** - New endpoints for frontend
3. **Create frontend** - React/Next.js with Privy
4. **Use Privy's useX402Fetch** - Users pay directly
5. **Backend processes results** - AI synthesis happens server-side

---

## 🚦 Testing Flow

1. Start backend: `npm run dev:backend`
2. Start frontend: `npm run dev:frontend`
3. Open http://localhost:3000
4. Connect wallet via Privy
5. Enter research query
6. Click "Research" - Privy will prompt for x402 payment
7. After payment, backend processes and returns result

---

## 📝 Next Steps After This

1. Get Privy App ID from https://privy.io
2. Add more x402 endpoints to frontend
3. Add XMTP integration (option to send results via XMTP)
4. Add payment history/balance display
5. Deploy both frontend and backend

---

## 🔄 Migration Strategy

**Phase 1 (Current)**: Keep XMTP agent as-is
**Phase 2 (Add)**: Add REST API + Frontend
**Phase 3 (Optional)**: Deprecate agent wallet, require frontend

This way, existing XMTP users still work, and new users can use the frontend.

