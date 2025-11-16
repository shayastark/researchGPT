# 🎯 XMTP x402 Research Agent - Demo Guide

**For Hackathon Judges Demo**

---

## 🚀 Quick Demo Overview

**What you're showing:**
An autonomous AI agent that uses the **x402 payment protocol** to access premium data sources via XMTP messaging, with Claude making intelligent decisions about which paid services to use.

**Key Innovation:**
- Natural language → AI agent → Autonomous payments → Real data
- Multi-facilitator (Locus + CDP)
- Policy-enforced spending limits
- Conversational interface via XMTP

---

## 📱 Demo Scenarios

### **SCENARIO A: If Your Locus Wallet is Funded (BEST DEMO)**

#### What to Ask:
```
"What are some promising crypto gems?"
```
or
```
"Give me technical analysis for Bitcoin"
```
or
```
"What's the weather in San Francisco?"
```

#### What Happens:
1. Claude receives your message via XMTP
2. Claude autonomously decides which tool to use
3. Agent makes x402 payment call (costs shown below)
4. Data returned from premium source
5. Claude synthesizes comprehensive response

#### Pricing (to fund wallet):
- **Crypto Gems** (Canza): $1.00 USDC
- **Technical Analysis** (EthyAI): $0.50 USDC  
- **Weather Data** (SAPA): $0.01 USDC ← **CHEAPEST!**

**💡 Best Demo Query:**
```
"What's the weather in New York?"
```
**Why:** Only costs $0.01 USDC and shows the full flow working!

---

### **SCENARIO B: Wallet Not Funded (STILL IMPRESSIVE)**

#### What to Ask:
```
"What are some promising crypto gems?"
```

#### What Happens:
1. Claude receives your message via XMTP
2. Claude tries to call the `crypto_gems` tool
3. Endpoint returns **402 Payment Required** with x402 negotiation details
4. Agent logs show the payment negotiation (judges can see this!)
5. Claude gracefully handles the error and provides a helpful response

#### What to Show Judges:
The **terminal logs** showing x402 protocol in action:
```
🔧 Tool use iteration 1:
   Calling: crypto_gems({"category":"all"})
   💰 Making x402 payment call to: https://api.canza.app/token/gems-list
   💳 Payment required for crypto_gems
   📋 Payment info: {
     "scheme": "exact",
     "network": "base",
     "maxAmountRequired": "1000000",
     "payTo": "0x4e9bCe2547A9491b09ed092c433B19888e665edB",
     "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
   }
```

**This demonstrates:**
- ✅ x402 protocol negotiation working
- ✅ Agent discovering payment requirements
- ✅ Proper error handling
- ✅ Base network integration
- ✅ USDC payment requests

---

### **SCENARIO C: Multi-Tool Demo (ADVANCED)**

#### What to Ask:
```
"Give me a complete crypto market analysis"
```

#### What Happens:
Claude will try to call **multiple tools**:
1. `crypto_gems` - Get promising tokens
2. `technical_analysis` - Analyze major coins
3. Synthesize comprehensive report

**Why This Is Cool:**
Shows autonomous decision-making - Claude decides which tools to use without hardcoded logic!

---

## 🎤 What to Say to Judges

### **Opening (15 seconds)**
> "I built an autonomous AI agent that uses the x402 payment protocol to access premium data sources. Users message the agent via XMTP, Claude autonomously decides which paid services to use, and Locus handles the payments with policy enforcement."

### **Key Points to Highlight**

#### 1. **Multi-Layer Innovation**
- **XMTP Layer**: Conversational interface anyone can use
- **Claude Layer**: Autonomous decision-making (no hardcoded logic)
- **x402 Layer**: Decentralized payment protocol
- **Locus Layer**: Policy enforcement and wallet management

#### 2. **True Autonomy**
> "The agent isn't following a script. Claude reads the user's natural language request, decides which premium data sources to access, and makes those payments autonomously. I don't control what it chooses - it adapts to each query."

**Example:**
- User asks about weather → Claude chooses `weather_data` tool
- User asks about crypto → Claude chooses `technical_analysis` + `crypto_gems`
- User asks vague question → Claude picks the best combination

#### 3. **Multi-Facilitator Architecture**
> "This demonstrates cross-facilitator orchestration. The agent can access services from both Locus and CDP facilitators seamlessly. The x402 protocol abstracts away which facilitator is handling the payment."

**Endpoints supported:**
- Locus facilitator: EthyAI technical analysis
- CDP facilitator: Canza, SAPA, Capminal, Otto, Otaku services

#### 4. **Policy Enforcement**
> "Locus provides spending guardrails. I configured a policy group with monthly budget limits, approved endpoints, and spending rules. The agent operates autonomously but safely within these bounds."

**Show in Locus dashboard:**
- Approved endpoints list
- Budget limits
- Transaction history

#### 5. **Real-World UX**
> "Users don't need to understand crypto, wallets, or payment protocols. They just message the agent like they would message a friend, and everything happens behind the scenes."

---

## 📊 Technical Deep Dive (If Asked)

### Architecture Flow
```
User (XMTP Message)
  ↓
XMTP Agent SDK (receives message)
  ↓
Claude Sonnet 4.5 (function calling)
  ↓ "I need crypto_gems data"
Agent callX402Endpoint()
  ↓
x402 Endpoint (returns 402 Payment Required)
  ↓
Payment negotiation (Base USDC)
  ↓
Data returned to Claude
  ↓
Claude synthesizes response
  ↓
XMTP Agent SDK (sends response)
  ↓
User receives answer
```

### Why Each Technology?

**XMTP:**
- Decentralized messaging (no central server)
- End-to-end encrypted
- Multi-platform (users can message from any XMTP client)
- Built for Web3 native experiences

**Claude (Anthropic):**
- Industry-leading function calling
- 200K token context (can handle complex conversations)
- Strong reasoning for tool selection
- Reliable and fast

**x402 Protocol:**
- Decentralized payment discovery
- No API keys or accounts needed
- Built for AI agents
- Open standard (not locked to one provider)

**Locus:**
- Simplifies wallet management
- Policy enforcement for safety
- Multi-facilitator support
- Dashboard for monitoring

**Base Network:**
- Low transaction costs
- Fast settlement
- USDC native
- Optimized for payments

---

## 🎯 Demo Script

### **Step 1: Show the Agent Running**
```bash
# Terminal showing agent logs
✅ XMTP Research Agent is now online!
📬 Agent Address: 0x...
🌐 Environment: production
💰 Payments: Locus x402 (6 approved sources)
```

### **Step 2: Send Message via XMTP**
Show messaging the agent from:
- xmtp.chat (web)
- Or any XMTP client
- Or demonstrate via your own client

**Message:** "What's the weather in San Francisco?"

### **Step 3: Show Agent Processing**
Terminal logs show:
```
📨 Received message from [user]
   Query: "What's the weather in San Francisco?"
🔍 Processing research request with Claude + Locus MCP
📞 Initial Claude response - Stop reason: tool_use
🔧 Tool use iteration 1:
   Calling: weather_data({"location":"San Francisco"})
   💰 Making x402 payment call to: https://sbx-x402.sapa-ai.com/weather
```

**If funded:**
```
   ✅ weather_data completed
✅ Response sent to [user]
```

**If not funded:**
```
   💳 Payment required for weather_data
   📋 Payment info: [x402 details showing]
   ✅ Claude provided helpful response anyway
```

### **Step 4: Show Response**
User receives comprehensive weather information (if funded) or helpful explanation (if not funded)

### **Step 5: Show Locus Dashboard**
- Approved endpoints
- Budget remaining
- Transaction history (if funded)

---

## 🏆 Hackathon Track Alignment

### **CDP x402 Track ✅**
- **Using x402 protocol:** All endpoints follow x402 negotiation
- **Base network:** Payments in USDC on Base
- **CDP facilitator:** Access to marketplace services
- **Innovation:** Multi-tool autonomous agent using x402

### **Locus Track ✅**
- **Locus MCP integration:** Policy enforcement and wallet management
- **Autonomous payments:** Claude makes payment decisions
- **Policy groups:** Budget limits and approved endpoints
- **Multi-facilitator:** Works with both Locus and CDP

### **XMTP Track ✅**
- **XMTP Agent SDK:** Full agent implementation
- **Real-time messaging:** Conversational interface
- **Production ready:** Running on production XMTP network
- **Multi-user:** Can handle unlimited concurrent users

---

## 🛠️ Quick Pre-Demo Checklist

### 5 Minutes Before Demo:

**☐ Agent Running**
```bash
npm start
# Check logs show "✅ XMTP Research Agent is now online!"
```

**☐ XMTP Client Ready**
- Go to https://xmtp.chat
- Ready to send message to your agent address

**☐ Terminal Visible**
- Size terminal so judges can see logs
- Increase font size for visibility

**☐ Locus Dashboard Open**
- https://app.paywithlocus.com/dashboard
- Show approved endpoints
- Show wallet balance (if funded)

**☐ This Document Open**
- Have talking points ready
- Know which scenario (A, B, or C) you'll use

**☐ Agent Address Ready to Share**
```
Agent Address: [YOUR_AGENT_ADDRESS_HERE]
```

---

## 💡 Pro Tips

### **Make It Visual**
- Use split screen: Terminal on one side, XMTP chat on other
- Zoom in so judges in back can see
- Highlight key log lines as they appear

### **Tell the Story**
> "Watch what happens when I send this message. Claude has never seen this exact query before, but it will autonomously decide which tool to use and attempt to make the payment."

### **Embrace Failures**
If something doesn't work perfectly:
> "And this is actually perfect - you can see the x402 protocol negotiation happening. The endpoint is telling us it wants 0.5 USDC on Base network, sent to this address. This is the decentralized payment discovery in action."

### **Compare to Alternatives**
> "Without x402, I'd need to:
> - Sign up for each service separately
> - Get API keys
> - Manually integrate billing
> - Handle auth for each
> 
> With x402, the agent discovers services, negotiates payment, and pays automatically."

---

## 🎬 Closing Statement

> "This demonstrates what's possible when you combine conversational AI, autonomous payments, and decentralized protocols. Users get access to premium data through natural language, agents operate safely within policy bounds, and service providers get paid - all without centralized intermediaries."

---

## 📞 Backup Plans

### If Agent Crashes Mid-Demo:
```bash
npm start
# "Railway gives us automatic health checks and restarts"
```

### If XMTP Network Lag:
> "XMTP is a decentralized network, so there can be brief delays. But notice the message is end-to-end encrypted."

### If Judges Ask About Scaling:
> "The architecture is fully stateless except for XMTP message history. Each user conversation is independent. We could handle thousands of concurrent users on a single instance, or horizontally scale across multiple instances."

### If Judges Ask About Costs:
> "With the current endpoints, a typical conversation costs $0.01 to $2.00 depending on complexity. Policy groups let operators set monthly budgets. For production, you could negotiate volume discounts or run your own x402 endpoints."

---

## 🎯 Success Metrics

**You've nailed the demo if judges understand:**
1. ✅ Agent is autonomous (Claude decides, not hardcoded)
2. ✅ x402 protocol enables decentralized payment discovery
3. ✅ Locus provides safe autonomous operation
4. ✅ Users have simple conversational experience
5. ✅ Multi-facilitator shows ecosystem maturity

---

**Good luck with your demo! 🚀**

Remember: Even if payments don't work, showing the x402 negotiation is impressive!
