# ResearchGPT Frontend

Next.js frontend for ResearchGPT with Privy authentication and x402 payments.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your Privy App ID:
```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. **Run development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Features

- ✅ Email login (OTP) with automatic embedded wallet creation
- ✅ Wallet login (SIWE) for existing wallets
- ✅ x402 payment integration via Privy's `useX402Fetch`
- ✅ Research form with backend AI processing
- ✅ Responsive design with Tailwind CSS

## Environment Variables

- `NEXT_PUBLIC_PRIVY_APP_ID` - Your Privy App ID (required)
- `NEXT_PUBLIC_API_URL` - Backend API URL 
  - Local dev: `http://localhost:3000` (or whatever PORT your backend uses)
  - Production: Your Railway backend URL (e.g., `https://your-app.railway.app`)

## Building for Production

```bash
npm run build
npm start
```

## Deployment

This frontend can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway** (alongside your backend)

Make sure to set environment variables in your deployment platform.

