/**
 * Auto-regenerate embeddings when Jekyll rebuilds
 * This script watches for changes in the _site directory and automatically
 * regenerates embeddings when Jekyll completes a rebuild
 */

import { watch } from 'fs';
import { exec } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_DIR = join(__dirname, '_site');
const EMBEDDINGS_FILE = join(SITE_DIR, 'assets', 'js', 'search-embeddings.json');
const SEARCH_DATA = join(SITE_DIR, 'assets', 'js', 'search-data.json');

let regenerating = false;
let debounceTimer = null;

console.log('🔍 Watching for Jekyll rebuilds...');
console.log(`📁 Monitoring: ${SITE_DIR}`);
console.log(`📊 Embeddings file: ${EMBEDDINGS_FILE}`);
console.log('');

/**
 * Generate embeddings
 */
function generateEmbeddings() {
  if (regenerating) {
    console.log('⏳ Embeddings generation already in progress, skipping...');
    return;
  }

  // Check if search-data.json exists (indicates Jekyll build completed)
  if (!existsSync(SEARCH_DATA)) {
    console.log('⚠️  search-data.json not found yet, waiting for Jekyll build...');
    return;
  }

  regenerating = true;
  console.log('🚀 Generating embeddings...');

  const startTime = Date.now();

  exec('node generate-embeddings.js', (error, stdout, stderr) => {
    regenerating = false;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (error) {
      console.error(`❌ Error generating embeddings: ${error.message}`);
      console.error(stderr);
      return;
    }

    console.log(`✅ Embeddings generated successfully in ${duration}s`);
    if (stdout) {
      console.log(stdout);
    }
    console.log('👀 Watching for next rebuild...\n');
  });
}

/**
 * Debounced regeneration to avoid multiple triggers
 */
function scheduleRegeneration() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    generateEmbeddings();
  }, 2000); // Wait 2 seconds after last change
}

/**
 * Watch for changes in _site directory
 */
if (existsSync(SITE_DIR)) {
  // Initial generation if embeddings don't exist
  if (!existsSync(EMBEDDINGS_FILE) && existsSync(SEARCH_DATA)) {
    console.log('🔧 Initial embeddings generation...');
    generateEmbeddings();
  }

  // Watch for changes in search-data.json (indicates Jekyll rebuild)
  const searchDataDir = join(SITE_DIR, 'assets', 'js');

  watch(searchDataDir, { recursive: false }, (eventType, filename) => {
    if (filename === 'search-data.json' && eventType === 'change') {
      console.log('📝 Jekyll rebuild detected (search-data.json changed)');
      scheduleRegeneration();
    }
  });

  console.log('✅ Watcher started successfully!');
  console.log('💡 Tip: Keep this running while using "bundle exec jekyll serve"');
  console.log('');
} else {
  console.error(`❌ Directory not found: ${SITE_DIR}`);
  console.log('💡 Run "bundle exec jekyll build" first to create the _site directory');
  process.exit(1);
}

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n👋 Stopping watcher...');
  process.exit(0);
});
