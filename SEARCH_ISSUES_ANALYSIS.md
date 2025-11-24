# Chatbot Search Issues - Complete Analysis

## The Actual Problem You've Identified ✅

**The search is ONLY checking `title` and `content` fields, but `search-data.json` has 5 searchable fields:**

```json
{
  "doc": "Campus Rules",          // ← NOT being searched!
  "title": "Table of contents",   // ← Being searched ✓
  "content": "...",               // ← Being searched ✓
  "url": "/fachandbook/rules_landing/#table-of-contents",   // ← NOT being searched!
  "relUrl": "/rules_landing/#table-of-contents"  // ← NOT being searched!
}
```

### Why This is a Problem:

1. **Missing `doc` field searches**: The `doc` field contains high-level categorization like "Leaves", "Campus Rules", "Research programs", etc. Users might ask "Show me leaves policies" but the search won't match because it's only in the `doc` field.

2. **Missing `url` and `relUrl` field searches**: While less important for matching, these could help with relevance scoring.

3. **Reference generation doesn't use all available data**: References are being created from the returned results, but the references might not show the category/document name properly.

---

## How References Are Currently Generated

**In `assets/js/chatbot.js` → `generateLocalResponse()` function:**

```javascript
const references = relevantContent.slice(0, 3).map(result => ({
  title: result.title,
  url: result.url,
  preview: result.preview
}));
```

**In `assets/js/chatbot.js` → `addBotMessage()` function:**

```javascript
if (references && references.length > 0) {
  const referencesDiv = document.createElement('div');
  referencesDiv.className = 'message-references';
  referencesDiv.innerHTML = '<strong>📚 References:</strong>';

  const refList = document.createElement('ul');
  references.forEach(ref => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${escapeHtml(ref.url)}" target="_blank">${escapeHtml(ref.title)}</a>`;
    refList.appendChild(li);
  });

  referencesDiv.appendChild(refList);
  contentDiv.appendChild(referencesDiv);
}
```

### Problems with References:

1. **Only uses `title` from results** - doesn't include the `doc` category name
2. **No document context** - User sees just a title, not which section/document it's from
3. **Could show `doc` + `title`** - Much more informative reference

---

## The Fix Required

### 1️⃣ Update Search Functions to Include All Fields

**In `keywordSearch()` function:**

```javascript
function keywordSearch(query) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const results = [];

  for (const [id, page] of Object.entries(searchData)) {
    const title = (page.title || '').toLowerCase();
    const content = (page.content || '').toLowerCase();
    const doc = (page.doc || '').toLowerCase();           // ← ADD THIS
    const url = page.url || '';

    let score = 0;

    // Exact phrase match (highest weight)
    if (title.includes(queryLower) || content.includes(queryLower) || doc.includes(queryLower)) {  // ← ADD doc
      score += 10;
    }

    // Doc (category) matches (high weight - user might search by category)
    if (doc.includes(queryLower)) {
      score += 5;
    }

    // Title keyword matches
    for (const word of queryWords) {
      if (title.includes(word)) score += 3;
      if (doc.includes(word)) score += 2;  // ← ADD doc field
    }

    // Content keyword matches
    for (const word of queryWords) {
      const regex = new RegExp('\\b' + word + '\\b', 'gi');
      const titleMatches = title.match(regex);
      const contentMatches = content.match(regex);
      const docMatches = doc.match(regex);  // ← ADD doc field
      
      if (titleMatches) score += titleMatches.length * 1.5;
      if (contentMatches) score += contentMatches.length * 0.5;
      if (docMatches) score += docMatches.length * 1.0;  // ← ADD doc field
    }

    if (score > CONFIG.minRelevanceScore) {
      results.push({
        id,
        doc: page.doc,                      // ← ADD THIS for references
        title: page.title,
        content: page.content,
        url: url,
        relUrl: page.relUrl,                // ← ADD THIS (if needed)
        score: score,
        preview: generatePreview(page.content, queryWords)
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, CONFIG.maxSearchResults);
}
```

---

### 2️⃣ Update Hybrid Search to Include All Fields

**In `calculateKeywordScore()` function:**

```javascript
function calculateKeywordScore(query, page) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const title = (page.title || '').toLowerCase();
  const content = (page.content || '').toLowerCase();
  const doc = (page.doc || '').toLowerCase();  // ← ADD THIS

  let score = 0;

  // Exact phrase match
  if (title.includes(queryLower)) score += 10;
  if (content.includes(queryLower)) score += 6;
  if (doc.includes(queryLower)) score += 5;  // ← ADD THIS

  // All words present (boolean AND)
  const allWordsInTitle = queryWords.every(w => title.includes(w));
  const allWordsInContent = queryWords.every(w => content.includes(w));
  const allWordsInDoc = queryWords.every(w => doc.includes(w));  // ← ADD THIS
  if (allWordsInTitle) score += 5;
  if (allWordsInContent) score += 3;
  if (allWordsInDoc) score += 4;  // ← ADD THIS

  // Individual word matches
  for (const word of queryWords) {
    if (title.includes(word)) score += 2;
    if (doc.includes(word)) score += 1.5;  // ← ADD THIS
  }

  // Content keyword matches with frequency
  for (const word of queryWords) {
    const regex = new RegExp('\\b' + word + '\\b', 'gi');
    const matches = content.match(regex);
    if (matches) {
      score += Math.min(matches.length * 0.5, 3);
    }
  }

  // Normalize
  return Math.min(score / 35, 1.0);
}
```

---

### 3️⃣ Update References to Show Document Context

**In `generateLocalResponse()` function:**

```javascript
// OLD - Only shows title
const references = relevantContent.slice(0, 3).map(result => ({
  title: result.title,
  url: result.url,
  preview: result.preview
}));

// NEW - Shows doc + title for better context
const references = relevantContent.slice(0, 3).map(result => ({
  doc: result.doc,      // ← ADD THIS
  title: result.title,
  url: result.url,
  preview: result.preview
}));
```

**In `addBotMessage()` function:**

```javascript
// OLD - Just shows title
references.forEach(ref => {
  const li = document.createElement('li');
  li.innerHTML = `<a href="${escapeHtml(ref.url)}" target="_blank">${escapeHtml(ref.title)}</a>`;
  refList.appendChild(li);
});

// NEW - Shows doc name + title
references.forEach(ref => {
  const li = document.createElement('li');
  const docLabel = ref.doc ? `[${escapeHtml(ref.doc)}] ` : '';
  li.innerHTML = `<a href="${escapeHtml(ref.url)}" target="_blank">${docLabel}${escapeHtml(ref.title)}</a>`;
  refList.appendChild(li);
});
```

---

### 4️⃣ Update Embeddings Generation (Optional but Recommended)

In `generate-embeddings.js`, include `doc` field in embedding generation:

```javascript
// OLD - Only uses title + content
const text = `${page.title || ''} ${page.content || ''}`;

// NEW - Also includes doc category
const text = `${page.doc || ''} ${page.title || ''} ${page.content || ''}`;
```

This helps the semantic search understand document categories better.

---

## Summary of Changes

| Where | What to Add | Why |
|-------|-----------|-----|
| `keywordSearch()` | Check `doc` field | Users might search by category |
| `calculateKeywordScore()` | Score `doc` field | Categories should have high weight |
| `hybridSearch()` data | Include `doc` and `relUrl` | More fields = better matching |
| References display | Show `doc` + `title` | Users see which section info is from |
| Embeddings generation | Include `doc` in text | Semantic model learns categories |

---

## Testing

After making these changes, test with queries like:
- "leaves" → Should find all pages in "Leaves" doc
- "on campus housing" → Should find "On Campus" section
- "research programs" → Should find all research-related pages
- "courses" → Should find teaching/course work sections

References should now show: `[Leaves] How to apply for leave` instead of just `How to apply for leave`

