#!/bin/bash

echo "================================================================================"
echo "🎯 Deploying Locus Direct Integration"
echo "================================================================================"
echo ""

# Check environment
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run from project root"
    exit 1
fi

echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

echo "⚠️  CHECKLIST:"
echo ""
echo "Have you set these in Railway?"
echo "  ✓ LOCUS_API_KEY=locus_dev_6gql3MusieEpdTJMWgele-NFYTdQHLip"
echo "  ✓ ANTHROPIC_API_KEY=sk-ant-api03-..."
echo "  ✓ XMTP_WALLET_KEY=0x..."
echo "  ✓ XMTP_ENV=production"
echo ""
read -p "Ready to deploy? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "🚀 Deploying..."
echo ""

git add .
git commit -m "Deploy Locus direct integration - working solution

- No Claude Agent SDK subprocess
- Direct HTTP calls to Locus API  
- Uses approved x402 endpoints
- Shows payment flow in logs"

git push

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================================================"
    echo "✅ DEPLOYED!"
    echo "================================================================================"
    echo ""
    echo "Next steps:"
    echo "1. Watch Railway logs for startup"
    echo "2. Check: curl https://your-app.railway.app/health"
    echo "3. Send XMTP test message: 'Research AI trends'"
    echo "4. Watch for Locus payment orchestration in logs!"
    echo ""
    echo "🎉 Your x402 demo with Locus is live!"
else
    echo "❌ Push failed"
fi
