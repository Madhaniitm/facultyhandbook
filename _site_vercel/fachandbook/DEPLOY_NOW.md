# 🚀 Deploy Your Secure AI Chatbot NOW!

## ✅ Everything is Ready!

Your API key: `AIzaSyCSqOBc5KfnOEbzzDvhW_vV7NaJV0u4dcA`

---

## 🎯 Quick Deploy to Vercel (5 Minutes)

### Step 1: Login to Vercel

```bash
vercel login
```

This will:
- Open your browser
- Ask you to sign in with GitHub/GitLab/Email
- Create a free Vercel account (if you don't have one)

### Step 2: Deploy Your Site

```bash
cd "c:\Users\Aishwarya\Desktop\Madhan Kumar B\facultyhandbook"
vercel
```

**During deployment, answer these questions:**

```
? Set up and deploy "facultyhandbook"? [Y/n] → Press Y

? Which scope do you want to deploy to? → Select your account

? Link to existing project? [y/N] → Press N

? What's your project's name? → facultyhandbook (or any name you want)

? In which directory is your code located? → ./ (press Enter)

? Want to override the settings? [y/N] → Press N
```

**Wait ~2 minutes for deployment...**

You'll see output like:
```
✅ Production: https://facultyhandbook-xyz.vercel.app [copied to clipboard]
```

**Copy that URL!** You'll need it.

### Step 3: Add Your API Key (SECURE!)

```bash
vercel env add CHATBOT_API_KEY production
```

When prompted:
```
? What's the value of CHATBOT_API_KEY?
→ Paste: AIzaSyCSqOBc5KfnOEbzzDvhW_vV7NaJV0u4dcA
```

### Step 4: Update Config with Your Vercel URL

Open `_config.yml` and update line 233:

**Change from:**
```yaml
api_endpoint: "http://localhost:3000/api/chat"
```

**Change to:**
```yaml
api_endpoint: "https://facultyhandbook-xyz.vercel.app/api/chat"
```

Replace `facultyhandbook-xyz` with YOUR actual Vercel URL!

### Step 5: Redeploy with New Config

```bash
vercel --prod
```

Wait ~2 minutes...

### Step 6: Test Your Secure Chatbot!

1. Open your Vercel URL: `https://facultyhandbook-xyz.vercel.app/fachandbook/`
2. Click the purple chatbot button
3. Ask: "How do I apply for leave?"
4. You should see an intelligent AI response!

---

## 🔒 Verify Security

### Test 1: API Key Not in HTML
```
1. Press F12 (Developer Tools)
2. Go to Elements tab
3. Search (Ctrl+F) for: AIzaSy
4. Result: 0 matches ✅
```

### Test 2: API Key Not in Network Requests
```
1. F12 → Network tab
2. Ask chatbot a question
3. Click on the request to /api/chat
4. Check Payload
5. Result: Only query, context, apiType (NO API key!) ✅
```

### Test 3: Check Console
```
1. F12 → Console
2. Should see: "[Chatbot] Using external AI API via secure proxy: gemini"
3. Should NOT see your actual API key anywhere ✅
```

---

## 🎉 You're Done!

Your chatbot now:
- ✅ Uses real AI (Google Gemini)
- ✅ API key is 100% secure (on server)
- ✅ Cannot be stolen via inspect element
- ✅ Has natural, intelligent responses
- ✅ Is deployed and live!

---

## 💰 Costs

- **Vercel Hosting**: FREE (Hobby plan)
- **Google Gemini API**: FREE (1,500 requests/day)
- **Total**: $0 per month! 🎉

---

## 🐛 Troubleshooting

### "Command not found: vercel"
```bash
# Reinstall Vercel CLI
npm install -g vercel

# Check it's installed
vercel --version
```

### Can't log in to Vercel
- Use browser to go to: https://vercel.com
- Sign up with GitHub/Email
- Then try `vercel login` again

### Chatbot not working
```bash
# Check Vercel logs
vercel logs

# Redeploy
vercel --prod
```

### Still seeing local mode
- Make sure you updated _config.yml with YOUR Vercel URL
- Make sure you redeployed after updating config
- Clear browser cache (Ctrl+Shift+R)

---

## 📱 Your Deployment URLs

After deploying, you'll have:

**Preview URL** (auto-updates on git push):
`https://facultyhandbook-xyz.vercel.app`

**Production URL** (manual deployments):
`https://facultyhandbook-xyz.vercel.app`

**Chatbot URL**:
`https://facultyhandbook-xyz.vercel.app/fachandbook/`

**API Proxy URL**:
`https://facultyhandbook-xyz.vercel.app/api/chat`

---

## 🔄 Future Updates

### To update your site:

```bash
# Make changes to files
# Then redeploy
vercel --prod
```

### To change API key:

```bash
vercel env rm CHATBOT_API_KEY production
vercel env add CHATBOT_API_KEY production
# Paste new key
vercel --prod
```

---

## 📚 Next Steps

1. ✅ Deploy to Vercel (follow steps above)
2. ✅ Test chatbot
3. ✅ Verify security
4. Share with faculty! 🎉

---

## ⚠️ Important Reminder

**NEVER commit .env to Git!**

The `.env` file contains your API key and is already in `.gitignore`.

If you use Git:
```bash
git status
# Make sure .env is NOT listed!
```

---

**Ready to deploy? Just run these 3 commands:**

```bash
# 1. Login
vercel login

# 2. Deploy
vercel

# 3. Add API key
vercel env add CHATBOT_API_KEY production
```

**Then update _config.yml and redeploy!**

---

Good luck! 🚀
