# ⚡ Quick Reference - Content Updates

## Every Time You Update Content:

```bash
npm run build
```

That's it! This single command:
1. Builds Jekyll
2. Regenerates embeddings for semantic search
3. Updates everything automatically

---

## Then Deploy:

Upload `_site/` folder to your server.

---

## Commands Reference:

| What You Want | Command |
|---------------|---------|
| **Update content** | `npm run build` |
| **Test locally** | `bundle exec jekyll serve` |
| **Just embeddings** | `npm run generate-embeddings` |
| **Clean rebuild** | `rm -rf _site && npm run build` |

---

## Files That Update Automatically:

✅ `_site/assets/js/search-data.json` (search index)
✅ `_site/assets/js/search-embeddings.json` (semantic vectors)
✅ All HTML pages

---

## Remember:

❌ **Don't** run just `bundle exec jekyll build` (misses embeddings)
✅ **Do** run `npm run build` (does everything)

---

## Test Checklist:

- [ ] Run `npm run build`
- [ ] Check `_site/assets/js/search-embeddings.json` timestamp is recent
- [ ] Test locally
- [ ] Deploy to server
- [ ] Verify chatbot works on production

---

**Need more details?** See [UPDATE_CONTENT_GUIDE.md](UPDATE_CONTENT_GUIDE.md)
