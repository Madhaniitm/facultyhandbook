# Visual Reference - The Complete Fix 📊

## Search Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER SEARCHES                          │
│                   "tell me about leaves"                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│            LOAD search-data.json FROM BROWSER                │
│                                                              │
│  Each page entry has:                                       │
│  {                                                          │
│    id: "43",                    ← unique ID                 │
│    doc: "Leaves",               ← FIELD 1 (NOW SEARCHED!)   │
│    title: "Leaves",             ← FIELD 2 (searched)        │
│    content: "Policies...",      ← FIELD 3 (searched)        │
│    url: "/fachandbook/leaves/", ← FIELD 4 (now in results) │
│    relUrl: "/leaves/"           ← FIELD 5 (now in results) │
│  }                                                          │
│                                                              │
│  Total entries: 200+ pages                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           SEARCH ENGINE DECIDES METHOD                       │
│                                                              │
│  ┌─────────────────────┐        ┌────────────────────┐     │
│  │ Has embeddings?     │        │ Has embeddings?    │     │
│  │ (search-embeddings  │        │ (search-embeddings │     │
│  │  .json loaded)      │        │  .json loaded)     │     │
│  │         │           │        │         │          │     │
│  │      YES│           │        │         NO         │     │
│  │         ↓           │        │         │          │     │
│  │   Use HYBRID       │        │    Use KEYWORD     │     │
│  │   SEARCH:          │        │    SEARCH ONLY     │     │
│  │   • Semantic       │        │                    │     │
│  │   • Keyword        │        │  (Fallback mode)   │     │
│  │   • Combined       │        │                    │     │
│  └─────────────────────┘        └────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│         HYBRID SEARCH: STAGE 1 - QUERY PREPROCESSING        │
│                                                              │
│  Input: "tell me about leaves"                              │
│                                                              │
│  Original: "tell me about leaves"                           │
│  Expanded: "tell me about leaves" + related terms           │
│  Keywords: ["tell", "about", "leaves"]                      │
│                                                              │
│  [Common expansions applied]                                │
│  leave → loss of pay, maternity, earned leave, etc.        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│    HYBRID SEARCH: STAGE 2 - GET QUERY EMBEDDING             │
│                                                              │
│  Transformers.js (all-MiniLM-L6-v2 model)                   │
│  Converts query to 384-dimensional vector                   │
│  [0.234, -0.156, ..., 0.891]                                │
│                                                              │
│  This vector represents semantic meaning                    │
│  of "tell me about leaves"                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│   HYBRID SEARCH: STAGE 3 - SCORE ALL 200+ PAGES             │
│                                                              │
│  For each page:                                             │
│  ┌──────────────────────────────────┐                      │
│  │ Page 43: "Leaves" document        │                      │
│  │ ────────────────────────────────  │                      │
│  │ Semantic Score (cosine):    0.87  │ ← High similarity    │
│  │ Keyword Score:              0.95  │ ← Exact matches      │
│  │ Exact Match Bonus:          1.00  │ ← Has "leaves"      │
│  │                                    │                      │
│  │ Combined = (0.87*0.5) +           │                      │
│  │            (0.95*0.4) +           │                      │
│  │            (1.00*0.1) = 0.905 ✓   │ TOP SCORE!          │
│  └──────────────────────────────────┘                      │
│                                                              │
│  [Calculate for all other pages...]                         │
│  Page X: 0.234                                              │
│  Page Y: 0.156                                              │
│  Page Z: 0.892                                              │
│  ...                                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│   HYBRID SEARCH: STAGE 4 - GET TOP 30 CANDIDATES            │
│                                                              │
│  Sort by score and take top 30:                             │
│  1. Page 43 (Score: 0.905) [Leaves]                         │
│  2. Page 44 (Score: 0.892) [Leaves]                         │
│  3. Page 45 (Score: 0.876) [Leaves]                         │
│  4. Page 200 (Score: 0.651) [Travel]                        │
│  ... (26 more)                                              │
│  30. Page 15 (Score: 0.234) [On Campus]                     │
│                                                              │
│  These 30 are "candidates" for final results                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ HYBRID SEARCH: STAGE 5 - RERANK TOP 30 WITH ADVANCED SCORING│
│                                                              │
│  Apply additional factors:                                  │
│  • Title relevance                                          │
│  • Content density                                          │
│  • Keyword proximity                                        │
│                                                              │
│  Recalculate final scores:                                  │
│  1. Page 43 [Leaves] → 0.915 ✓                              │
│  2. Page 44 [Leaves] → 0.901 ✓                              │
│  3. Page 45 [Leaves] → 0.885 ✓                              │
│  ... reranked by final score ...                            │
│                                                              │
│  [This is why results get better ordered]                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│     HYBRID SEARCH: STAGE 6 - RETURN TOP 10 RESULTS          │
│                                                              │
│  Final result objects (with ALL fields now):                │
│  [                                                          │
│    {                                                        │
│      id: "43",                  ← From search-data.json     │
│      doc: "Leaves",             ← NEW! Included            │
│      title: "Leaves",                                       │
│      content: "Policies...",                                │
│      url: "/fachandbook/leaves/",                           │
│      relUrl: "/leaves/",        ← NEW! Included            │
│      score: 0.915,                                          │
│      semanticScore: 0.87,                                   │
│      keywordScore: 0.95,                                    │
│      exactMatchBonus: 1.00,                                 │
│      preview: "Leaves are..." ← Generated from content      │
│    },                                                       │
│    {                                                        │
│      id: "44",                                              │
│      doc: "Leaves",             ← NEW!                      │
│      title: "How to apply",     ← NEW!                      │
│      ... 8 more results ...                                 │
│    }                                                        │
│  ]                                                          │
│                                                              │
│  Ready to pass to response generator!                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              GENERATE RESPONSE (2 PATHS)                     │
│                                                              │
│  ┌──────────────────────────┐  ┌──────────────────────┐    │
│  │ LOCAL MODE              │  │ API MODE             │    │
│  │                          │  │                      │    │
│  │ 1. Take top result      │  │ 1. Format context   │    │
│  │ 2. Truncate to 1500 ch. │  │    with [doc] labels │    │
│  │ 3. Extract answer text  │  │                      │    │
│  │ 4. Create references:   │  │ 2. Call Gemini/     │    │
│  │                          │  │    Claude/OpenAI    │    │
│  │   {                      │  │                      │    │
│  │     doc: "Leaves",      │  │ 3. Get AI answer    │    │
│  │     title: "Leaves",    │  │                      │    │
│  │     url: "/...",        │  │ 4. Create references│    │
│  │     relUrl: "/...",     │  │    (same as local)   │    │
│  │     preview: "..."      │  │                      │    │
│  │   }                      │  │    {                 │    │
│  │                          │  │      doc: "Leaves",│    │
│  └──────────────────────────┘  │      title: "...",│    │
│                                 │      ...           │    │
│                                 │    }               │    │
│                                 │                      │    │
│                                 └──────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│            BUILD RESPONSE OBJECT                             │
│                                                              │
│  {                                                          │
│    answer: "Based on handbook, here's about leaves...",    │
│    references: [                                            │
│      {                                                      │
│        doc: "Leaves",                ← Category!            │
│        title: "Leaves",                                     │
│        url: "/fachandbook/leaves/",                         │
│        relUrl: "/leaves/",                                  │
│        preview: "Leaves are..."                             │
│      },                                                     │
│      {                                                      │
│        doc: "Leaves",                                       │
│        title: "How to apply",                               │
│        url: "/fachandbook/leaves/#how-to-apply",           │
│        relUrl: "/leaves/#how-to-apply",                    │
│        preview: "To apply, go to workflow..."               │
│      },                                                     │
│      {                                                      │
│        doc: "Leaves",                                       │
│        title: "Types of leaves",                            │
│        url: "/fachandbook/leaves/#types",                  │
│        relUrl: "/leaves/#types",                           │
│        preview: "There are many types..."                   │
│      }                                                      │
│    ]                                                        │
│  }                                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│         DISPLAY IN CHATBOT MESSAGE                           │
│                                                              │
│  Processing references for display:                         │
│                                                              │
│  For each reference object:                                 │
│  ┌────────────────────────────────────┐                     │
│  │ ref.doc = "Leaves"                 │                     │
│  │ ref.title = "Leaves"               │                     │
│  │ ref.url = "/fachandbook/leaves/"   │                     │
│  │                                    │                     │
│  │ Create docLabel:                   │                     │
│  │ "[Leaves] "  ← From ref.doc        │                     │
│  │                                    │                     │
│  │ Create HTML:                       │                     │
│  │ <a href="/fachandbook/leaves/">    │                     │
│  │   [Leaves] Leaves                  │                     │
│  │ </a>                               │                     │
│  │                                    │                     │
│  │ ✓ Shows [Category] Title!          │                     │
│  └────────────────────────────────────┘                     │
│                                                              │
│  Repeat for all 3 references                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              RENDERED IN BROWSER                             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🤖 Bot Message                                       │  │
│  │ ────────────────────────────────────────────────────  │  │
│  │                                                        │  │
│  │ Based on the Faculty Handbook, here's what I found:  │  │
│  │                                                        │  │
│  │ Leaves are a crucial part of the employee benefits   │  │
│  │ structure. You can apply through workflow. There are  │  │
│  │ different types including casual leave, earned leave,│  │
│  │ and special leaves for various situations.           │  │
│  │                                                        │  │
│  │ For more details, click the references below.         │  │
│  │                                                        │  │
│  │ ────────────────────────────────────────────────────  │  │
│  │ 📚 References:                                        │  │
│  │  • [Leaves] Leaves                                    │  │
│  │  • [Leaves] How to apply for leave                   │  │
│  │  • [Leaves] Types of leaves                          │  │
│  │ ────────────────────────────────────────────────────  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ✓ User sees [Leaves] prefix                               │
│  ✓ User knows exact section/category                       │
│  ✓ References are clickable links                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Before vs After Comparison

### BEFORE (Old Code)
```
Search: "leaves"
    ↓
Check: title, content only
    ↓
Find: Page with "leaves" in title
    ↓
References shown as:
  • Leaves
  • How to apply for leave
  
❌ Problem: User doesn't know this is from "Leaves" document
❌ Problem: Might be confused with other sections
❌ Problem: API doesn't know category context
```

### AFTER (Fixed Code)
```
Search: "leaves"
    ↓
Check: doc, title, content, url, relUrl ✓ All 5 fields!
    ↓
Find: doc="Leaves" matches + title matches + content matches
    ↓
References shown as:
  • [Leaves] Leaves ✓ Shows category!
  • [Leaves] How to apply for leave
  • [Leaves] Types of leaves
  
✓ User knows: Info is from "Leaves" document
✓ User can distinguish documents
✓ API gets full context
```

---

## Data Flow Diagram

```
search-data.json (200+ entries)
└─ Each has: {doc, title, content, url, relUrl}

        ↓ All 5 fields used in search

keywordSearch()      hybridSearch()
└─ Scores doc field  └─ Scores doc field
                     └─ Semantic + keyword

        ↓ Returns top 10 with ALL fields

generateLocalResponse()  OR  generateAPIResponse()
└─ Creates references      └─ Formats context with [doc]
   with doc field            └─ Calls AI API
   
        ↓ References have doc

addBotMessage()
└─ Displays [doc] title format

        ↓ User sees category!

Browser Display
└─ [Leaves] How to apply for leave
```

---

## Field Usage Table

```
┌──────────┬────────────┬────────┬──────┬──────────┐
│ Field    │ In Search  │ Scored │ Refs │ Display  │
├──────────┼────────────┼────────┼──────┼──────────┤
│ doc      │ ✓ YES      │ ✓ YES  │ ✓ YES│ ✓ YES    │
│ title    │ ✓ YES      │ ✓ YES  │ ✓ YES│ ✓ YES    │
│ content  │ ✓ YES      │ ✓ YES  │ ✓ YES│ - NO     │
│ url      │ - NO       │ - NO   │ ✓ YES│ ✓ LINK   │
│ relUrl   │ - NO       │ - NO   │ ✓ YES│ - ALT    │
└──────────┴────────────┴────────┴──────┴──────────┘
```

---

**All fixes are live and ready to use!** 🚀

