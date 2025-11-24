/**
 * Generate semantic search embeddings using Transformers.js
 * Zero API calls - runs completely offline!
 * Uses the same model as Python sentence-transformers
 */

import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';

console.log('='.repeat(60));
console.log('🔍 Semantic Search Embedding Generator (Node.js)');
console.log('='.repeat(60));

async function loadSearchData() {
  const searchDataPath = path.join('_site', 'assets', 'js', 'search-data.json');

  if (!fs.existsSync(searchDataPath)) {
    console.error('❌ Error: search-data.json not found.');
    console.error('   Run "bundle exec jekyll build" first!');
    return null;
  }

  const data = JSON.parse(fs.readFileSync(searchDataPath, 'utf-8'));
  console.log(`\n✓ Loaded ${Object.keys(data).length} pages from search-data.json`);
  return data;
}

async function generateEmbeddings(searchData) {
  console.log('\n🚀 Loading embedding model (all-MiniLM-L6-v2)...');
  console.log('   (First run will download ~100MB model, then cached)');

  // Load the same model used in the browser
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  console.log('✓ Model loaded!\n');

  const embeddingsData = [];
  const entries = Object.entries(searchData);
  const total = entries.length;

  console.log(`📝 Generating embeddings for ${total} pages...\n`);

  for (let i = 0; i < entries.length; i++) {
    const [pageId, page] = entries[i];

    // Combine title and content for better semantic understanding
    const text = `${page.title || ''} ${page.content || ''}`;

    // Generate embedding
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);

    embeddingsData.push({
      id: pageId,
      title: page.title || '',
      url: page.url || '',
      content: page.content || '',
      heading: page.heading || '',
      embedding: embedding
    });

    // Progress indicator
    const percent = Math.round(((i + 1) / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
    process.stdout.write(`\r   [${bar}] ${percent}% (${i + 1}/${total}) ${page.title || 'Untitled'}`);
  }

  console.log('\n');
  return embeddingsData;
}

function saveEmbeddings(embeddingsData) {
  const outputPath = path.join('_site', 'assets', 'js', 'search-embeddings.json');
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(embeddingsData), 'utf-8');

  const stats = fs.statSync(outputPath);
  const sizeKB = (stats.size / 1024).toFixed(1);

  console.log(`✅ Embeddings saved to: ${outputPath}`);
  console.log(`   File size: ${sizeKB} KB`);
  console.log(`   Total embeddings: ${embeddingsData.length}`);
}

async function main() {
  try {
    // Load search data
    const searchData = await loadSearchData();
    if (!searchData) {
      process.exit(1);
    }

    // Generate embeddings
    const embeddingsData = await generateEmbeddings(searchData);

    // Save to file
    saveEmbeddings(embeddingsData);

    console.log('\n' + '='.repeat(60));
    console.log('✨ Done! Embeddings are ready for semantic search');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('  1. Embeddings are in _site/assets/js/search-embeddings.json');
    console.log('  2. Chatbot will use them for hybrid semantic + keyword search');
    console.log('  3. Re-run this script whenever you update content');
    console.log('\n🎉 Zero API calls! Completely offline! Free forever!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
