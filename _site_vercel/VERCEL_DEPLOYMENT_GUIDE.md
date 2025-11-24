# Vercel Deployment Guide - Fix 500 Error

## Problem

You're getting a `500 Internal Server Error` from your Vercel API proxy:

```
POST https://faculty-handbook-89uvn4s9h-madhaniitms-projects.vercel.app/api/chat 500
```

## Root Cause

Your deployed Vercel instance has **outdated code** that doesn't include the conversation memory features. The local `api/chat.js` has been updated with conversation history support, but Vercel is still running the old version.

## Solution: Redeploy to Vercel

### Method 1: Automatic Deployment via Git (Recommended)

If your Vercel project is connected to a Git repository:

1. **Commit your changes:**
   ```bash
   git add api/chat.js assets/js/chatbot.js _sass/chatbot.scss _config.yml
   git commit -m "Add conversation memory and auto-embeddings features"
   ```

2. **Push to repository:**
   ```bash
   git push origin main
   ```

3. **Vercel auto-deploys:**
   - Vercel detects the push
   - Automatically builds and deploys
   - Check deployment status at: https://vercel.com/dashboard

4. **Wait for deployment** (usually 1-2 minutes)

5. **Test the chatbot** - the 500 error should be resolved!

### Method 2: Manual Deployment via Vercel CLI

If you're not using Git or want to deploy directly:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Confirm the deployment** and test!

### Method 3: Manual Upload via Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your project: `faculty-handbook`
3. Click **"Redeploy"** or upload files manually
4. Wait for deployment to complete
5. Test!

## Verify Environment Variables

Make sure your Vercel project has the API key set:

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to: **Settings → Environment Variables**
4. Verify `CHATBOT_API_KEY` is set with your Gemini API key
5. If missing, add it:
   - **Name:** `CHATBOT_API_KEY`
   - **Value:** Your Gemini API key (starts with `AIza...`)
   - **Environments:** Production, Preview, Development (select all)
6. Click **"Save"**
7. **Redeploy** the project for changes to take effect

## Testing Locally Before Deploying

To test the API locally before deploying to Vercel:

### Step 1: Create `.env` file

Create a file named `.env` in your project root:

```env
CHATBOT_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

**Important:** Make sure `.env` is in your `.gitignore` so you don't commit your API key!

### Step 2: Start Local API Server

```bash
node test-api-local.js
```

You should see:
```
🚀 Local API Test Server Running
📍 Server URL: http://localhost:3000
📡 API Endpoint: http://localhost:3000/api/chat
```

### Step 3: Update Jekyll Config for Local Testing

Edit `_config.yml` temporarily:

```yaml
chatbot:
  enabled: true
  # For local testing:
  api_endpoint: "http://localhost:3000/api/chat"
  api_type: "gemini"
```

### Step 4: Restart Jekyll

```bash
# Stop Jekyll (Ctrl+C)
bundle exec jekyll serve
```

### Step 5: Test Chatbot

Open the site and test the chatbot. It should work with conversation memory!

### Step 6: Restore Production Config

After testing, restore `_config.yml`:

```yaml
chatbot:
  enabled: true
  # Production (Vercel):
  api_endpoint: "https://faculty-handbook-89uvn4s9h-madhaniitms-projects.vercel.app/api/chat"
  api_type: "gemini"
```

## Files Changed (Need to be Deployed)

These files have conversation memory features and need to be on Vercel:

1. **api/chat.js** - Backend API with conversation history support
2. **assets/js/chatbot.js** - Frontend with conversation memory
3. **_sass/chatbot.scss** - Styles for suggestion chips
4. **_config.yml** - Updated API endpoint config

## What the New Code Does

The updated `api/chat.js` now:
- Accepts `conversationHistory` parameter
- Includes conversation context in Gemini API prompts
- Provides better follow-up question understanding
- Returns more detailed answers (3-5 sentences)

## Troubleshooting

### Still Getting 500 Error After Deployment?

**Check Vercel Logs:**
1. Go to: https://vercel.com/dashboard
2. Click on your project
3. Go to **"Deployments"**
4. Click on the latest deployment
5. Click **"Functions"** tab
6. Click on `/api/chat`
7. View the runtime logs to see the actual error

Common issues:
- **API key not set**: Add `CHATBOT_API_KEY` in environment variables
- **API key invalid**: Verify your Gemini API key is correct
- **Rate limit exceeded**: Wait a bit or check your Gemini API quota
- **CORS issues**: Check allowed origins in `api/chat.js`

### API Key Issues

If you see "Server configuration error":
- API key is not set in Vercel environment variables
- Add it in: Settings → Environment Variables → `CHATBOT_API_KEY`

### CORS Issues

If you see CORS errors:
- Add your domain to `allowedOrigins` in `api/chat.js` (lines 9-14)
- Redeploy after making changes

### Function Timeout

If requests are timing out:
- Check `vercel.json` - `maxDuration` is set to 10 seconds
- Gemini API should respond within 2-3 seconds typically
- If needed, increase in `vercel.json`:
  ```json
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
  ```

## Quick Fix Summary

**TL;DR - Do this now:**

1. ✅ **Commit changes:**
   ```bash
   git add .
   git commit -m "Add conversation memory features"
   git push origin main
   ```

2. ✅ **Wait for Vercel auto-deployment** (2 minutes)

3. ✅ **Verify environment variables** are set in Vercel dashboard

4. ✅ **Test chatbot** - 500 error should be gone!

## Production Checklist

Before going live:
- [ ] API key set in Vercel environment variables
- [ ] Latest code deployed to Vercel
- [ ] Tested chatbot with conversation memory
- [ ] Embeddings auto-generation working
- [ ] CORS configured for production domain
- [ ] Error handling working
- [ ] Rate limiting appropriate

## Support

If you continue to have issues:
1. Check Vercel function logs
2. Test locally first with `test-api-local.js`
3. Verify API key is valid
4. Check Gemini API quota/billing

---

**Next Steps:** Deploy to Vercel and test! The conversation memory features will work once the updated code is deployed.
