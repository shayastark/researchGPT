# 🚂 Railway Setup Guide for XMTP Agent

Complete guide to deploying your XMTP agent on Railway with volume support.

## 📋 Quick Setup

### Port Configuration

The XMTP agent runs an HTTP server on **port 3000** (or `$PORT` if set by Railway).

**Endpoints available:**
- `GET /` - Agent info
- `GET /health` - Health check (for Railway)
- `GET /status` - Detailed status

Railway will automatically detect the port and generate a service domain.

## 🗄️ Railway Volume Setup

### Step 1: Create Railway Project

1. Go to https://railway.app/
2. Click "New Project"
3. Select "Deploy from GitHub repo" (or empty project)
4. Select your repository

### Step 2: Add Volume

1. In your Railway service, click **"Variables"** tab
2. Click **"+ New Variable"**
3. Add this variable first:
   ```
   PORT=3000
   ```
4. Go to **"Settings"** tab
5. Scroll to **"Volumes"** section
6. Click **"+ Add Volume"**
7. Configure:
   - **Mount Path:** `/data`
   - **Size:** 1GB (or more if needed)
8. Click "Add"

### Step 3: Set Mount Path Variable

Back in **"Variables"** tab, add:
```
RAILWAY_VOLUME_MOUNT_PATH=/data
```

This tells the agent where the volume is mounted.

## 🔑 Required Environment Variables

Set these in Railway **"Variables"** tab:

### XMTP Configuration
```env
XMTP_ENV=production
XMTP_WALLET_KEY=0x...
XMTP_DB_ENCRYPTION_KEY=c16cc423a51ee545d6845d3b76526851352d93e7634c7469dbc7fba7bce61212
```

### Base Blockchain

**For Testnet (Recommended for testing):**
```env
BASE_RPC_URL=https://sepolia.base.org
USE_MAINNET=false
PRIVATE_KEY=0x...
PAYMENT_ADDRESS=0x...
```

**For Mainnet (Production with real USDC):**
```env
BASE_RPC_URL=https://mainnet.base.org
USE_MAINNET=true
PRIVATE_KEY=0x...
PAYMENT_ADDRESS=0x...
CDP_API_KEY_ID=organizations/...
CDP_API_KEY_SECRET=-----BEGIN EC PRIVATE KEY-----...
```

### OpenAI
```env
OPENAI_API_KEY=sk-...
```

### Service Endpoints
```env
MARKET_DATA_SERVICE=https://your-market-service.railway.app
SENTIMENT_SERVICE=https://your-sentiment-service.railway.app
ONCHAIN_SERVICE=https://your-onchain-service.railway.app
```

### Port (Optional - Railway sets this automatically)
```env
PORT=3000
```

### Railway Volume
```env
RAILWAY_VOLUME_MOUNT_PATH=/data
```

## 🚀 Deploy

### Option 1: Automatic Deployment

If connected to GitHub:
1. Push your code
2. Railway automatically deploys
3. Check logs for successful startup

### Option 2: Manual Deployment

```bash
railway login
railway link
railway up
```

## ✅ Verify Deployment

### Check Logs

In Railway dashboard, click **"Deployments"** → Click latest deployment → **"View Logs"**

Look for:
```
🌐 HTTP server listening on port 3000
   Health check: http://localhost:3000/health
   Status: http://localhost:3000/status

🤖 XMTP Research Agent Configuration:
   XMTP Network: production
   Base Network: Base (mainnet)
   Wallet: 0x...
   HTTP Port: 3000

✅ XMTP Agent initialized
   Address: 0x...
   InboxId: ...

✅ XMTP Research Agent is now online!
✅ Users can message you on xmtp.chat!
```

### Test Endpoints

Railway generates a URL like: `https://your-app.railway.app`

Test:
```bash
# Health check
curl https://your-app.railway.app/health

# Status (detailed info)
curl https://your-app.railway.app/status
```

Expected response:
```json
{
  "status": "healthy",
  "service": "xmtp-research-agent",
  "uptime": 3600,
  "xmtpNetwork": "production",
  "baseNetwork": "mainnet",
  "address": "0x...",
  "timestamp": "2025-11-15T..."
}
```

## 📁 Database Storage

With the volume configured, your database will be stored at:

```
/data/production-[inboxId].db3
```

**Benefits:**
- ✅ Persistent across deployments
- ✅ Message history preserved
- ✅ Survives container restarts
- ✅ Can be backed up

**Without volume:**
- ❌ Database stored in container (ephemeral)
- ❌ Lost on every deployment
- ❌ Agent needs to re-sync messages

## 🔍 Troubleshooting

### "Service not responding"

**Check:**
1. Is port 3000 configured?
2. Check deployment logs for errors
3. Verify health endpoint: `curl https://your-app.railway.app/health`

### "Database errors" or "Can't write to database"

**Check:**
1. Is volume mounted at `/data`?
2. Is `RAILWAY_VOLUME_MOUNT_PATH=/data` set?
3. Check logs for permission errors

### "Agent not receiving messages"

**Check:**
1. Is `XMTP_ENV=production`?
2. Did you run `npm run initialize-production`?
3. Check agent address in logs matches what users are messaging
4. Verify on xmtp.chat that address is correct

### "Payment failures"

**Check:**
1. Wallet has USDC (check on basescan.org)
2. `USE_MAINNET` matches your RPC URL
3. CDP API keys set (if using mainnet)
4. Service endpoints are accessible

## 📊 Monitoring

### Health Checks

Railway automatically monitors the `/health` endpoint.

**Healthy response:**
```json
{
  "status": "healthy",
  ...
}
```

**Unhealthy:** No response or error status

### Custom Monitoring

Add monitoring service to ping:
- `https://your-app.railway.app/health` every 5 minutes
- Alert if down for >2 consecutive checks

### Database Size

Check volume usage in Railway dashboard:
- Go to **Settings** → **Volumes**
- Shows used/total space
- Increase if approaching limit

## 🔄 Updates

### Deploying Updates

If connected to GitHub:
```bash
git add .
git commit -m "Update agent"
git push
```

Railway automatically redeploys.

### Environment Variable Changes

1. Update in Railway dashboard
2. Service automatically restarts with new variables

### Volume Data

Volume data persists across:
- ✅ Deployments
- ✅ Restarts
- ✅ Environment variable changes

Only deleted if you manually delete the volume.

## 💡 Best Practices

### 1. Always Use Volume in Production
Without volume, you lose message history on every deployment.

### 2. Monitor Disk Usage
Database grows over time. Monitor and increase volume size as needed.

### 3. Backup Encryption Key
Store `XMTP_DB_ENCRYPTION_KEY` securely. Can't recover database without it.

### 4. Use Health Checks
Set up external monitoring on `/health` endpoint.

### 5. Review Logs Regularly
Check Railway logs for errors or unusual activity.

## 🎯 Summary Checklist

For successful Railway deployment:

- [ ] Volume created and mounted at `/data`
- [ ] `RAILWAY_VOLUME_MOUNT_PATH=/data` set
- [ ] `PORT=3000` set (or rely on Railway's automatic PORT)
- [ ] All required environment variables configured
- [ ] Code deployed to Railway
- [ ] Logs show successful startup
- [ ] Health endpoint responding
- [ ] Agent initialized on production network
- [ ] Test message sent and received on xmtp.chat

## 🆘 Need Help?

**Check logs first:**
```bash
railway logs
```

**Common issues:**
- Network mismatch → See `NETWORK_SETUP.md`
- Payment errors → Check wallet balance and USE_MAINNET
- ESM errors → Should be fixed with `"type": "module"` in package.json
- Database errors → Verify volume mount path

---

**Your agent should now be running on Railway with persistent storage!** 🎉

Port: **3000**  
Health: `https://your-app.railway.app/health`  
Volume: `/data`
