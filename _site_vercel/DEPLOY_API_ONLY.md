# 🚀 Deploy API Proxy Only to Vercel

## 📋 Overview

This guide deploys **ONLY the API proxy** to Vercel.

Your setup:
- ✅ **Jekyll site**: Stays on IITM server (`facportal.iitm.ac.in`)
- ✅ **API proxy**: Deployed to Vercel (secure, free)
- ✅ **API key**: Stored securely on Vercel (not visible to users)

---

## 🎯 Step-by-Step Deployment

### Step 1: Login to Vercel

```bash
vercel login
```

**What happens:**
- Opens your browser
- Sign in with GitHub/GitLab/Email
- Creates free Vercel account (if needed)

---

### Step 2: Deploy API Proxy

```bash
cd "c:\Users\Aishwarya\Desktop\Madhan Kumar B\facultyhandbook"

# Deploy using API-only configuration
vercel --prod
```

**Answer these questions:**

```
? Set up and deploy? [Y/n]
→ Press Y

? Which scope?
→ Select your account

? Link to existing project? [y/N]
→ Press N (first time)

? What's your project's name?
→ faculty-handbook-api (or any name you want)

? In which directory is your code located?
→ ./ (press Enter)

? Want to override settings? [y/N]
→ Press N
```

**Wait ~1 minute...**

You'll see:
```
✅ Production: https://faculty-handbook-api.vercel.app
```

**🎉 Copy that URL! You'll need it!**

---

### Step 3: Add Your API Key to Vercel (SECURE!)

```bash
vercel env add CHATBOT_API_KEY production
```

When prompted:
```
? What's the value of CHATBOT_API_KEY?
→ AIzaSyCSqOBc5KfnOEbzzDvhW_vV7NaJV0u4dcA
```

Press Enter. Done! ✅

**Your API key is now:**
- ✅ Stored securely on Vercel servers
- ✅ Never visible in your code
- ✅ Never visible to users
- ✅ Encrypted at rest

---

### Step 4: Test the API Proxy

```bash
# Test that it's working
curl -X POST https://faculty-handbook-api.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test",
    "context": "This is a test",
    "apiType": "gemini"
  }'
```

You should get a response back! ✅

---

### Step 5: Update _config.yml

Open `_config.yml` and find line 234.

**Change from:**
```yaml
# api_endpoint: "https://YOUR-VERCEL-PROJECT.vercel.app/api/chat"
```

**Change to:**
```yaml
api_endpoint: "https://faculty-handbook-api.vercel.app/api/chat"
```

Replace `faculty-handbook-api` with YOUR actual Vercel project name!

Make sure to **UNCOMMENT** the line (remove the `#`).

---

### Step 6: Build Jekyll Site

```bash
bundle exec jekyll build
```

This creates the `_site/` folder with your complete static site.

---

### Step 7: Deploy to IITM Server

Upload the `_site/` folder to your IITM server.

**Methods:**
- **SCP**: `scp -r _site/* user@server:/path/to/fachandbook/`
- **SFTP**: Use FileZilla or WinSCP
- **Git**: Push to your server's Git repository
- **Rsync**: `rsync -avz _site/ user@server:/path/`

Use whatever method you normally use to deploy to `facportal.iitm.ac.in`.

---

### Step 8: Test Everything!

1. **Open your IITM site**: `https://facportal.iitm.ac.in/fachandbook/`

2. **Click the purple chatbot button**

3. **Ask**: "How do I apply for leave?"

4. **You should see**: Intelligent AI response! 🎉

---

## 🔒 Verify Security

### Test 1: API Key Not in HTML

```
1. Open: https://facportal.iitm.ac.in/fachandbook/
2. Press F12 (Developer Tools)
3. Go to Elements tab
4. Search (Ctrl+F): AIzaSy
5. Result: 0 matches ✅
```

### Test 2: API Key Not in Network Requests

```
1. F12 → Network tab
2. Ask chatbot a question
3. Look at request to Vercel
4. Check Payload
5. Result: Only query, context, apiType (NO API key!) ✅
```

### Test 3: Console Check

```
1. F12 → Console
2. Should see: "Using external AI API via secure proxy: gemini"
3. Should NOT see: Your actual API key ✅
```

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────┐
│  User's Browser                         │
│  Opens: facportal.iitm.ac.in/fachandbook│
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  IITM Server                            │
│  • Serves Jekyll static site            │
│  • Hosts chatbot UI                     │
│  • NO API key here!                     │
└──────────────┬──────────────────────────┘
               │
               ↓ User asks question
               │ POST request to Vercel
               ↓
┌─────────────────────────────────────────┐
│  Vercel Server                          │
│  URL: faculty-handbook-api.vercel.app   │
│  • Receives: {query, context, apiType}  │
│  • Gets API key from env vars (SECURE!) │
│  • Calls Gemini API                     │
│  • Returns answer                       │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  Google Gemini API                      │
│  • Processes request                    │
│  • Generates response                   │
│  • Returns to Vercel                    │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  User's Browser                         │
│  • Displays AI response                 │
│  • Shows source references              │
│  • User NEVER sees API key! 🔒         │
└─────────────────────────────────────────┘
```

---

## 🔄 Future Updates

### Update Your Site:

```bash
# 1. Make changes to your Jekyll files
# 2. Rebuild
bundle exec jekyll build

# 3. Upload _site/ to IITM server
# (Use your normal deployment method)
```

The API proxy doesn't change - no need to redeploy to Vercel!

### Update API Proxy:

If you modify `api/chat.js`:

```bash
vercel --prod
```

### Change API Key:

```bash
vercel env rm CHATBOT_API_KEY production
vercel env add CHATBOT_API_KEY production
# Paste new key
```

---

## 💰 Costs

| Service | Cost |
|---------|------|
| **Vercel API Proxy** | FREE (100GB bandwidth/month) |
| **Google Gemini API** | FREE (1,500 requests/day) |
| **IITM Server Hosting** | Already paid for |
| **Total NEW Costs** | **$0** 🎉 |

---

## 🐛 Troubleshooting

### "Cannot find module 'api/chat.js'"

**Problem**: Vercel didn't deploy the API folder

**Solution**:
```bash
# Make sure you're in the right directory
cd "c:\Users\Aishwarya\Desktop\Madhan Kumar B\facultyhandbook"

# Check api/ folder exists
ls api/

# Redeploy
vercel --prod
```

### CORS Error in Browser

**Problem**: Vercel blocking requests from IITM domain

**Solution**: Edit `api/chat.js` line 13-16:

```javascript
const allowedOrigins = [
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'https://facportal.iitm.ac.in',  // Add your domain!
];
```

Then redeploy:
```bash
vercel --prod
```

### Chatbot Still in Local Mode

**Problem**: `api_endpoint` not set correctly

**Solution**:
1. Check `_config.yml` line 234
2. Make sure it's UNCOMMENTED
3. Make sure URL is correct
4. Rebuild: `bundle exec jekyll build`
5. Redeploy to IITM server

### "Server configuration error"

**Problem**: API key not set on Vercel

**Solution**:
```bash
vercel env add CHATBOT_API_KEY production
# Paste: AIzaSyCSqOBc5KfnOEbzzDvhW_vV7NaJV0u4dcA
```

---

## ✅ Deployment Checklist

### Before Deploying:

- [x] Vercel CLI installed
- [x] API proxy code in `api/chat.js`
- [x] `.vercelignore` created
- [x] `vercel-api-only.json` created

### During Deployment:

- [ ] Logged into Vercel
- [ ] Deployed with `vercel --prod`
- [ ] Got Vercel URL
- [ ] Added API key to Vercel
- [ ] Tested API with curl

### After Deployment:

- [ ] Updated `_config.yml` with Vercel URL
- [ ] Built Jekyll site
- [ ] Deployed to IITM server
- [ ] Tested chatbot on IITM site
- [ ] Verified API key not visible
- [ ] Confirmed AI responses work

---

## 📁 Files Deployed to Vercel

**ONLY these files go to Vercel:**

```
Vercel (Minimal):
├── api/
│   └── chat.js          # API proxy function
├── .vercelignore        # Tells Vercel what to ignore
└── vercel-api-only.json # Configuration

That's it! ~10KB total
```

**Everything else stays on IITM server!**

---

## 🎯 URLs Summary

| What | URL |
|------|-----|
| **Your Jekyll Site** | `https://facportal.iitm.ac.in/fachandbook/` |
| **Chatbot (on your site)** | Same as above (embedded) |
| **API Proxy** | `https://faculty-handbook-api.vercel.app/api/chat` |
| **Vercel Dashboard** | `https://vercel.com/dashboard` |

---

## 📞 Need Help?

### Check Vercel Logs:

```bash
vercel logs
```

### Check Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Click your project
3. View deployments
4. Check function logs

### Test API Directly:

```bash
curl -X POST https://faculty-handbook-api.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"test","context":"test","apiType":"gemini"}'
```

Should return a response!

---

## 🎉 Success!

Once deployed, you have:

✅ **Secure API** - Key hidden on Vercel
✅ **Site on IITM** - Stays where it is
✅ **AI Powered** - Intelligent responses
✅ **Free** - No new costs
✅ **Fast** - Vercel's global CDN

---

## 📝 Quick Command Reference

```bash
# Deploy API to Vercel
vercel --prod

# Add API key
vercel env add CHATBOT_API_KEY production

# View logs
vercel logs

# Build Jekyll
bundle exec jekyll build

# Test API
curl -X POST https://YOUR-URL.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"test","context":"test","apiType":"gemini"}'
```

---

**Ready? Let's deploy!** 🚀

**Your API key**: `AIzaSyCSqOBc5KfnOEbzzDvhW_vV7NaJV0u4dcA`

**Just run:**
```bash
vercel login
vercel --prod
vercel env add CHATBOT_API_KEY production
```

**Good luck!** 🎉
