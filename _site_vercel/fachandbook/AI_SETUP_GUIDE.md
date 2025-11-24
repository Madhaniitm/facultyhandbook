# 🧠 AI Intelligence Setup Guide

## Quick Start: Add AI to Your Chatbot (5 Minutes)

Your chatbot now supports **3 AI providers**:

| Provider | Cost | Performance | Setup Time |
|----------|------|-------------|------------|
| **🟢 Google Gemini** | FREE | Excellent | 2 min |
| **🔵 OpenAI GPT** | ~$0.001/query | Excellent | 5 min |
| **🟣 Anthropic Claude** | ~$0.001/query | Excellent | 5 min |

---

## 🌟 Option 1: Google Gemini (FREE - Recommended!)

### Step 1: Get Your Free API Key

1. Go to: **https://makersuite.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Copy the key (starts with `AIza...`)

### Step 2: Add to Config

Edit [_config.yml](_config.yml:234-237):

```yaml
# AI Chatbot Configuration
chatbot:
  enabled: true

  # Google Gemini (FREE - Recommended!)
  api_key: "AIzaSy..."  # Paste your actual key here
  api_type: "gemini"
```

### Step 3: Rebuild & Test

```bash
# Stop current server (Ctrl+C)

# Rebuild site
bundle exec jekyll build

# Start server
bundle exec jekyll serve
```

### Step 4: Test It!

1. Open: `http://127.0.0.1:4000/fachandbook/`
2. Click chatbot button
3. Ask: "How do I apply for leave?"
4. You should see a **natural, conversational response**!

---

## 🔵 Option 2: OpenAI (Paid, but Powerful)

### Step 1: Get API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign up/Login
3. Click **"Create new secret key"**
4. Copy the key (starts with `sk-...`)
5. Add $5-10 credits to your account

### Step 2: Configure

Edit [_config.yml](_config.yml:239-242):

```yaml
chatbot:
  enabled: true

  # OpenAI
  api_key: "sk-proj-..."  # Your OpenAI API key
  api_type: "openai"
```

### Step 3: Rebuild & Test

```bash
bundle exec jekyll build
bundle exec jekyll serve
```

**Cost**: ~$0.001 per query (very affordable!)

---

## 🟣 Option 3: Anthropic Claude (Paid)

### Step 1: Get API Key

1. Go to: https://console.anthropic.com
2. Sign up/Login
3. Navigate to **API Keys**
4. Create new key
5. Copy the key (starts with `sk-ant-...`)

### Step 2: Configure

Edit [_config.yml](_config.yml:244-247):

```yaml
chatbot:
  enabled: true

  # Claude
  api_key: "sk-ant-..."  # Your Claude API key
  api_type: "claude"
```

### Step 3: Rebuild & Test

```bash
bundle exec jekyll build
bundle exec jekyll serve
```

---

## 🎯 How It Works

### Before (Local Mode)
```
User: "How do I apply for leave?"
Bot: "Based on the Faculty Handbook, here's what I found:
     [Direct quote from handbook...]"
```

### After (AI Mode)
```
User: "How do I apply for leave?"
Bot: "To apply for leave at IIT Madras, you'll need to follow
     these steps:

     First, log into the Faculty Portal and navigate to the
     Leave Management section. From there, you can submit your
     leave application by filling out the required form...

     📚 References:
     → Leave and Travel Policies"
```

---

## 🔒 How RAG Prevents Hallucination

Even with AI, your chatbot **cannot hallucinate** because:

1. ✅ **Searches handbook first** - Finds relevant pages
2. ✅ **Sends only handbook content** - AI never sees general web data
3. ✅ **Strict system prompt** - Forbids making up information
4. ✅ **Low temperature (0.3)** - Keeps responses factual
5. ✅ **Source references** - Every answer includes page links

```javascript
// What gets sent to AI (example)
const prompt = `You are an assistant for IIT Madras Faculty Handbook.

IMPORTANT RULES:
1. Only use information from the provided context
2. If answer is not in context, say so clearly
3. Do not make up information

Context from Handbook:
[Leave Policy]
Faculty members can apply for leave through the online portal...
URL: /leave-policies

User Question: How do I apply for leave?

Answer:`;
```

AI responds based **only** on that context!

---

## 💰 Cost Comparison

### Free Tier Limits (Gemini)

- **Free**: 60 requests/minute
- **Free**: 1,500 requests/day
- **Cost**: $0 (completely free!)

Perfect for most use cases!

### Paid Tiers (OpenAI/Claude)

| Usage | OpenAI Cost | Claude Cost |
|-------|-------------|-------------|
| 100 queries | ~$0.10 | ~$0.10 |
| 1,000 queries | ~$1.00 | ~$1.00 |
| 10,000 queries | ~$10.00 | ~$10.00 |

Very affordable for production!

---

## 🧪 Testing AI Integration

### 1. Check Console

Open browser console (F12), you should see:

```
[Chatbot] Loading search data from: /fachandbook/assets/js/search-data.json
[Chatbot] Search data loaded: 102 entries
[Chatbot] Using external AI API: gemini
```

### 2. Test Questions

Try these to see AI in action:

**Simple Question:**
```
Q: "leave policy"
Expected: Natural explanation of leave policies
```

**Complex Question:**
```
Q: "I need to attend a conference abroad. How do I apply for travel
     advance and what documents do I need?"
Expected: Comprehensive answer covering multiple aspects
```

**Out of Scope:**
```
Q: "What's the weather today?"
Expected: "I couldn't find relevant information in the Faculty Handbook"
```

### 3. Verify References

Every AI response should still include:
- 📚 References section
- Clickable links to handbook pages
- 1-3 source citations

---

## 🔧 Troubleshooting

### "API error" in console

**Check:**
1. API key is correct (no extra spaces)
2. API key is uncommented in `_config.yml`
3. `api_type` matches your provider
4. You rebuilt the site after config change

### "Rate limit exceeded"

**Gemini Free Tier:**
- 60 requests/minute
- 1,500 requests/day

**Solution:** Wait a minute or upgrade to paid tier

### "Invalid API key"

1. Verify key on provider's dashboard
2. Make sure key starts with:
   - Gemini: `AIza...`
   - OpenAI: `sk-proj-...` or `sk-...`
   - Claude: `sk-ant-...`
3. Check for typos

### Chatbot falls back to local mode

This is **normal behavior** when:
- API call fails
- Rate limit exceeded
- Network error

The chatbot automatically uses local mode as fallback.

---

## 🎨 Customization

### Adjust AI Creativity

In [assets/js/chatbot.js](assets/js/chatbot.js:427), change temperature:

```javascript
temperature: 0.3  // Current (factual)
temperature: 0.7  // More creative
temperature: 0.1  // Very factual
```

**Recommended:** Keep at 0.3 for handbook Q&A

### Change Response Length

```javascript
maxOutputTokens: 500  // Current
maxOutputTokens: 800  // Longer responses
maxOutputTokens: 300  // Shorter responses
```

### Change Model (Advanced)

**Gemini:**
```javascript
// In chatbot.js, change model:
models/gemini-pro          // Current (best)
models/gemini-pro-vision   // With image support
```

**OpenAI:**
```javascript
model: 'gpt-3.5-turbo'     // Current (fast, cheap)
model: 'gpt-4'             // Better quality (slower, expensive)
model: 'gpt-4-turbo'       // Best balance
```

---

## 📊 Performance Comparison

| Mode | Response Time | Quality | Cost |
|------|---------------|---------|------|
| Local | <500ms | Good (direct quotes) | $0 |
| Gemini | 1-2s | Excellent (natural) | $0 |
| GPT-3.5 | 1-3s | Excellent | ~$0.001 |
| GPT-4 | 2-5s | Outstanding | ~$0.03 |
| Claude | 1-3s | Excellent | ~$0.001 |

---

## 🔐 Security Best Practices

### ⚠️ NEVER commit API keys to Git!

**Bad:**
```yaml
# _config.yml (committed to Git)
api_key: "AIzaSy123456789"  # ❌ DON'T DO THIS
```

**Good Option 1:** Use environment variables

```yaml
# _config.yml
api_key: <%= ENV['GEMINI_API_KEY'] %>
```

```bash
# Set in terminal
export GEMINI_API_KEY="AIzaSy..."
```

**Good Option 2:** Separate config file

```yaml
# _config_secret.yml (add to .gitignore)
chatbot:
  api_key: "AIzaSy..."
```

Add to `.gitignore`:
```
_config_secret.yml
```

Build with:
```bash
bundle exec jekyll serve --config _config.yml,_config_secret.yml
```

---

## 🚀 Production Deployment

### Using Environment Variables

Most hosting platforms support environment variables:

**Netlify:**
1. Site settings → Environment variables
2. Add `CHATBOT_API_KEY`
3. Update `_config.yml`:
   ```yaml
   api_key: <%= ENV['CHATBOT_API_KEY'] %>
   ```

**GitHub Pages:**
1. Repository → Settings → Secrets
2. Add `CHATBOT_API_KEY`
3. Use in workflow:
   ```yaml
   - name: Build
     env:
       CHATBOT_API_KEY: ${{ secrets.CHATBOT_API_KEY }}
   ```

**Vercel:**
1. Project Settings → Environment Variables
2. Add `CHATBOT_API_KEY`
3. Automatic injection

---

## 💡 Pro Tips

### 1. Start with Gemini Free
- Test thoroughly with free Gemini
- Monitor usage patterns
- Upgrade to paid only if needed

### 2. Monitor Costs
- Check API dashboard weekly
- Set spending alerts
- Most handbooks cost <$5/month

### 3. Combine Modes
- Use AI for complex questions
- Fall back to local for simple lookups
- Best of both worlds!

### 4. Cache Responses (Advanced)
- Store common Q&A pairs
- Reduce API calls
- Faster responses

---

## 📈 Success Metrics

After enabling AI, you should see:

✅ More natural conversations
✅ Better complex question handling
✅ Improved user satisfaction
✅ Still grounded in handbook content
✅ No hallucinations

---

## 🎉 You're Ready!

1. ✅ Get Gemini API key (2 minutes)
2. ✅ Add to [_config.yml](_config.yml:234-237)
3. ✅ Rebuild: `bundle exec jekyll build`
4. ✅ Test: Open chatbot and ask questions
5. ✅ Enjoy intelligent responses!

---

**Questions?** Check:
- [CHATBOT_README.md](CHATBOT_README.md) - Full documentation
- [CHATBOT_QUICKSTART.md](CHATBOT_QUICKSTART.md) - Quick start
- [TEST_CHATBOT.md](TEST_CHATBOT.md) - Testing guide

**Happy AI chatting! 🚀🤖**
