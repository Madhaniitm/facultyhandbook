# 🔒 Secure AI Setup Guide

## ✅ Your API Key is Now Secure!

Your chatbot now uses a **serverless proxy** that keeps your API key completely hidden from users.

---

## 🛡️ Security Architecture

### Before (INSECURE ❌)
```
Browser (User)
    ↓
    Views HTML → Sees API key in <meta> tag! 😱
    ↓
    Copies key and abuses it
```

### After (SECURE ✅)
```
Browser (User)
    ↓
    Sends question to: /api/chat
    ↓
Your Server (Vercel/Netlify)
    ↓
    API key stored in environment variables (hidden)
    ↓
    Calls AI API (Gemini/OpenAI/Claude)
    ↓
    Returns answer to browser

User NEVER sees the API key! 🔒
```

---

## 🚀 Quick Deployment (Choose One)

### Option A: Deploy to Vercel (Recommended - Easier)

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Login**
```bash
vercel login
```

**Step 3: Deploy**
```bash
cd "c:\Users\Aishwarya\Desktop\Madhan Kumar B\facultyhandbook"
vercel
```

**Step 4: Add API Key (Secure!)**
```bash
# For Gemini
vercel env add CHATBOT_API_KEY
# When prompted, paste your API key: AIzaSy...

# For production
vercel env add CHATBOT_API_KEY production
```

**Step 5: Update Config**

Edit [_config.yml](_config.yml):
```yaml
chatbot:
  enabled: true
  api_endpoint: "https://your-project.vercel.app/api/chat"
  api_type: "gemini"
  # NO api_key needed - it's on the server!
```

**Step 6: Redeploy**
```bash
vercel --prod
```

---

### Option B: Deploy to Netlify

**Step 1: Install Netlify CLI**
```bash
npm install -g netlify-cli
```

**Step 2: Login**
```bash
netlify login
```

**Step 3: Initialize**
```bash
cd "c:\Users\Aishwarya\Desktop\Madhan Kumar B\facultyhandbook"
netlify init
```

**Step 4: Add API Key (Secure!)**
```bash
# Go to Netlify dashboard
# Site settings → Environment variables
# Add: CHATBOT_API_KEY = AIzaSy...
```

Or via CLI:
```bash
netlify env:set CHATBOT_API_KEY "AIzaSy..."
```

**Step 5: Update Config**

Edit [_config.yml](_config.yml):
```yaml
chatbot:
  enabled: true
  api_endpoint: "https://your-site.netlify.app/.netlify/functions/chat"
  api_type: "gemini"
  # NO api_key needed - it's on the server!
```

**Step 6: Deploy**
```bash
netlify deploy --prod
```

---

## 🧪 Local Testing with Proxy

### Step 1: Create .env file
```bash
# Copy example
cp .env.example .env

# Edit .env and add your key
nano .env
```

In `.env`:
```
CHATBOT_API_KEY=AIzaSy...  # Your actual key
```

### Step 2: Install Vercel CLI for local testing
```bash
npm install -g vercel
```

### Step 3: Run local dev server
```bash
# Terminal 1: Run API proxy locally
vercel dev

# Terminal 2: Run Jekyll
bundle exec jekyll serve
```

### Step 4: Update local config

Edit [_config.yml](_config.yml):
```yaml
chatbot:
  enabled: true
  api_endpoint: "http://localhost:3000/api/chat"  # Local proxy
  api_type: "gemini"
```

### Step 5: Test
```
Open: http://localhost:4000/fachandbook/
Click chatbot
Ask question
Check console: "Using external AI API via secure proxy"
```

---

## 🔐 Security Verification Checklist

### ✅ Before Deploying

- [ ] API key is in `.env` file (not in `_config.yml`)
- [ ] `.env` is in `.gitignore`
- [ ] No `api_key` in `_config.yml`
- [ ] Only `api_endpoint` in `_config.yml`
- [ ] Tested locally with `vercel dev`

### ✅ After Deploying

- [ ] API key added to Vercel/Netlify environment variables
- [ ] `api_endpoint` points to deployed proxy
- [ ] Open browser → Inspect Element → Search for "AIza" → Should find NOTHING
- [ ] Open browser → Network tab → Check requests → No API key visible
- [ ] Chatbot works and shows: "Using external AI API via secure proxy"

---

## 🔍 How to Verify Your Key is Hidden

### Test 1: Inspect HTML
```
1. Open your site
2. Press F12 (Developer Tools)
3. Go to Elements tab
4. Search for your API key (Ctrl+F)
5. Result: Should be 0 matches ✅
```

### Test 2: Check Network Requests
```
1. Open Developer Tools (F12)
2. Go to Network tab
3. Ask chatbot a question
4. Look at the request to /api/chat
5. Check Request Payload
6. Result: Only query, context, apiType (no API key!) ✅
```

### Test 3: View Page Source
```
1. Right-click → View Page Source
2. Search (Ctrl+F) for "chatbot-api"
3. Result: Should see:
   - chatbot-api-endpoint ✅
   - chatbot-api-type ✅
   - chatbot-use-proxy ✅
   - NO chatbot-api-key ✅
```

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Chatbot UI                                        │ │
│  │  - Asks question: "How do I apply for leave?"     │ │
│  │  - Searches local handbook content                │ │
│  │  - Sends to proxy: {query, context, apiType}      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │ POST /api/chat
                      │ { query: "...", context: "...", apiType: "gemini" }
                      │ (NO API KEY!)
                      ↓
┌─────────────────────────────────────────────────────────┐
│              Your Server (Vercel/Netlify)                │
│  ┌────────────────────────────────────────────────────┐ │
│  │  API Proxy Function (/api/chat.js)                │ │
│  │  1. Receives request                              │ │
│  │  2. Gets API key from environment variable        │ │
│  │     CHATBOT_API_KEY = "AIzaSy..." (SECURE!)       │ │
│  │  3. Validates request                             │ │
│  │  4. Adds API key to request                       │ │
│  │  5. Calls AI API                                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │ POST with API key
                      │ Authorization: Bearer AIzaSy...
                      ↓
┌─────────────────────────────────────────────────────────┐
│              AI Service (Gemini/OpenAI/Claude)           │
│  - Processes request                                     │
│  - Generates response using handbook context             │
│  - Returns answer                                        │
└─────────────────────┬───────────────────────────────────┘
                      │ Response
                      ↓
┌─────────────────────────────────────────────────────────┐
│              Your Server (Vercel/Netlify)                │
│  - Receives AI response                                  │
│  - Removes any sensitive data                            │
│  - Returns clean answer to browser                       │
└─────────────────────┬───────────────────────────────────┘
                      │ { answer: "..." }
                      ↓
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│  - Receives answer                                       │
│  - Displays with typing animation                        │
│  - Shows source references                               │
│  - User NEVER sees API key! 🔒                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Configuration Files

### File Structure
```
facultyhandbook/
├── api/
│   └── chat.js                    # Serverless function (proxy)
├── _config.yml                     # Site config (NO API key!)
├── .env                            # Local API key (ignored by Git)
├── .env.example                    # Example template
├── .gitignore                      # Ignores .env
├── vercel.json                     # Vercel config
├── netlify.toml                    # Netlify config
└── SECURE_AI_SETUP.md              # This file
```

### _config.yml (Safe to commit)
```yaml
chatbot:
  enabled: true
  api_endpoint: "https://your-site.vercel.app/api/chat"
  api_type: "gemini"
  # NO api_key here!
```

### .env (NEVER commit!)
```
CHATBOT_API_KEY=AIzaSy...
```

### vercel.json
```json
{
  "env": {
    "CHATBOT_API_KEY": "@chatbot-api-key"
  }
}
```

---

## 💰 Cost with Proxy

### Proxy Costs
- **Vercel Free Tier**: 100GB bandwidth, 100GB-hours compute
- **Netlify Free Tier**: 100GB bandwidth, 125k function invocations
- **Both**: More than enough for most handbooks!

### AI API Costs (Same as Before)
- **Gemini**: FREE (60 req/min, 1500 req/day)
- **OpenAI**: ~$0.001 per query
- **Claude**: ~$0.001 per query

**Total Cost**: Still $0-$1/month for typical usage!

---

## 🐛 Troubleshooting

### Error: "Server configuration error"
```
Problem: API key not set in environment variables
Solution:
  vercel env add CHATBOT_API_KEY
  # Or Netlify dashboard → Environment variables
```

### Error: "Proxy error: 405"
```
Problem: CORS issue or wrong HTTP method
Solution: Check api/chat.js has correct CORS headers
```

### Error: "Failed to fetch"
```
Problem: Wrong API endpoint URL
Solution: Check _config.yml api_endpoint matches your deployed URL
```

### Chatbot uses local mode instead of AI
```
Problem: api_endpoint not set or wrong
Solution:
  1. Check _config.yml has api_endpoint
  2. Rebuild: bundle exec jekyll build
  3. Check browser console for errors
```

### API key still visible in HTML
```
Problem: Old code cached or config wrong
Solution:
  1. Hard refresh (Ctrl+Shift+R)
  2. Check _includes/components/chatbot.html
  3. Should NOT have <meta name="chatbot-api-key">
  4. Rebuild site
```

---

## 🔄 Updating Configuration

### Change AI Provider

Edit [_config.yml](_config.yml):
```yaml
chatbot:
  api_type: "gemini"    # or "openai" or "claude"
```

Update environment variable:
```bash
# Vercel
vercel env rm CHATBOT_API_KEY production
vercel env add CHATBOT_API_KEY production
# Paste new key

# Netlify
netlify env:set CHATBOT_API_KEY "new-key"
```

Redeploy:
```bash
vercel --prod
# or
netlify deploy --prod
```

### Change API Endpoint

Just update [_config.yml](_config.yml):
```yaml
chatbot:
  api_endpoint: "https://new-url.com/api/chat"
```

Rebuild:
```bash
bundle exec jekyll build
```

---

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `CHATBOT_API_KEY` | Yes | Your AI API key | `AIzaSy...` |
| `NODE_ENV` | No | Environment mode | `production` |

---

## 🎉 Success Criteria

Your setup is secure when:

✅ API key is NOT in `_config.yml`
✅ API key is NOT in HTML source
✅ API key is NOT in browser network requests
✅ API key IS in environment variables (Vercel/Netlify)
✅ Chatbot still works with AI responses
✅ Console shows: "Using external AI API via secure proxy"
✅ `.env` is in `.gitignore`
✅ No secrets committed to Git

---

## 🔗 Additional Resources

- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
- **Netlify Environment Variables**: https://docs.netlify.com/environment-variables/overview/
- **Serverless Functions**: https://vercel.com/docs/concepts/functions/serverless-functions
- **API Security Best Practices**: https://owasp.org/www-project-api-security/

---

## 📞 Need Help?

1. Check browser console for errors
2. Check server logs (Vercel/Netlify dashboard)
3. Verify environment variables are set
4. Test locally with `vercel dev`
5. Review this guide again

---

## 🎯 Quick Reference Commands

```bash
# Local development
vercel dev                          # Run proxy locally
bundle exec jekyll serve            # Run Jekyll

# Deployment (Vercel)
vercel                              # Deploy to preview
vercel --prod                       # Deploy to production
vercel env add CHATBOT_API_KEY      # Add API key
vercel logs                         # View logs

# Deployment (Netlify)
netlify deploy                      # Deploy to preview
netlify deploy --prod               # Deploy to production
netlify env:set KEY "value"         # Add API key
netlify functions:list              # List functions
netlify logs                        # View logs

# Git safety
git status                          # Check what's staged
git diff                            # Check changes
# Make sure .env is NOT in the list!
```

---

**Your API key is now SECURE! 🔒🎉**
