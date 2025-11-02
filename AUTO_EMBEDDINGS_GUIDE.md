# Auto-Generating Embeddings Guide

## Problem Solved

Previously, embeddings had to be manually regenerated using `npm run generate-embeddings` every time Jekyll rebuilt the site. This caused the chatbot to fail with 404 errors on the embeddings file after every page refresh.

## Solution: Automatic Embeddings Generation

The new `watch-and-generate.js` script automatically regenerates embeddings whenever Jekyll rebuilds the site, ensuring the chatbot always has up-to-date embeddings.

## How to Use

### Option 1: Run Both Jekyll and Embeddings Watcher (Recommended)

**Terminal 1: Start Jekyll Server**
```bash
bundle exec jekyll serve
```

**Terminal 2: Start Embeddings Watcher**
```bash
npm run watch-embeddings
```

### Option 2: Initial Build Only

If you just want to build once without watching:

```bash
npm run build
```

This will:
1. Build the Jekyll site (`bundle exec jekyll build`)
2. Generate embeddings once (`npm run generate-embeddings`)

## How It Works

### The Watcher Script

The `watch-and-generate.js` script:

1. **Monitors** the `_site/assets/js/` directory for changes to `search-data.json`
2. **Detects** when Jekyll completes a rebuild (search-data.json gets updated)
3. **Automatically generates** embeddings after Jekyll finishes
4. **Debounces** multiple rapid changes to avoid unnecessary regenerations
5. **Provides feedback** with progress indicators and timing

### What You'll See

When the watcher starts:
```
🔍 Watching for Jekyll rebuilds...
📁 Monitoring: C:\...\facultyhandbook\_site
📊 Embeddings file: C:\...\search-embeddings.json

🔧 Initial embeddings generation...
✅ Watcher started successfully!
💡 Tip: Keep this running while using "bundle exec jekyll serve"
```

When Jekyll rebuilds and embeddings auto-generate:
```
📝 Jekyll rebuild detected (search-data.json changed)
🚀 Generating embeddings...
✅ Embeddings generated successfully in 4.45s
👀 Watching for next rebuild...
```

## Benefits

1. **No More 404 Errors**: Embeddings are always present and up-to-date
2. **Automatic**: No manual intervention needed
3. **Fast**: Only regenerates when needed (Jekyll rebuild detected)
4. **Developer-Friendly**: Clear progress indicators and timing
5. **Debounced**: Multiple rapid changes trigger only one regeneration

## Technical Details

### Files Modified/Created

- **watch-and-generate.js** (new): File watcher script
- **package.json**: Added `watch-embeddings` script

### How Detection Works

The script watches `_site/assets/js/search-data.json` because:
- Jekyll generates this file during every rebuild
- It contains the search index for all pages
- When it changes, we know Jekyll has finished rebuilding
- This triggers the embeddings generation

### Debouncing

The script waits 2 seconds after the last detected change before regenerating. This prevents:
- Multiple regenerations from a single Jekyll rebuild
- Wasted CPU cycles
- Interrupting ongoing generation processes

## Development Workflow

### Typical Development Session

1. Open **Terminal 1** and run: `bundle exec jekyll serve`
2. Open **Terminal 2** and run: `npm run watch-embeddings`
3. Edit your handbook pages as needed
4. Jekyll auto-rebuilds when you save files
5. Embeddings auto-regenerate after Jekyll finishes
6. Chatbot always has current embeddings

### Production Build

For production deployments:

```bash
npm run build
```

This creates a complete build with embeddings in one command.

## Troubleshooting

### Embeddings Not Generating

**Check**: Is the watcher running?
```bash
# You should see this in Terminal 2
👀 Watching for next rebuild...
```

**Fix**: Make sure you started `npm run watch-embeddings`

### 404 Error on Embeddings

**Check**: Do embeddings exist?
```bash
ls -la _site/assets/js/search-embeddings.json
```

**Fix**: If missing, the watcher will generate them automatically on the next Jekyll rebuild. Or manually run:
```bash
npm run generate-embeddings
```

### Watcher Not Detecting Changes

**Check**: Is Jekyll actually rebuilding?
- Look for "Regenerating..." messages in Jekyll terminal
- Check if search-data.json is being updated

**Fix**: Make sure Jekyll serve is running with auto-regeneration enabled (default behavior)

## Performance Notes

- **Initial generation**: ~4-5 seconds for 211 pages
- **File size**: ~1.8 MB for embeddings
- **Memory usage**: Minimal (Node.js watcher process)
- **CPU usage**: Spikes during generation, idle while watching

## Integration with Chatbot

The chatbot automatically:
1. Loads embeddings from `_site/assets/js/search-embeddings.json`
2. Falls back to keyword-only search if embeddings are missing
3. Uses hybrid search (70% semantic + 30% keyword) when embeddings are available

With the auto-generation watcher, embeddings are always available!

## Summary

**Before**: Manual regeneration required after every Jekyll rebuild
```bash
# Old workflow (tedious!)
bundle exec jekyll serve
# ... site changes ...
npm run generate-embeddings  # Manual!
# Refresh page
npm run generate-embeddings  # Manual again!
```

**After**: Fully automatic with the watcher
```bash
# New workflow (automatic!)
bundle exec jekyll serve       # Terminal 1
npm run watch-embeddings       # Terminal 2
# ... site changes ...
# Embeddings auto-regenerate!
# Refresh page - everything works!
```

🎉 **No more manual intervention needed!**
