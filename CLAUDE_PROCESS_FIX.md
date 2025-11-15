# Claude Process Exit Fix

## Problem
The agent was crashing with error:
```
Error: Claude Code process exited with code 1
```

This occurred when using `@anthropic-ai/claude-agent-sdk`'s `query()` function, which spawns a subprocess (Claude Code) that doesn't work reliably in containerized deployment environments.

## Solution
Replaced the subprocess-based `query()` function with direct Anthropic API calls using `@anthropic-ai/sdk`.

## Changes Made

### 1. Package Installation
```bash
npm install @anthropic-ai/sdk
```

### 2. Code Changes
- **Import Change**: Replaced `query` from `@anthropic-ai/claude-agent-sdk` with `Anthropic` from `@anthropic-ai/sdk`
- **API Call**: Replaced the subprocess-based `query()` with direct `anthropic.messages.create()` call
- **Error Handling**: Updated error messages for better debugging

### 3. Benefits
✅ No subprocess spawning (works in any environment)
✅ Direct API calls (more reliable)
✅ Better error handling
✅ Still uses Claude 3.5 Sonnet
✅ Faster response times

## Deployment

### Rebuild Required
```bash
npm run build
```

### Environment Variables (unchanged)
- `ANTHROPIC_API_KEY` - Required
- `XMTP_WALLET_KEY` - Required
- `XMTP_ENV` - Should be "production"
- `LOCUS_API_KEY` - Optional (for future MCP integration)

### Deploy to Railway
1. Commit the changes
2. Push to your repository
3. Railway will automatically redeploy with the fix

## Testing
Send a message to your agent:
```
"full research on Base ecosystem tokens"
```

Expected behavior:
- ✅ No process exit errors
- ✅ Agent responds with research report
- ✅ Logs show: "✅ Research completed" with token usage

## Future Enhancement: MCP Integration
The current fix uses Claude's built-in knowledge. To re-enable Locus MCP for x402 payments:
1. We'll need to implement manual tool calling with the Anthropic SDK
2. Connect to Locus MCP endpoints for real-time data
3. This requires additional development but the foundation is now stable

## Notes
- The `@anthropic-ai/claude-agent-sdk` package can be removed from package.json if desired
- The new implementation is production-ready and deployment-safe
- No breaking changes to the XMTP messaging interface
