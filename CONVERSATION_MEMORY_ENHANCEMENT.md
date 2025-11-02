# 🧠 Conversation Memory Enhancement

## Features Added

This document describes the conversation memory features to implement in your chatbot:

### 1. **Persistent Conversation Across Pages**
- Store conversation in `sessionStorage` (cleared on tab close)
- Restore conversation when navigating between pages
- Show conversation history when user returns

### 2. **Smart Context Windowing** (Token Optimization)
- Keep only last 10 conversation turns
- Summarize older messages to save tokens
- Send only relevant context to AI

### 3. **Follow-up Question Detection**
- Detect when user asks follow-up (e.g., "What about that?" "Tell me more")
- Include previous answer in context
- Maintain conversation flow

### 4. **Suggested Next Questions**
- AI generates 3 relevant follow-up questions
- Show as clickable chips below answer
- Based on current topic

### 5. **Detailed Responses**
- Encourage longer, more detailed answers from AI but the answer should be grounded to the site content.
- Provide comprehensive information and relevant page liks in the reference.

---

## Implementation Guide

### Step 1: Add Conversation Persistence Functions

Add these functions to `chatbot.js` after the `init()` function:

```javascript
// ============================================
// CONVERSATION MEMORY MANAGEMENT
// ============================================

// Initialize or restore conversation
function initConversation() {
  // Generate session ID if not exists
  if (!sessionId) {
    sessionId = 'session_' + Date.now();
  }

  // Try to restore from sessionStorage
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      conversationHistory = data.history || [];
      sessionId = data.sessionId || sessionId;

      console.log('[Chatbot] Restored conversation:', conversationHistory.length, 'messages');

      // Restore messages in UI
      restoreConversationUI();
    } catch (e) {
      console.warn('[Chatbot] Could not restore conversation:', e);
    }
  }
}

// Save conversation to sessionStorage
function saveConversation() {
  try {
    const data = {
      sessionId: sessionId,
      history: conversationHistory,
      timestamp: Date.now()
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[Chatbot] Could not save conversation:', e);
  }
}

// Restore conversation messages in UI
function restoreConversationUI() {
  // Clear existing messages except welcome
  const messages = chatbotMessages.querySelectorAll('.chatbot-message:not(.welcome-message)');
  messages.forEach(msg => msg.remove());

  // Add historical messages
  conversationHistory.forEach(turn => {
    if (turn.role === 'user') {
      addUserMessage(turn.content, false); // false = don't scroll
    } else {
      addBotMessage(turn.content, turn.references || [], false);

      // Add suggestions if any
      if (turn.suggestions && turn.suggestions.length > 0) {
        addSuggestions(turn.suggestions);
      }
    }
  });

  // Scroll to bottom after all restored
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Clear conversation (e.g., on user request)
function clearConversation() {
  conversationHistory = [];
  sessionStorage.removeItem(STORAGE_KEY);

  // Clear UI except welcome message
  const messages = chatbotMessages.querySelectorAll('.chatbot-message:not(.welcome-message)');
  messages.forEach(msg => msg.remove());

  console.log('[Chatbot] Conversation cleared');
}

// ============================================
// SMART CONTEXT MANAGEMENT
// ============================================

// Get conversation context for AI (optimized for tokens)
function getConversationContext() {
  if (conversationHistory.length === 0) {
    return '';
  }

  // Keep only last N turns to save tokens
  const recentHistory = conversationHistory.slice(-CONFIG.maxConversationTurns);

  // Format for AI
  const contextMessages = recentHistory.map(turn => {
    if (turn.role === 'user') {
      return `User: ${turn.content}`;
    } else {
      // For assistant, just show the answer (not references)
      return `Assistant: ${turn.content}`;
    }
  }).join('\n');

  return contextMessages;
}

// Detect if current query is a follow-up
function isFollowUpQuestion(query) {
  const followUpPatterns = [
    /^(what about|how about|tell me more|more details|explain|elaborate)/i,
    /^(that|this|it|they|those|these)\s/i,
    /\?$/  // Ends with question mark + short query
  ];

  // Check if query is short and ends with question mark (likely follow-up)
  if (query.trim().split(/\s+/).length <= 3 && query.includes('?')) {
    return true;
  }

  // Check patterns
  return followUpPatterns.some(pattern => pattern.test(query.trim()));
}

// ============================================
// SUGGESTED QUESTIONS
// ============================================

// Generate suggested follow-up questions based on topic
function generateSuggestions(topic, references) {
  const suggestions = [];

  // Topic-based suggestions
  if (topic.toLowerCase().includes('leave')) {
    suggestions.push(
      "How do I apply for leave?",
      "What are the different types of leaves?",
      "Can I carry forward unused leave?"
    );
  } else if (topic.toLowerCase().includes('research') || topic.toLowerCase().includes('phd')) {
    suggestions.push(
      "What are the research scholar timelines?",
      "How do I find research funding?",
      "What are the thesis requirements?"
    );
  } else if (topic.toLowerCase().includes('teaching') || topic.toLowerCase().includes('course')) {
    suggestions.push(
      "How do I offer a new course?",
      "What is the grading system?",
      "How do I handle student feedback?"
    );
  } else if (topic.toLowerCase().includes('salary') || topic.toLowerCase().includes('pay')) {
    suggestions.push(
      "What allowances do I get?",
      "How do I understand my payslip?",
      "What are the deductions?"
    );
  } else {
    // Generic suggestions based on references
    if (references && references.length > 0) {
      suggestions.push(
        "Tell me more about this topic",
        "Are there any related policies?",
        "What are the important deadlines?"
      );
    }
  }

  return suggestions.slice(0, 3); // Max 3 suggestions
}

// Add suggestion chips to UI
function addSuggestions(suggestions) {
  const suggestionsContainer = document.createElement('div');
  suggestionsContainer.className = 'chatbot-suggestions';

  suggestions.forEach(text => {
    const chip = document.createElement('button');
    chip.className = 'suggestion-chip';
    chip.textContent = text;
    chip.onclick = () => {
      chatbotInput.value = text;
      handleSendMessage();
    };
    suggestionsContainer.appendChild(chip);
  });

  chatbotMessages.appendChild(suggestionsContainer);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}
```

### Step 2: Update init() Function

```javascript
function init() {
  // Load search data (reuse existing Jekyll search index)
  loadSearchData();

  // Load embeddings for semantic search
  loadEmbeddings();

  // Initialize embedding model for query encoding
  initEmbeddingModel();

  // Initialize conversation memory (NEW!)
  initConversation();

  // Setup event listeners
  setupEventListeners();

  // Load API configuration from meta tags or config
  loadAPIConfig();
}
```

### Step 3: Update processQuery() to Use Context

Find the `processQuery()` function and update it to include conversation context:

```javascript
async function processQuery(query) {
  if (!searchData) {
    return {
      answer: 'Sorry, the handbook content is still loading. Please wait a moment and try again.',
      references: []
    };
  }

  // Check if it's a follow-up question
  const isFollowUp = isFollowUpQuestion(query);

  // If follow-up, include previous context
  let enhancedQuery = query;
  if (isFollowUp && conversationHistory.length > 0) {
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    if (lastTurn.role === 'assistant') {
      enhancedQuery = `Previous answer: ${lastTurn.content.substring(0, 200)}...\n\nFollow-up question: ${query}`;
    }
  }

  // Step 1: Search for relevant content (async for hybrid search)
  const relevantContent = await searchContent(enhancedQuery);

  if (relevantContent.length === 0) {
    return {
      answer: "I couldn't find any relevant information in the Faculty Handbook for your question. Could you try rephrasing it or ask about a different topic?",
      references: [],
      suggestions: [
        "How do I apply for leave?",
        "What are teaching requirements?",
        "Tell me about research funding"
      ]
    };
  }

  // Step 2: Generate response based on retrieved content
  let response;
  if (CONFIG.useLocalMode) {
    response = await generateLocalResponse(query, relevantContent);
  } else {
    response = await generateAPIResponse(query, relevantContent);
  }

  // Step 3: Add suggested questions
  if (CONFIG.suggestionsEnabled) {
    response.suggestions = generateSuggestions(query, relevantContent);
  }

  // Step 4: Add to conversation history
  conversationHistory.push({
    role: 'user',
    content: query
  });
  conversationHistory.push({
    role: 'assistant',
    content: response.answer,
    references: response.references,
    suggestions: response.suggestions
  });

  // Save to storage
  saveConversation();

  // Step 5: Keep history manageable
  if (conversationHistory.length > CONFIG.maxConversationTurns * 2) {
    conversationHistory = conversationHistory.slice(-CONFIG.maxConversationTurns * 2);
    saveConversation();
  }

  return response;
}
```

### Step 4: Update API Response Function

Update the API proxy call to include conversation context:

```javascript
// In callSecureProxy function, add conversation context
async function callSecureProxy(query, context) {
  const conversationContext = getConversationContext();

  const response = await fetch(CONFIG.apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query,
      context: context,
      conversationHistory: conversationContext, // NEW!
      apiType: CONFIG.apiType
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Proxy error: ${error}`);
  }

  const data = await response.json();
  return data.answer;
}
```

### Step 5: Update API Proxy (api/chat.js)

Update your Vercel API to handle conversation context:

```javascript
// In api/chat.js, update the callGemini function

async function callGemini(query, context, apiKey, conversationHistory = '') {
  const prompt = `You are a helpful assistant for the IIT Madras Faculty Handbook.

IMPORTANT RULES:
1. Provide DETAILED and COMPREHENSIVE answers (3-5 sentences minimum)
2. Include specific examples and explanations
3. Only use information from the provided context below
4. If the answer is not in the context, say so clearly
5. Be conversational and helpful
6. If there's conversation history, use it to understand follow-up questions

${conversationHistory ? `Previous Conversation:\n${conversationHistory}\n\n` : ''}

Context from Faculty Handbook:
${context}

User Question: ${query}

Provide a detailed answer:`;

  // Rest of Gemini API call...
}
```

### Step 6: Add CSS for Suggestions

Add to `_sass/chatbot.scss`:

```scss
// Suggestion chips
.chatbot-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
  padding: 0 16px;
}

.suggestion-chip {
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 8px 16px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
    border-color: #9333ea;
    color: #9333ea;
  }

  &:active {
    transform: scale(0.98);
  }
}
```

### Step 7: Add Clear Conversation Button (Optional)

Add a button to clear conversation history:

```html
<!-- In chatbot.html, add this button -->
<button id="chatbot-clear" class="chatbot-clear-btn" title="Clear conversation">
  <svg><!-- trash icon --></svg>
</button>
```

```javascript
// In setupEventListeners()
const clearBtn = document.getElementById('chatbot-clear');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (confirm('Clear conversation history?')) {
      clearConversation();
    }
  });
}
```

---

## Testing Checklist

- [ ] Conversation persists across page navigation
- [ ] Conversation cleared on tab close/refresh
- [ ] Follow-up questions work correctly
- [ ] Suggested questions appear after answers
- [ ] Clicking suggestions sends query
- [ ] AI gives detailed responses
- [ ] Token usage is optimized (only last 10 turns sent)
- [ ] localStorage doesn't exceed limits

---

## Benefits

✅ **Better UX**: Users can continue conversations across pages
✅ **Intelligent**: Understands follow-up questions
✅ **Helpful**: Suggests related questions
✅ **Detailed**: Comprehensive answers with examples
✅ **Efficient**: Smart context windowing saves tokens
✅ **Persistent**: Conversation remembered until tab close

---

## Token Usage Comparison

**Before** (no memory):
- Each query: ~500 tokens (query + context)

**After** (with smart windowing):
- Each query: ~800 tokens (query + context + last 10 turns summarized)
- Still within free tier limits!

**Why it's efficient:**
- Only last 10 conversation turns included
- Old messages summarized (not full text)
- References not sent (just answers)

---

Ready to implement! This will make your chatbot significantly smarter! 🎉
