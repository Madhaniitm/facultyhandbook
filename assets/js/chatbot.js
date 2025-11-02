/**
 * Faculty Handbook AI Chatbot
 * RAG-based chatbot that uses site content to answer questions accurately
 * Prevents hallucination by grounding responses in actual handbook content
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // You can configure these options
    maxSearchResults: 5,
    minRelevanceScore: 0.1,
    apiEndpoint: null, // Set to your AI API endpoint (e.g., OpenAI, Claude, Gemini)
    apiKey: null, // Set your API key in _config.yml or environment variable
    apiType: 'openai', // 'openai', 'gemini', or 'claude'
    useLocalMode: true, // If true, uses rule-based responses without external API
    maxContextLength: 3000, // Maximum characters to send as context
    typingDelay: 30, // Milliseconds per character for typing effect
    maxConversationTurns: 10, // Keep last N conversation turns for context
    suggestionsEnabled: true, // Show suggested follow-up questions
  };

  // State
  let searchData = null;
  let embeddingsData = null;
  let embeddingPipeline = null;
  let conversationHistory = [];
  let isProcessing = false;
  let sessionId = null;

  // Conversation persistence key
  const STORAGE_KEY = 'faculty-chatbot-conversation';

  // DOM Elements
  const chatbotContainer = document.getElementById('faculty-chatbot');
  const chatbotToggle = document.getElementById('chatbot-toggle');
  const chatbotWindow = document.getElementById('chatbot-window');
  const chatbotClose = document.getElementById('chatbot-close');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotSend = document.getElementById('chatbot-send');
  const chatbotSuggestions = document.getElementById('chatbot-suggestions');

  // Initialize chatbot
  function init() {
    // Load search data (reuse existing Jekyll search index)
    loadSearchData();

    // Load embeddings for semantic search
    loadEmbeddings();

    // Initialize embedding model for query encoding
    initEmbeddingModel();

    // Initialize conversation memory
    initConversation();

    // Setup event listeners
    setupEventListeners();

    // Load API configuration from meta tags or config
    loadAPIConfig();
  }

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
        addUserMessage(turn.content, false); // false = don't scroll yet
      } else {
        addBotMessageSync(turn.content, turn.references || []);

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
    const recentHistory = conversationHistory.slice(-CONFIG.maxConversationTurns * 2);

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
      /(tell me more|more on|more about|elaborate on|explain this|what about this)/i,
      /\?$/  // Ends with question mark + short query
    ];

    // Check if query is short and ends with question mark (likely follow-up)
    if (query.trim().split(/\s+/).length <= 3 && query.includes('?')) {
      return true;
    }

    // Check patterns
    return followUpPatterns.some(pattern => pattern.test(query.trim()));
  }

  // Rephrase follow-up question using AI into a complete standalone question for better search
  async function rephraseFollowUpQuestion(query, history) {
    // Get the last few turns to understand context
    const recentHistory = history.slice(-6); // Last 3 exchanges

    // Format conversation history for the AI
    const conversationContext = recentHistory.map(turn => {
      return `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`;
    }).join('\n');

    // If no API endpoint configured, use simple fallback
    if (!CONFIG.apiEndpoint) {
      // Simple fallback: just return the last user question
      for (let i = recentHistory.length - 1; i >= 0; i--) {
        if (recentHistory[i].role === 'user') {
          return recentHistory[i].content;
        }
      }
      return query;
    }

    try {
      // Call API to rephrase the question
      const prompt = `You are a question analyzer. Given conversation history and a follow-up question, determine if the question needs rephrasing.

Conversation History:
${conversationContext}

Follow-up Question: ${query}

Instructions:
1. First, check if the follow-up question is ALREADY a complete standalone question that doesn't rely on conversation context
2. If it's already standalone (contains all necessary context/keywords), return it EXACTLY as is
3. If it uses pronouns (this, that, it) or vague references (tell me more, elaborate), rephrase it into a complete standalone question that includes the specific topic from the conversation
4. Keep the rephrased question concise (1-2 sentences max)
5. Only output the question itself, nothing else

Rephrased Question:`;

      const response = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: prompt,
          context: [{
            title: 'Rephrasing Task',
            content: 'You are helping rephrase follow-up questions for better search. Keep responses brief and to the point. Output only the rephrased question, nothing else.'
          }],
          conversationHistory: [],
          apiType: CONFIG.apiType
        })
      });

      if (!response.ok) {
        throw new Error('Rephrase API failed');
      }

      const data = await response.json();
      const rephrased = data.answer.trim();

      console.log('[Chatbot] AI Rephrased:', rephrased);
      return rephrased;

    } catch (error) {
      console.warn('[Chatbot] Failed to rephrase with AI, using fallback:', error);

      // Fallback: use the last user question
      for (let i = recentHistory.length - 1; i >= 0; i--) {
        if (recentHistory[i].role === 'user') {
          return recentHistory[i].content;
        }
      }
      return query;
    }
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

  // Load search data from Jekyll's search index
  function loadSearchData() {
    // Build the correct URL based on the site's base URL
    const baseUrl = document.querySelector('base')?.href || window.location.origin;
    const currentPath = window.location.pathname;

    // Try to determine the base path from current URL
    let searchDataUrl;
    if (currentPath.includes('/fachandbook')) {
      searchDataUrl = '/fachandbook/assets/js/search-data.json';
    } else if (currentPath === '/' || currentPath === '') {
      searchDataUrl = '/assets/js/search-data.json';
    } else {
      // Extract base path from current URL
      const pathParts = currentPath.split('/').filter(p => p);
      if (pathParts.length > 0) {
        searchDataUrl = '/' + pathParts[0] + '/assets/js/search-data.json';
      } else {
        searchDataUrl = '/assets/js/search-data.json';
      }
    }

    console.log('[Chatbot] Loading search data from:', searchDataUrl);

    fetch(searchDataUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        searchData = data;
        console.log('[Chatbot] Search data loaded:', Object.keys(data).length, 'entries');
      })
      .catch(error => {
        console.error('[Chatbot] Failed to load search data:', error);
        console.error('[Chatbot] Attempted URL:', searchDataUrl);
        addBotMessage('Sorry, I encountered an error loading the handbook content. Please make sure the site is fully built with "bundle exec jekyll build".');
      });
  }

  // Load pre-computed embeddings for semantic search
  function loadEmbeddings() {
    const currentPath = window.location.pathname;

    let embeddingsUrl;
    if (currentPath.includes('/fachandbook')) {
      embeddingsUrl = '/fachandbook/assets/js/search-embeddings.json';
    } else {
      embeddingsUrl = '/assets/js/search-embeddings.json';
    }

    console.log('[Chatbot] Loading embeddings from:', embeddingsUrl);

    fetch(embeddingsUrl)
      .then(response => {
        if (!response.ok) {
          console.warn('[Chatbot] Embeddings not found, falling back to keyword search');
          return null;
        }
        return response.json();
      })
      .then(data => {
        if (data) {
          embeddingsData = data;
          console.log('[Chatbot] Embeddings loaded:', data.length, 'pages');
          console.log('[Chatbot] Semantic search enabled ✓');
        }
      })
      .catch(error => {
        console.warn('[Chatbot] Could not load embeddings, using keyword search only:', error);
      });
  }

  // Initialize Transformers.js embedding model for query encoding
  async function initEmbeddingModel() {
    try {
      // Check if embeddings are available
      if (!embeddingsData) {
        console.log('[Chatbot] Skipping embedding model init (no embeddings data)');
        return;
      }

      // Dynamically import Transformers.js
      console.log('[Chatbot] Loading Transformers.js embedding model...');

      const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0');

      // Load the same model used for generating page embeddings
      embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      console.log('[Chatbot] Embedding model ready ✓');
    } catch (error) {
      console.warn('[Chatbot] Could not load embedding model, using keyword search:', error);
      embeddingPipeline = null;
    }
  }

  // Load API configuration
  function loadAPIConfig() {
    // Try to load from meta tags
    const apiEndpointMeta = document.querySelector('meta[name="chatbot-api-endpoint"]');
    const apiTypeMeta = document.querySelector('meta[name="chatbot-api-type"]');
    const useProxyMeta = document.querySelector('meta[name="chatbot-use-proxy"]');

    if (apiEndpointMeta) CONFIG.apiEndpoint = apiEndpointMeta.content;
    if (apiTypeMeta) CONFIG.apiType = apiTypeMeta.content;

    // Check if proxy is enabled (secure mode)
    const useProxy = useProxyMeta && useProxyMeta.content === 'true';

    // Check if we should use external API
    if (useProxy || apiEndpointMeta) {
      CONFIG.useLocalMode = false;
      console.log('[Chatbot] Using external AI API via secure proxy:', CONFIG.apiType);
    } else {
      console.log('[Chatbot] Using local rule-based mode');
    }
  }

  // Setup event listeners
  function setupEventListeners() {
    // Toggle chatbot
    chatbotToggle.addEventListener('click', toggleChatbot);
    chatbotClose.addEventListener('click', closeChatbot);

    // Send message
    chatbotSend.addEventListener('click', handleSendMessage);
    chatbotInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Auto-resize textarea
    chatbotInput.addEventListener('input', autoResizeTextarea);

    // Suggestion chips
    chatbotSuggestions.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggestion-chip')) {
        const question = e.target.dataset.question;
        chatbotInput.value = question;
        handleSendMessage();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && chatbotWindow.classList.contains('open')) {
        closeChatbot();
      }
    });
  }

  // Toggle chatbot window
  function toggleChatbot() {
    chatbotWindow.classList.toggle('open');
    chatbotToggle.classList.toggle('active');
    if (chatbotWindow.classList.contains('open')) {
      chatbotInput.focus();
      // Hide suggestions after first interaction
      if (conversationHistory.length > 0) {
        chatbotSuggestions.style.display = 'none';
      }
    }
  }

  // Close chatbot
  function closeChatbot() {
    chatbotWindow.classList.remove('open');
    chatbotToggle.classList.remove('active');
  }

  // Auto-resize textarea
  function autoResizeTextarea() {
    chatbotInput.style.height = 'auto';
    chatbotInput.style.height = Math.min(chatbotInput.scrollHeight, 120) + 'px';
  }

  // Handle send message
  async function handleSendMessage() {
    const message = chatbotInput.value.trim();
    if (!message || isProcessing) return;

    // Add user message
    addUserMessage(message);
    chatbotInput.value = '';
    chatbotInput.style.height = 'auto';

    // Hide suggestions
    chatbotSuggestions.style.display = 'none';

    // Process message
    isProcessing = true;
    showTypingIndicator();

    try {
      const response = await processQuery(message);
      hideTypingIndicator();
      await addBotMessage(response.answer, response.references);

      // Add suggestions if available
      if (response.suggestions && response.suggestions.length > 0) {
        addSuggestions(response.suggestions);
      }
    } catch (error) {
      console.error('[Chatbot] Error processing query:', error);
      hideTypingIndicator();
      addBotMessage('Sorry, I encountered an error processing your question. Please try again.');
    } finally {
      isProcessing = false;
    }
  }

  // Process user query with RAG approach
  async function processQuery(query) {
    if (!searchData) {
      return {
        answer: 'Sorry, the handbook content is still loading. Please wait a moment and try again.',
        references: []
      };
    }

    // Check if it's a follow-up question
    const isFollowUp = isFollowUpQuestion(query);

    // If follow-up, rephrase into a complete standalone question for search
    let searchQuery = query;
    if (isFollowUp && conversationHistory.length > 0) {
      searchQuery = await rephraseFollowUpQuestion(query, conversationHistory);
      console.log('[Chatbot] Follow-up detected. Original:', query, '| Search query:', searchQuery);
    }

    // Step 1: Add user query to conversation history BEFORE making API call
    // (Store the ORIGINAL question, not the rephrased one)
    conversationHistory.push({
      role: 'user',
      content: query
    });

    // Step 2: Search for relevant content using the rephrased query
    // This helps find better context for follow-up questions
    const relevantContent = await searchContent(searchQuery);

    if (relevantContent.length === 0) {
      const noResultResponse = {
        answer: "I couldn't find any relevant information in the Faculty Handbook for your question. Could you try rephrasing it or ask about a different topic?",
        references: [],
        suggestions: [
          "How do I apply for leave?",
          "What are teaching requirements?",
          "Tell me about research funding"
        ]
      };
      // Add assistant response to history
      conversationHistory.push({
        role: 'assistant',
        content: noResultResponse.answer,
        references: noResultResponse.references,
        suggestions: noResultResponse.suggestions
      });
      saveConversation();
      return noResultResponse;
    }

    // Step 3: Generate response based on retrieved content
    let response;
    if (CONFIG.useLocalMode) {
      response = await generateLocalResponse(query, relevantContent);
    } else {
      response = await generateAPIResponse(query, relevantContent);
    }

    // Step 4: Add suggested questions
    if (CONFIG.suggestionsEnabled) {
      response.suggestions = generateSuggestions(query, relevantContent);
    }

    // Step 5: Add assistant response to conversation history
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

  // Search content using keyword matching and relevance scoring
  // Hybrid search: Combines semantic (embedding-based) + keyword search
  async function searchContent(query) {
    // If embeddings available, use hybrid search
    if (embeddingsData && embeddingPipeline) {
      return await hybridSearch(query);
    } else {
      // Fallback to keyword search
      return keywordSearch(query);
    }
  }

  // Keyword-based search (original method)
  function keywordSearch(query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const results = [];

    // Search through all indexed content
    for (const [id, page] of Object.entries(searchData)) {
      const title = (page.title || '').toLowerCase();
      const content = (page.content || '').toLowerCase();
      const url = page.url || '';

      // Calculate relevance score
      let score = 0;

      // Exact phrase match (highest weight)
      if (title.includes(queryLower) || content.includes(queryLower)) {
        score += 10;
      }

      // Title keyword matches
      for (const word of queryWords) {
        if (title.includes(word)) {
          score += 3;
        }
      }

      // Content keyword matches
      for (const word of queryWords) {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        const matches = content.match(regex);
        if (matches) {
          score += matches.length * 0.5;
        }
      }

      // Store result if relevant
      if (score > CONFIG.minRelevanceScore) {
        results.push({
          id,
          title: page.title,
          content: page.content,
          url: url,
          score: score,
          preview: generatePreview(page.content, queryWords)
        });
      }
    }

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);

    // Return top results
    return results.slice(0, CONFIG.maxSearchResults);
  }

  // Hybrid semantic + keyword search
  async function hybridSearch(query) {
    try {
      console.log('[Chatbot] Using hybrid semantic + keyword search');

      // Step 1: Get query embedding
      const queryEmbedding = await getQueryEmbedding(query);

      // Step 2: Calculate semantic similarity for all pages
      const results = embeddingsData.map(page => {
        const semanticScore = cosineSimilarity(queryEmbedding, page.embedding);

        // Step 3: Also calculate keyword score
        const keywordScore = calculateKeywordScore(query, page);

        // Step 4: Combine scores (weighted: 70% semantic, 30% keyword)
        const combinedScore = (semanticScore * 0.7) + (keywordScore * 0.3);

        return {
          id: page.id,
          title: page.title,
          content: page.content,
          url: page.url,
          score: combinedScore,
          semanticScore: semanticScore,
          keywordScore: keywordScore,
          preview: generatePreview(page.content, query.toLowerCase().split(/\s+/))
        };
      });

      // Sort by combined score
      results.sort((a, b) => b.score - a.score);

      // Return top results
      const topResults = results.slice(0, CONFIG.maxSearchResults);

      console.log('[Chatbot] Top results:', topResults.map(r => ({
        title: r.title,
        semantic: r.semanticScore.toFixed(3),
        keyword: r.keywordScore.toFixed(3),
        combined: r.score.toFixed(3)
      })));

      return topResults;

    } catch (error) {
      console.error('[Chatbot] Hybrid search error, falling back to keyword search:', error);
      return keywordSearch(query);
    }
  }

  // Get embedding for query text
  async function getQueryEmbedding(text) {
    const output = await embeddingPipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  // Calculate cosine similarity between two vectors
  function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  // Calculate keyword score (normalized 0-1)
  function calculateKeywordScore(query, page) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    const title = (page.title || '').toLowerCase();
    const content = (page.content || '').toLowerCase();

    let score = 0;

    // Exact phrase match
    if (title.includes(queryLower)) score += 5;
    if (content.includes(queryLower)) score += 3;

    // Title keyword matches
    for (const word of queryWords) {
      if (title.includes(word)) score += 2;
    }

    // Content keyword matches
    for (const word of queryWords) {
      const regex = new RegExp('\\b' + word + '\\b', 'gi');
      const matches = content.match(regex);
      if (matches) score += matches.length * 0.3;
    }

    // Normalize to 0-1 range (assuming max score ~20)
    return Math.min(score / 20, 1.0);
  }

  // Generate preview snippet with query context
  function generatePreview(content, queryWords) {
    const maxLength = 200;

    // Find first occurrence of any query word
    let bestIndex = -1;
    for (const word of queryWords) {
      const index = content.toLowerCase().indexOf(word);
      if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
        bestIndex = index;
      }
    }

    if (bestIndex === -1) {
      return content.substring(0, maxLength) + '...';
    }

    // Extract context around the match
    const start = Math.max(0, bestIndex - 80);
    const end = Math.min(content.length, bestIndex + 120);
    let preview = content.substring(start, end);

    if (start > 0) preview = '...' + preview;
    if (end < content.length) preview = preview + '...';

    return preview;
  }

  // Generate response using local rule-based approach
  async function generateLocalResponse(query, relevantContent) {
    // Build response from most relevant content
    const topResult = relevantContent[0];

    // Create answer with context
    let answer = '';

    // Add direct answer based on top result
    if (topResult.score > 5) {
      answer = `Based on the Faculty Handbook, here's what I found:\n\n`;
      answer += topResult.preview;
    } else {
      answer = `I found some relevant information in the handbook:\n\n`;
      answer += topResult.preview;
    }

    // Add references
    const references = relevantContent.slice(0, 3).map(result => ({
      title: result.title,
      url: result.url,
      preview: result.preview
    }));

    return { answer, references };
  }

  // Generate response using external AI API (via secure proxy)
  async function generateAPIResponse(query, relevantContent) {
    // Prepare context from relevant content
    const context = relevantContent.map((result, idx) => {
      return `[${idx + 1}] ${result.title}\n${result.preview}\nURL: ${result.url}`;
    }).join('\n\n');

    // Trim context if too long
    const trimmedContext = context.substring(0, CONFIG.maxContextLength);

    // Extract references
    const references = relevantContent.slice(0, 3).map(result => ({
      title: result.title,
      url: result.url,
      preview: result.preview
    }));

    try {
      let answer;

      // Use secure proxy endpoint (API key stays on server)
      if (CONFIG.apiEndpoint) {
        answer = await callSecureProxy(query, trimmedContext);
      } else {
        // Fallback to direct API calls (less secure, for backward compatibility)
        console.warn('[Chatbot] Using direct API calls. Consider using secure proxy.');
        if (CONFIG.apiType === 'gemini') {
          answer = await callGeminiAPI(query, trimmedContext);
        } else if (CONFIG.apiType === 'claude') {
          answer = await callClaudeAPI(query, trimmedContext);
        } else {
          answer = await callOpenAIAPI(query, trimmedContext);
        }
      }

      return { answer, references };

    } catch (error) {
      console.error('[Chatbot] API error:', error);
      // Fallback to local response
      return generateLocalResponse(query, relevantContent);
    }
  }

  // Call secure proxy endpoint (RECOMMENDED - API key stays on server)
  async function callSecureProxy(query, context) {
    // Format conversation history for Gemini API format
    const formattedHistory = conversationHistory.slice(-CONFIG.maxConversationTurns * 2).map(turn => {
      return {
        role: turn.role,
        parts: [{ text: turn.content }]
      };
    });

    const response = await fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        context: context,
        conversationHistory: formattedHistory,
        apiType: CONFIG.apiType
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Proxy error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return data.answer;
  }

  // Call Google Gemini API
  async function callGeminiAPI(query, context) {
    const prompt = `You are a helpful assistant for the IIT Madras Faculty Handbook.

IMPORTANT RULES:
1. Only use information from the provided context below
2. If the answer is not in the context, say so clearly
3. Be concise, helpful, and conversational
4. Do not make up or assume information not in the context

Context from Faculty Handbook:
${context}

User Question: ${query}

Answer:`;

    const response = await fetch(CONFIG.apiEndpoint || `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
          topP: 0.8,
          topK: 10
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  // Call Anthropic Claude API
  async function callClaudeAPI(query, context) {
    const systemPrompt = `You are a helpful assistant for the IIT Madras Faculty Handbook.

IMPORTANT RULES:
1. Only use information from the provided context
2. If the answer is not in the context, say so clearly
3. Be concise and helpful
4. Do not make up information

Context from Faculty Handbook:
${context}`;

    const response = await fetch(CONFIG.apiEndpoint || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          { role: 'user', content: query }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  // Call OpenAI or compatible API
  async function callOpenAIAPI(query, context) {
    const systemPrompt = `You are a helpful assistant for the IIT Madras Faculty Handbook.

IMPORTANT RULES:
1. Only use information from the provided context below
2. If the answer is not in the context, say so clearly
3. Be concise and helpful
4. Do not make up information

Context from Faculty Handbook:
${context}`;

    const response = await fetch(CONFIG.apiEndpoint || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Add user message to chat
  function addUserMessage(message, scroll = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chatbot-message user-message';
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="message-avatar user-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    `;
    chatbotMessages.appendChild(messageDiv);
    if (scroll) scrollToBottom();
  }

  // Add bot message without typing effect (for restoring history)
  function addBotMessageSync(message, references = []) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chatbot-message bot-message';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const messageP = document.createElement('p');
    messageP.textContent = message;

    messageDiv.innerHTML = `
      <div class="message-avatar bot-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="9" cy="10" r="1.5"/>
          <circle cx="15" cy="10" r="1.5"/>
          <path d="M12 17.5c-2.33 0-4.32-1.45-5.12-3.5h10.24c-.8 2.05-2.79 3.5-5.12 3.5z"/>
        </svg>
      </div>
    `;
    messageDiv.appendChild(contentDiv);
    contentDiv.appendChild(messageP);

    // Add references if available
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

    chatbotMessages.appendChild(messageDiv);
  }

  // Add bot message to chat with typing effect
  async function addBotMessage(message, references = []) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chatbot-message bot-message';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const messageP = document.createElement('p');
    messageP.className = 'typing';

    messageDiv.innerHTML = `
      <div class="message-avatar bot-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="9" cy="10" r="1.5"/>
          <circle cx="15" cy="10" r="1.5"/>
          <path d="M12 17.5c-2.33 0-4.32-1.45-5.12-3.5h10.24c-.8 2.05-2.79 3.5-5.12 3.5z"/>
        </svg>
      </div>
    `;
    messageDiv.appendChild(contentDiv);
    contentDiv.appendChild(messageP);

    chatbotMessages.appendChild(messageDiv);
    scrollToBottom();

    // Typing effect
    await typeMessage(messageP, message);
    messageP.classList.remove('typing');

    // Add references if available
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

    scrollToBottom();
  }

  // Typing effect
  function typeMessage(element, text) {
    return new Promise((resolve) => {
      let index = 0;
      const interval = setInterval(() => {
        if (index < text.length) {
          element.textContent += text[index];
          index++;
          scrollToBottom();
        } else {
          clearInterval(interval);
          resolve();
        }
      }, CONFIG.typingDelay);
    });
  }

  // Show typing indicator
  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'chatbot-message bot-message';
    indicator.innerHTML = `
      <div class="message-avatar bot-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="9" cy="10" r="1.5"/>
          <circle cx="15" cy="10" r="1.5"/>
          <path d="M12 17.5c-2.33 0-4.32-1.45-5.12-3.5h10.24c-.8 2.05-2.79 3.5-5.12 3.5z"/>
        </svg>
      </div>
      <div class="message-content">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    chatbotMessages.appendChild(indicator);
    scrollToBottom();
  }

  // Hide typing indicator
  function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  // Scroll chat to bottom
  function scrollToBottom() {
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
