# Git Workflow Guide

## 🎯 Quick Reference

**For solo development (your current setup):**

```bash
# 1. Make changes to files
# 2. Stage changes
git add .

# 3. Commit with descriptive message
git commit -m "Description of what changed"

# 4. Push to main (Railway auto-deploys)
git push origin main
```

**That's it!** Railway watches your `main` branch and auto-deploys.

---

## 📋 Detailed Workflow

### Option 1: Direct to Main (Current - Recommended for Solo Dev)

**When to use:** You're the only developer, or you want immediate deployment.

```bash
# 1. Make your code changes
# Edit files in your editor

# 2. Check what changed
git status
git diff

# 3. Stage all changes
git add .

# Or stage specific files:
git add src/lib/x402-official-client.ts

# 4. Commit with a clear message
git commit -m "Fix: Improve x402 response data extraction"

# Good commit message format:
# - "Fix: ..." for bug fixes
# - "Feat: ..." for new features
# - "Improve: ..." for improvements
# - "Refactor: ..." for code restructuring

# 5. Push to main
git push origin main

# Railway will automatically:
# - Detect the push
# - Build your code
# - Deploy within 1-2 minutes
```

**Timeline:**
- Push → Railway detects (30-60 seconds)
- Railway builds (1-3 minutes)
- Railway deploys (30-60 seconds)
- **Total: ~2-5 minutes**

---

### Option 2: Feature Branch + PR (For Team or Review)

**When to use:** Working with others, or you want code review.

```bash
# 1. Create a feature branch
git checkout -b feature/improve-x402-handling

# 2. Make changes and commit
git add .
git commit -m "Improve x402 response handling"

# 3. Push the branch
git push origin feature/improve-x402-handling

# 4. Create Pull Request on GitHub
# - Go to GitHub
# - Click "Compare & pull request"
# - Review changes
# - Merge to main

# 5. After merge, Railway auto-deploys from main
```

---

## 🚂 Railway Auto-Deployment

### How It Works

1. **Railway watches your `main` branch**
   - Connected via GitHub integration
   - Detects new commits automatically

2. **On push to main:**
   ```
   git push origin main
   ↓
   GitHub receives push (instant)
   ↓
   Railway detects change (30-60 seconds)
   ↓
   Railway starts build (1-3 minutes)
   ↓
   Railway deploys (30-60 seconds)
   ↓
   Your agent is live with new code!
   ```

3. **Check deployment status:**
   - Go to Railway dashboard
   - Click "Deployments" tab
   - See latest deployment status

### Deployment Timing

- **First detection:** 30-60 seconds after push
- **Build time:** 1-3 minutes (depends on dependencies)
- **Deploy time:** 30-60 seconds
- **Total:** Usually 2-5 minutes from push to live

**Note:** Railway might batch deployments if you push multiple commits quickly.

---

## ✅ Best Practices

### 1. Commit Often, Push When Ready

```bash
# Good: Small, focused commits
git commit -m "Fix: Extract data from nested response"
git commit -m "Improve: Add better error logging"

# Bad: One giant commit with everything
git commit -m "Lots of changes"
```

### 2. Write Clear Commit Messages

```bash
# Good
git commit -m "Fix: Handle payment-only responses in x402 client"
git commit -m "Feat: Add service description inference from URLs"
git commit -m "Improve: Better error messages for failed payments"

# Bad
git commit -m "fix"
git commit -m "changes"
git commit -m "update"
```

### 3. Test Locally Before Pushing

```bash
# Build to check for errors
npm run build

# Run locally to test
npm run dev

# Then commit and push
git add .
git commit -m "Your message"
git push origin main
```

### 4. Check Deployment Logs

After pushing, check Railway logs:
```bash
# Via Railway dashboard
# Or via CLI:
railway logs
```

Look for:
- ✅ Build successful
- ✅ Agent started
- ✅ Services discovered
- ❌ Any errors

---

## 🔄 Current Situation Explained

**What happened:**
- 16 minutes ago: Railway deployed (from commit `11e4208` - "Fix x402 response data extraction")
- 9 minutes ago: You pushed commit `d3973b8` - "Improve x402 response handling"
- 5 minutes ago: You pushed commit `273357e` - "Improve service descriptions"

**Why the delay?**
- Railway might be building the new commits now
- Or there might be a slight delay in detection
- Check Railway dashboard to see if a new deployment is in progress

**What to do:**
1. Check Railway dashboard → Deployments tab
2. See if there's a new deployment in progress
3. If not, Railway should detect and deploy within 1-2 minutes

---

## 🚨 Troubleshooting

### Railway Not Deploying?

1. **Check GitHub connection:**
   - Railway dashboard → Settings → Source
   - Ensure GitHub repo is connected

2. **Check branch:**
   - Railway should watch `main` branch
   - Verify in Railway settings

3. **Manual trigger:**
   ```bash
   # Force a redeploy
   railway redeploy
   ```

### Deployment Failed?

1. **Check build logs:**
   - Railway dashboard → Latest deployment → Build logs
   - Look for errors

2. **Common issues:**
   - TypeScript errors → Fix code
   - Missing dependencies → Check `package.json`
   - Environment variables → Set in Railway dashboard

3. **Fix and push again:**
   ```bash
   # Fix the issue
   # Commit the fix
   git add .
   git commit -m "Fix: Resolve deployment error"
   git push origin main
   ```

---

## 📝 Quick Commands Cheat Sheet

```bash
# Check status
git status

# See what changed
git diff

# Stage all changes
git add .

# Stage specific file
git add src/lib/x402-official-client.ts

# Commit
git commit -m "Your message"

# Push to main (triggers Railway deploy)
git push origin main

# Check recent commits
git log --oneline -5

# See commit times
git log --format="%h %s %ar" -5

# Check if you're on main
git branch

# Switch to main
git checkout main

# Pull latest changes (if working with others)
git pull origin main
```

---

## 🎯 Summary

**Your current workflow (solo dev):**
1. Make changes
2. `git add .`
3. `git commit -m "Description"`
4. `git push origin main`
5. Wait 2-5 minutes
6. Check Railway dashboard
7. Done! 🎉

**Railway auto-deploys from `main`** - no manual steps needed!

---

## 🔗 Related Files

- `railway.json` - Railway configuration
- `package.json` - Build scripts
- `.gitignore` - Files to exclude from git

