/**
 * Enrich search data to create AI-friendly knowledge base
 * Converts tables to natural language and adds metadata context
 *
 * Usage: node enrich-knowledge.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const SEARCH_DATA_PATH = path.join(__dirname, '_site_vercel', 'fachandbook', 'assets', 'js', 'search-data.json');
const OUTPUT_PATH = path.join(__dirname, 'assets', 'js', 'search-knowledge.json');

/**
 * Detect if content is table-formatted (has pipe separators)
 */
function isTableContent(content) {
  const pipeCount = (content.match(/\|/g) || []).length;
  return pipeCount > 5; // At least 5 pipes suggests a table
}

/**
 * Convert table-formatted text to natural language paragraphs
 */
function convertTableToNatural(content) {
  try {
    // Split by row separators (. | pattern indicates row end)
    const rows = content.split(/\.\s*\|/g)
      .map(r => r.trim())
      .filter(r => r && r !== '.');

    if (rows.length === 0) return content;

    // Parse first row - check if it's headers
    const firstRowCells = rows[0].split('|').map(c => c.trim()).filter(c => c);

    // Check if first row looks like headers (short, capitalized, no long text)
    const isHeader = firstRowCells.length > 1 &&
                     firstRowCells.every(cell => cell.length < 50 && /^[A-Z]/.test(cell));

    let headers = [];
    let dataRows = rows;

    if (isHeader) {
      headers = firstRowCells;
      dataRows = rows.slice(1);
    }

    // Convert each data row to natural language
    const paragraphs = [];

    for (const row of dataRows) {
      const cells = row.split('|').map(c => c.trim()).filter(c => c && c !== '.');

      if (cells.length === 0) continue;

      // Build natural paragraph based on structure
      if (headers.length > 0 && cells.length > 0) {
        const name = cells[0]; // First cell is usually the item name
        const parts = [name];

        // Process each header-value pair
        for (let i = 1; i < Math.min(headers.length, cells.length); i++) {
          const header = headers[i].toLowerCase();
          const value = cells[i];

          if (!value || value === '.' || value === '-') continue;

          // Clean up value text
          const cleanValue = value.replace(/\s+/g, ' ').trim();

          // Generate natural language based on header semantics
          if (header.includes('entitle') || header.includes('days') || header.includes('duration')) {
            // Duration/entitlement info
            parts.push(`allows ${cleanValue}`);
          } else if (header.includes('purpose') || header.includes('for') || header.includes('avail')) {
            // Purpose/usage info
            if (cleanValue.toLowerCase().startsWith('for ')) {
              parts.push(cleanValue);
            } else {
              parts.push(`for ${cleanValue}`);
            }
          } else if (header.includes('remark') || header.includes('note') || header.includes('condition')) {
            // Additional notes - make it a separate sentence
            parts.push(`. ${cleanValue}`);
          } else if (header.includes('eligib')) {
            parts.push(`. Eligibility: ${cleanValue}`);
          } else if (header.includes('require')) {
            parts.push(`. Requires ${cleanValue}`);
          } else {
            // Generic header
            parts.push(`. ${header.charAt(0).toUpperCase() + header.slice(1)}: ${cleanValue}`);
          }
        }

        // Join parts into readable paragraph
        let paragraph = parts.join(' ')
          .replace(/\s+/g, ' ')
          .replace(/\s+\./g, '.')
          .replace(/\.\s*\./g, '.')
          .replace(/\s+,/g, ',')
          .trim();

        // Ensure proper ending
        if (!paragraph.endsWith('.')) {
          paragraph += '.';
        }

        paragraphs.push(paragraph);

      } else {
        // No headers - join cells as simple list
        const paragraph = cells.join('. ').replace(/\.\./g, '.');
        if (paragraph.trim()) {
          paragraphs.push(paragraph + (paragraph.endsWith('.') ? '' : '.'));
        }
      }
    }

    return paragraphs.join(' ');

  } catch (error) {
    console.warn(`  Warning: Could not parse table, keeping original content`);
    return content;
  }
}

/**
 * Create enriched content - convert tables to natural language
 * Keep content clean without metadata prefix
 */
function enrichContent(page) {
  const { content } = page;

  // Process content - convert tables to natural language if needed
  let processedContent = content;

  if (isTableContent(content)) {
    console.log(`  Converting table to natural language...`);
    processedContent = convertTableToNatural(content);
  }

  // Clean up extra spaces and normalize
  processedContent = processedContent
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();

  return processedContent;
}

/**
 * Process search data and create knowledge base
 */
function createKnowledgeBase() {
  console.log('='.repeat(60));
  console.log('Creating AI-friendly knowledge base from search data');
  console.log('='.repeat(60));
  console.log('\nReading search data from:', SEARCH_DATA_PATH);

  // Read search data
  const rawData = fs.readFileSync(SEARCH_DATA_PATH, 'utf-8');
  const searchData = JSON.parse(rawData);

  const knowledgeBase = [];
  let processedTables = 0;
  const totalPages = Object.keys(searchData).length;

  console.log(`Processing ${totalPages} pages...\n`);

  // Process each page
  for (const [id, page] of Object.entries(searchData)) {
    console.log(`[${id}/${totalPages}] Processing: ${page.title}`);

    const isTable = isTableContent(page.content);
    if (isTable) processedTables++;

    // Create enriched entry
    const enrichedEntry = {
      id: id,
      doc: page.doc || '',
      title: page.title || '',
      url: page.url || '',
      relUrl: page.relUrl || '',
      content: enrichContent(page),
      originalLength: page.content.length,
      enrichedLength: 0
    };

    enrichedEntry.enrichedLength = enrichedEntry.content.length;

    console.log(`  Original: ${enrichedEntry.originalLength} chars | Enriched: ${enrichedEntry.enrichedLength} chars`);

    knowledgeBase.push(enrichedEntry);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✓ Processed ${totalPages} pages`);
  console.log(`✓ Converted ${processedTables} tables to natural language`);
  console.log('='.repeat(60));

  // Save knowledge base
  console.log('\nWriting knowledge base to:', OUTPUT_PATH);

  // Ensure directory exists
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(knowledgeBase, null, 2), 'utf-8');

  console.log('\n✓ Knowledge base created successfully!');
  console.log(`  File: ${OUTPUT_PATH}`);
  console.log(`  Size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(2)} KB`);
  console.log('\nNext step: Generate embeddings from this knowledge base');
  console.log('  Run: node generate-embeddings.js --source search-knowledge.json\n');
}

// Run
try {
  createKnowledgeBase();
} catch (error) {
  console.error('\n❌ Error creating knowledge base:', error.message);
  console.error(error.stack);
  process.exit(1);
}
