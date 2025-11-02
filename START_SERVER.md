# Faculty Handbook - Server Startup Guide

## Quick Start (Recommended)

Run **ONE command** to start both Jekyll server and auto-embeddings watcher:

```bash
npm run serve
```

This will:
- ✅ Start Jekyll server at `http://127.0.0.1:4000/fachandbook/`
- ✅ Watch for Jekyll rebuilds and auto-generate embeddings
- ✅ Keep embeddings always up-to-date

## Manual Method (Alternative)

If you prefer to run them separately in different terminals:

### Terminal 1: Jekyll Server
```bash
bundle exec jekyll serve
```

### Terminal 2: Embeddings Watcher
```bash
npm run watch-embeddings
```

## First Time Setup

Generate embeddings for the first time:
```bash
npm run generate-embeddings
```

## Build for Production

Build the site with embeddings:
```bash
npm run build
```

This runs:
1. `bundle exec jekyll build` - Builds the Jekyll site
2. `npm run generate-embeddings` - Generates embeddings

## How It Works

The auto-embeddings system:
1. **Watches** `_site/assets/js/search-data.json` for changes
2. **Detects** when Jekyll rebuilds the site
3. **Auto-generates** embeddings from the new content
4. **No errors** - Chatbot always has embeddings available

## Troubleshooting

### Embeddings 404 Error
If you see embeddings not found:
1. Check if embeddings watcher is running
2. Manually generate: `npm run generate-embeddings`
3. Or use the combined command: `npm run serve`

### Chatbot Not Working
1. Refresh browser with hard reload (Ctrl+Shift+R)
2. Check console for errors
3. Verify API endpoint is accessible

---

**Note**: Always use `npm run serve` for development to ensure embeddings are auto-generated!
