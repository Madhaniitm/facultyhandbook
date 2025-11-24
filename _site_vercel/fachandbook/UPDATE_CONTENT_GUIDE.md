# 📝 Content Update Guide

## When You Update Handbook Content

Every time you add, edit, or delete pages in your Faculty Handbook, follow these steps to ensure the chatbot stays up-to-date with semantic search.

---

## 🔄 Quick Update Process

### Step 1: Edit Your Content
Make changes to your Markdown files in the handbook:
- Add new pages
- Update existing content
- Delete old pages
- Modify text, headings, or structure

### Step 2: Rebuild Everything
Run this **single command**:

```bash
npm run build
```

**What this does:**
1. ✅ Runs Jekyll build (`bundle exec jekyll build`)
2. ✅ Generates new search index (`search-data.json`)
3. ✅ **Automatically regenerates embeddings** for semantic search
4. ✅ Updates `search-embeddings.json` with latest content

**Time**: ~30 seconds for 200 pages

### Step 3: Deploy to Server
Upload the `_site/` folder to your IITM server:

```bash
# Example using SCP
scp -r _site/* user@facportal.iitm.ac.in:/path/to/fachandbook/

# Or use your preferred method (SFTP, rsync, Git, etc.)
```

**Done!** ✨ Your chatbot now has updated content with semantic search.

---

## 📋 Detailed Workflow

### For Local Testing

```bash
# 1. Make your content changes
# Edit files in docs/, _config.yml, etc.

# 2. Build + Generate Embeddings
npm run build

# 3. Start local server
bundle exec jekyll serve

# 4. Test chatbot at http://127.0.0.1:4000/fachandbook/
# Ask questions to verify new content appears
```

### For Production Deployment

```bash
# 1. Build locally
npm run build

# 2. Deploy _site/ folder to IITM server
# (Use your normal deployment method)

# 3. Verify on https://facportal.iitm.ac.in/fachandbook/
```

---

## ⚙️ What Gets Updated Automatically

When you run `npm run build`:

| File | What It Contains | Auto-Updated? |
|------|------------------|---------------|
| `_site/assets/js/search-data.json` | Page titles, content, URLs | ✅ Yes |
| `_site/assets/js/search-embeddings.json` | Semantic embeddings (vectors) | ✅ Yes |
| `_site/index.html` | Generated HTML pages | ✅ Yes |

---

## 🎯 Examples of Content Changes

### Example 1: Add a New Page

**File**: `docs/new-policy.md`
```markdown
---
title: New Research Policy
---

# New Research Policy

This is a new policy about research funding...
```

**Update Process**:
```bash
npm run build
# Embedding for "New Research Policy" is automatically created
```

**Result**: Chatbot can now answer questions about the new policy using semantic search!

---

### Example 2: Update Existing Content

**Before** (`docs/leaves/casual-leave.md`):
```markdown
Casual leave is limited to 12 days per year.
```

**After**:
```markdown
Casual leave is limited to 15 days per year starting 2025.
```

**Update Process**:
```bash
npm run build
# Embedding is regenerated with new "15 days" information
```

**Result**: Chatbot now gives updated answer when asked about casual leave!

---

### Example 3: Delete a Page

**Action**: Delete `docs/old-rules.md`

**Update Process**:
```bash
npm run build
# Embedding for deleted page is automatically removed
```

**Result**: Chatbot no longer references the deleted page!

---

## 🚨 Important Notes

### Always Run `npm run build` After Content Changes

**Don't forget!** If you only run `bundle exec jekyll build`, the embeddings won't update and semantic search will use old content.

✅ **Correct**: `npm run build` (builds Jekyll + regenerates embeddings)
❌ **Incorrect**: `bundle exec jekyll build` (only builds Jekyll, embeddings stay old)

### Embedding Generation Time

| Pages | Time |
|-------|------|
| ~50 pages | ~10 seconds |
| ~200 pages | ~30 seconds |
| ~500 pages | ~1 minute |

First run downloads the model (~100MB), then it's cached.

### File Sizes

After update:
- `search-data.json`: ~150-300 KB (text content)
- `search-embeddings.json`: ~1.5-2 MB (vector embeddings)

Both files are automatically compressed by the server (gzip).

---

## 🔍 Verify Updates Work

### Test Locally

1. Run `npm run build`
2. Start server: `bundle exec jekyll serve`
3. Open http://127.0.0.1:4000/fachandbook/
4. Open browser console (F12)
5. Look for:
   ```
   [Chatbot] Embeddings loaded: 211 pages ← Should match your page count
   [Chatbot] Semantic search enabled ✓
   ```
6. Ask chatbot about your new/updated content

### Test on Production

1. Deploy to IITM server
2. Open https://facportal.iitm.ac.in/fachandbook/
3. Check browser console for successful embedding load
4. Test with questions about new content

---

## 🐛 Troubleshooting

### "Embeddings not found, falling back to keyword search"

**Problem**: `search-embeddings.json` wasn't generated or deployed.

**Solution**:
```bash
# Regenerate embeddings
npm run generate-embeddings

# Or full rebuild
npm run build

# Make sure _site/assets/js/search-embeddings.json exists
ls _site/assets/js/search-embeddings.json
```

### Chatbot gives old information

**Problem**: Forgot to rebuild after content update.

**Solution**:
```bash
npm run build
# Then redeploy _site/ folder
```

### Embedding generation fails

**Problem**: Node modules not installed or corrupted.

**Solution**:
```bash
# Reinstall dependencies
npm install

# Try again
npm run build
```

---

## 📦 Backup Recommendations

### Before Major Updates

```bash
# Backup current embeddings (optional)
cp _site/assets/js/search-embeddings.json search-embeddings.backup.json

# Make your content changes

# Rebuild
npm run build

# If something goes wrong, restore:
cp search-embeddings.backup.json _site/assets/js/search-embeddings.json
```

### Version Control

Add to `.gitignore` (already done):
```
_site/
node_modules/
```

**Do commit**:
- Your Markdown content files
- `package.json`
- `generate-embeddings.js`
- Configuration files

**Don't commit**:
- `_site/` folder (generated)
- `node_modules/` (installed)
- Generated JSON files (auto-created)

---

## ⏱️ Update Schedule Recommendations

### Minor Content Updates (Few Pages Changed)
- Frequency: As needed
- Process: Quick `npm run build` and deploy
- Time: ~1 minute

### Major Content Overhaul (Many Pages Changed)
- Frequency: Quarterly or as needed
- Process: Full rebuild, thorough testing
- Time: ~5-10 minutes

### Weekly/Monthly Small Updates
```bash
# Simple workflow
git pull                    # Get latest changes
npm run build              # Rebuild + embeddings
# Deploy to server
```

---

## 🎯 Quick Reference Commands

```bash
# Full rebuild (use this most often)
npm run build

# Just regenerate embeddings (if Jekyll is already built)
npm run generate-embeddings

# Local development server
bundle exec jekyll serve

# Check if embeddings were generated
ls -lh _site/assets/js/search-embeddings.json

# Clean build (start fresh)
rm -rf _site node_modules
npm install
npm run build
```

---

## 📊 What Changes Need Rebuild?

| Change Type | Need `npm run build`? |
|-------------|----------------------|
| Add new page | ✅ Yes |
| Edit page content | ✅ Yes |
| Delete page | ✅ Yes |
| Change page title | ✅ Yes |
| Update `_config.yml` | ✅ Yes |
| Change CSS/styling | ❌ No (just Jekyll build) |
| Update chatbot code | ❌ No (just deploy new JS) |
| Change page order/navigation | ✅ Yes |

**Rule of thumb**: If the **content** changes, run `npm run build`.

---

## 💡 Pro Tips

### Tip 1: Automate with Git Hooks
Create `.git/hooks/post-merge`:
```bash
#!/bin/bash
echo "Content updated, regenerating embeddings..."
npm run build
echo "Done! Don't forget to deploy _site/ folder"
```

### Tip 2: Test Before Deploy
Always test locally first:
```bash
npm run build
bundle exec jekyll serve
# Test at http://localhost:4000
# Then deploy
```

### Tip 3: Monitor Embedding Quality
Check console logs when testing:
```javascript
// Browser console shows:
[Chatbot] Top results: [
  { title: "Your Page", semantic: 0.892, keyword: 0.450, combined: 0.759 }
]
// High semantic score (>0.7) = good match!
```

---

## ✅ Checklist for Content Updates

- [ ] Made content changes to Markdown files
- [ ] Run `npm run build`
- [ ] Check `_site/assets/js/search-embeddings.json` was updated (check file timestamp)
- [ ] Test locally with `bundle exec jekyll serve`
- [ ] Ask chatbot about new/updated content
- [ ] Deploy `_site/` folder to IITM server
- [ ] Verify on production site
- [ ] Check browser console for successful embedding load
- [ ] Test production chatbot with queries

---

## 🆘 Need Help?

### Common Issues

1. **"Model download failed"**
   - Check internet connection
   - Model is cached after first download (~100MB)

2. **"Out of memory"**
   - Close other applications
   - Embedding generation needs ~2GB RAM

3. **"ENOENT: no such file or directory"**
   - Run `bundle exec jekyll build` first
   - Then `npm run generate-embeddings`

### Still Stuck?

1. Check the console output for errors
2. Verify Node.js version: `node --version` (should be 14+)
3. Reinstall dependencies: `rm -rf node_modules && npm install`
4. Try clean build: `rm -rf _site && npm run build`

---

## 🎉 Summary

**Remember**: Every content update = `npm run build` + deploy

This ensures your chatbot always has:
- ✅ Latest content
- ✅ Updated semantic search
- ✅ Accurate page references
- ✅ Best possible answers

**One command does it all**: `npm run build` 🚀
