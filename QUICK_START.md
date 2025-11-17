# 🚀 Quick Start Guide

## Running the Application

### Option 1: Run Both Backend + Frontend Together (Recommended)

**From the ROOT directory** (`/researchGPT`):
```bash
npm run dev:all
```

This runs:
- Backend (agent) on port 3000
- Frontend (Next.js) on port 3000 (Next.js default)

### Option 2: Run Separately

**Terminal 1 - Backend (from ROOT directory):**
```bash
npm run dev
```

**Terminal 2 - Frontend (from ROOT directory):**
```bash
npm run dev:frontend
```

Or from the frontend directory:
```bash
cd frontend
npm run dev
```

---

## Directory Structure

```
researchGPT/              ← ROOT directory
├── frontend/             ← Frontend directory
│   ├── package.json
│   └── app/
├── src/                  ← Backend directory
│   ├── agent/
│   └── api/
└── package.json          ← Root package.json (workspace)
```

---

## When to Use Which Directory

### Root Directory (`/researchGPT`)
- ✅ Running both backend + frontend: `npm run dev:all`
- ✅ Running just backend: `npm run dev`
- ✅ Running frontend from root: `npm run dev:frontend`
- ✅ Installing root dependencies
- ✅ Building everything: `npm run build`

### Frontend Directory (`/researchGPT/frontend`)
- ✅ Running just frontend: `npm run dev`
- ✅ Installing frontend dependencies: `npm install`
- ✅ Building frontend: `npm run build`
- ✅ Working on frontend-specific code

---

## First Time Setup

1. **Install root dependencies** (if not already done):
```bash
# From root directory
npm install
```

2. **Install frontend dependencies**:
```bash
# From root directory
npm install --workspace=frontend

# OR from frontend directory
cd frontend
npm install
```

3. **Set up environment variables**:
```bash
cd frontend
cp env.example .env.local
# Edit .env.local and add your Privy App ID
```

4. **Run everything**:
```bash
# From root directory
npm run dev:all
```

---

## Ports

- **Backend**: Port 3000 (or PORT env var)
- **Frontend**: Port 3000 (Next.js default, will auto-increment if 3000 is taken)

**Note:** If both try to use port 3000, Next.js will automatically use 3001, 3002, etc.

---

## Summary

- **Run `npm run dev:all` from ROOT** ✅
- **When working on frontend code**: You can be in `/frontend` directory
- **When running commands**: Use root directory for workspace commands
- **When not working on frontend**: Yes, change back to root directory

---

## Quick Commands Reference

```bash
# From ROOT directory:

# Run both
npm run dev:all

# Run just backend
npm run dev

# Run just frontend
npm run dev:frontend

# Install frontend deps
npm install --workspace=frontend

# Build everything
npm run build
npm run build:frontend
```

```bash
# From FRONTEND directory:

# Run frontend
npm run dev

# Install deps
npm install

# Build
npm run build
```

