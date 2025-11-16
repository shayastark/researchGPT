#!/bin/bash

# 🚀 Deploy x402 Demo Agent
# Run this script to deploy your working x402 demo agent

echo "=================================================================================="
echo "🎯 x402 Agent Payments Demo - Deployment Script"
echo "=================================================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this from the project root."
    exit 1
fi

echo "✅ Project directory confirmed"
echo ""

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Check git status
echo "📋 Git status:"
git status --short
echo ""

# Confirm with user
echo "⚠️  BEFORE DEPLOYING:"
echo ""
echo "Have you set these environment variables in Railway?"
echo "  ✓ PAYMENT_PRIVATE_KEY (wallet with USDC)"
echo "  ✓ ANTHROPIC_API_KEY"
echo "  ✓ XMTP_WALLET_KEY"
echo "  ✓ XMTP_ENV=production"
echo "  ✓ BASE_RPC_URL"
echo "  ✓ USE_MAINNET=true"
echo ""
echo "Has your payment wallet been funded with USDC?"
echo "  Check: https://basescan.org/address/YOUR_WALLET_ADDRESS"
echo ""
read -p "Ready to deploy? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    echo "Set environment variables and fund wallet, then run this script again."
    exit 1
fi

echo ""
echo "🚀 Deploying to Railway..."
echo ""

# Stage all changes
git add .

# Commit
git commit -m "Deploy working x402 agent payments demo

- Implements x402 protocol correctly
- Makes real USDC payments on Base
- Shows complete payment flow in logs
- Perfect for hackathon demo"

# Push
git push

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================================================="
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "=================================================================================="
    echo ""
    echo "Railway is now building and deploying your agent."
    echo ""
    echo "Next steps:"
    echo "1. Watch Railway logs for deployment progress"
    echo "2. Check health: curl https://your-app.railway.app/health"
    echo "3. Test with XMTP message: 'Research AI agent trends'"
    echo "4. Watch for x402 payment flow in logs!"
    echo ""
    echo "🎉 Your hackathon demo is ready!"
    echo "=================================================================================="
else
    echo ""
    echo "❌ Git push failed. Check your repository setup."
    echo "You may need to:"
    echo "  - Set up git remote"
    echo "  - Authenticate with GitHub"
    echo "  - Have push permissions"
fi
