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
    maxSearchResults: 10, // Return top 10 results to AI (increased from 5)
    initialSearchPool: 30, // Get 30 candidates in first pass (new)
    minRelevanceScore: 0.05, // Lower threshold to catch more results (was 0.1)
    apiEndpoint: null, // Set to your AI API endpoint (e.g., OpenAI, Claude, Gemini)
    apiKey: null, // Set your API key in _config.yml or environment variable
    apiType: 'openai', // 'openai', 'gemini', or 'claude'
    useLocalMode: true, // If true, uses rule-based responses without external API
    maxContextLength: 12000, // Maximum characters to send as context (increased from 3000)
    typingDelay: 30, // Milliseconds per character for typing effect
    maxConversationTurns: 10, // Keep last N conversation turns for context
    suggestionsEnabled: true, // Show suggested follow-up questions
  };

  // State
  let searchData = null;
  let knowledgeData = null; // Enriched knowledge base for chatbot fallback
  let embeddingsData = null;
  let embeddingPipeline = null;
  let conversationHistory = [];
  let isProcessing = false;
  let sessionId = null;
  let recognition = null;
  let isListening = false;
  let speechSynthesis = window.speechSynthesis;
  let currentUtterance = null;
  let autoSpeakEnabled = false; // Voice is OFF by default

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
  let chatbotVoiceBtn = null; // Will be created dynamically

  // Initialize chatbot
  function init() {
    // Load search data (reuse existing Jekyll search index)
    loadSearchData();

    // Load enriched knowledge data for chatbot fallback
    loadKnowledgeData();

    // Load embeddings for semantic search
    // Note: initEmbeddingModel() is called AFTER embeddings load (inside loadEmbeddings)
    loadEmbeddings();

    // Initialize conversation memory
    initConversation();

    // Setup event listeners
    setupEventListeners();

    // Load API configuration from meta tags or config
    loadAPIConfig();

    // Load voices for speech synthesis (ensures consistent voice across devices)
    if (speechSynthesis) {
      speechSynthesis.onvoiceschanged = () => {
        const voices = speechSynthesis.getVoices();
        console.log('[Chatbot] Available voices:', voices.map(v => v.name).join(', '));
      };
      // Trigger voice loading
      speechSynthesis.getVoices();
    }
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
      const prompt = `Based on this conversation:

${conversationContext}

The user asks: "${query}"

Please provide a clear, complete version of this question that includes the specific topic being discussed. Output only the complete question, nothing else.`;

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
    // Use base URL only - no path extraction
    const searchDataUrl = window.location.origin + '/assets/js/search-data.json';

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

  // Load enriched knowledge base for chatbot fallback
  function loadKnowledgeData() {
    const knowledgeDataUrl = window.location.origin + '/assets/js/search-knowledge.json';

    console.log('[Chatbot] Loading knowledge data from:', knowledgeDataUrl);

    fetch(knowledgeDataUrl)
      .then(response => {
        if (!response.ok) {
          console.warn('[Chatbot] Knowledge data not found, will use search-data for fallback');
          return null;
        }
        return response.json();
      })
      .then(data => {
        if (data) {
          knowledgeData = data;
          console.log('[Chatbot] Knowledge data loaded:', data.length, 'entries');
        }
      })
      .catch(error => {
        console.error('[Chatbot] Failed to load knowledge data:', error);
        console.warn('[Chatbot] Will use search-data for fallback instead');
      });
  }

  // Load pre-computed embeddings for semantic search
  function loadEmbeddings() {
    // Use base URL only - no path extraction
    const embeddingsUrl = window.location.origin + '/assets/js/search-embeddings.json';

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

          // Now initialize the embedding model after embeddings are loaded
          initEmbeddingModel();
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

  // ============================================
  // SPEECH FEATURES
  // ============================================

  // Initialize speech recognition for voice input
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log('[Chatbot] Voice input not supported on this browser. Please use Chrome, Edge, or Opera for voice input. You can still type your questions!');

      // Show a message to the user in the chatbot
      showBrowserNotSupportedMessage();
      return; // Don't create mic button - it will be hidden
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Indian English
    recognition.continuous = false; // Non-continuous mode - stops automatically when you pause
    recognition.interimResults = false; // Only show final results to avoid duplicates
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[Chatbot] Microphone is now listening... Please speak clearly.');
    };

    recognition.onresult = (event) => {
      // In non-continuous mode, we get one clean final result
      const transcript = event.results[0][0].transcript;
      console.log('[Chatbot] Voice input received:', transcript);
      chatbotInput.value = transcript;
    };

    recognition.onerror = (event) => {
      console.error('[Chatbot] Speech recognition error:', event.error);
      isListening = false;

      if (chatbotVoiceBtn) {
        chatbotVoiceBtn.classList.remove('listening');
        chatbotVoiceBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
      }

      if (event.error === 'no-speech') {
        console.log('[Chatbot] No speech detected.');
      } else if (event.error === 'audio-capture') {
        alert('No microphone found. Please check your microphone.');
      } else if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please allow microphone access.');
      }
    };

    recognition.onend = () => {
      console.log('[Chatbot] Speech recognition ended');
      isListening = false;

      if (chatbotVoiceBtn) {
        chatbotVoiceBtn.classList.remove('listening');
        chatbotVoiceBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
      }

      // Auto-send message when recognition ends
      setTimeout(() => {
        if (chatbotInput.value.trim()) {
          console.log('[Chatbot] Auto-sending message');
          handleSendMessage();
        }
      }, 300);
    };
  }

  // Show message for unsupported browsers
  function showBrowserNotSupportedMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chatbot-message bot-message';
    messageDiv.style.marginBottom = '12px';
    messageDiv.innerHTML = `
      <div class="message-avatar bot-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="9" cy="10" r="1.5"/>
          <circle cx="15" cy="10" r="1.5"/>
          <path d="M12 17.5c-2.33 0-4.32-1.45-5.12-3.5h10.24c-.8 2.05-2.79 3.5-5.12 3.5z"/>
        </svg>
      </div>
      <div class="message-content">
        <p style="margin: 0; font-size: 14px; line-height: 1.5;">
          <strong>Note:</strong> Voice input is not supported on this browser.
          For voice input, please use <strong>Chrome</strong>, <strong>Edge</strong>, or <strong>Opera</strong>.
          You can still type your questions here!
        </p>
      </div>
    `;
    chatbotMessages.appendChild(messageDiv);
    scrollToBottom();
  }

  // Create voice input button
  function createVoiceButton() {
    if (!recognition) return;

    const inputContainer = chatbotInput.parentElement;
    chatbotVoiceBtn = document.createElement('button');
    chatbotVoiceBtn.id = 'chatbot-voice';
    chatbotVoiceBtn.type = 'button';
    chatbotVoiceBtn.className = 'chatbot-voice-btn';
    chatbotVoiceBtn.title = 'Voice input';
    chatbotVoiceBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';

    chatbotVoiceBtn.addEventListener('click', toggleVoiceInput);
    inputContainer.insertBefore(chatbotVoiceBtn, chatbotSend);
  }

  // Toggle voice input
  function toggleVoiceInput() {
    console.log('[Chatbot] Voice button clicked');
    if (!recognition) {
      console.log('[Chatbot] Speech recognition not available');
      return;
    }

    if (isListening) {
      // User wants to stop - just stop, onend will handle the rest
      console.log('[Chatbot] Stopping speech recognition');
      recognition.stop();
    } else {
      console.log('[Chatbot] Starting speech recognition');

      // Check for microphone permission first
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'microphone' }).then(permissionStatus => {
          console.log('[Chatbot] Microphone permission:', permissionStatus.state);
          if (permissionStatus.state === 'denied') {
            alert('Microphone access is denied. Please allow microphone access in your browser settings.');
            return;
          }
        }).catch(err => {
          console.log('[Chatbot] Permission check not supported, proceeding anyway');
        });
      }

      try {
        recognition.start();
        isListening = true;
        chatbotVoiceBtn.classList.add('listening');
        chatbotVoiceBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" fill="none" stroke="currentColor" stroke-width="2"></path></svg>';
      } catch (error) {
        console.error('[Chatbot] Error starting recognition:', error);
        if (error.message.includes('not-allowed') || error.message.includes('permission')) {
          alert('Microphone access denied. Please allow microphone access and try again.');
        }
        isListening = false;
        chatbotVoiceBtn.classList.remove('listening');
      }
    }
  }

  // Text-to-speech function using Google Cloud TTS
  async function speakText(text) {
    console.log('[Chatbot] Speaking text:', text.substring(0, 50) + '...');

    // Stop any ongoing speech
    stopSpeaking();

    // Clean text (remove markdown and HTML)
    let cleanText = text.replace(/[*_`#\[\]()]/g, '').replace(/<[^>]*>/g, '');

    // Remove "For more details, click the references below" from speech
    cleanText = cleanText.replace(/\n\nFor more details.*$/i, '');

    console.log('[Chatbot] Clean text:', cleanText.substring(0, 50) + '...');

    try {
      // Call our TTS proxy API
      const ttsEndpoint = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api/api/tts'
        : '/api/api/tts';

      const response = await fetch(ttsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText })
      });

      if (!response.ok) {
        console.error('[Chatbot] TTS API failed, falling back to browser voice');
        speakTextBrowserFallback(cleanText);
        return;
      }

      const data = await response.json();

      // Convert base64 audio to playable format
      const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio element
      const audio = new Audio(audioUrl);
      currentUtterance = audio; // Store for stop functionality

      audio.onended = () => {
        console.log('[Chatbot] Speech completed');
        currentUtterance = null;
        URL.revokeObjectURL(audioUrl); // Clean up
      };

      audio.onerror = (error) => {
        console.error('[Chatbot] Audio playback error:', error);
        currentUtterance = null;
      };

      console.log('[Chatbot] Playing Google TTS audio');
      await audio.play();

    } catch (error) {
      console.error('[Chatbot] TTS error, falling back to browser voice:', error);
      speakTextBrowserFallback(cleanText);
    }
  }

  // Fallback to browser's Web Speech API if Google TTS fails
  function speakTextBrowserFallback(cleanText) {
    console.log('[Chatbot] Using browser fallback voice');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-IN';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use Neerja or female voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Neerja')) ||
                          voices.find(v => v.lang.includes('en-IN') && v.name.toLowerCase().includes('female')) ||
                          voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log('[Chatbot] Using fallback voice:', preferredVoice.name);
    }

    utterance.onend = () => {
      currentUtterance = null;
    };

    utterance.onerror = (event) => {
      console.error('[Chatbot] Browser speech error:', event);
      currentUtterance = null;
    };

    currentUtterance = utterance;
    speechSynthesis.speak(utterance);
  }

  // Convert base64 to Blob
  function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Stop speaking (handles both Google TTS and browser fallback)
  function stopSpeaking() {
    // Stop browser speech synthesis
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }

    // Stop Google TTS audio if playing
    if (currentUtterance) {
      if (currentUtterance instanceof Audio) {
        currentUtterance.pause();
        currentUtterance.currentTime = 0;
      }
      currentUtterance = null;
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

    // Initialize speech recognition
    initSpeechRecognition();

    // Create and add voice input button
    createVoiceButton();
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
    // Use knowledgeData if available for better quality content
    const useKnowledge = knowledgeData && knowledgeData.length > 0;

    // If embeddings available, use hybrid search
    if (embeddingsData && embeddingPipeline) {
      console.log('[Chatbot] Using HYBRID SEARCH (semantic + keyword)');
      return await hybridSearch(query, useKnowledge);
    } else {
      console.warn('[Chatbot] Embeddings not loaded! Using fallback KEYWORD SEARCH only');
      console.warn('[Chatbot] embeddingsData:', !!embeddingsData, 'embeddingPipeline:', !!embeddingPipeline);
      return useKnowledge ? searchInKnowledgeData(query) : keywordSearch(query);
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
      const doc = (page.doc || '').toLowerCase();
      const url = page.url || '';
      const relUrl = page.relUrl || '';

      // Calculate relevance score
      let score = 0;

      // Exact phrase match (highest weight)
      if (title.includes(queryLower) || content.includes(queryLower) || doc.includes(queryLower)) {
        score += 10;
      }

      // Doc (category) matches - high weight since user might search by category
      if (doc.includes(queryLower)) {
        score += 5;
      }

      // Title keyword matches
      for (const word of queryWords) {
        if (title.includes(word)) {
          score += 3;
        }
        if (doc.includes(word)) {
          score += 2;
        }
      }

      // Content keyword matches
      for (const word of queryWords) {
        // Escape special regex characters
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('\\b' + escapedWord + '\\b', 'gi');
        const titleMatches = title.match(regex);
        const contentMatches = content.match(regex);
        const docMatches = doc.match(regex);

        if (titleMatches) {
          score += titleMatches.length * 1.5;
        }
        if (contentMatches) {
          score += contentMatches.length * 0.5;
        }
        if (docMatches) {
          score += docMatches.length * 1.0;
        }
      }

      // Store result if relevant
      if (score > CONFIG.minRelevanceScore) {
        results.push({
          id,
          doc: page.doc,
          title: page.title,
          content: page.content,
          url: url,
          relUrl: relUrl,
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

  // Search in enriched knowledge data (used for chatbot fallback)
  function searchInKnowledgeData(query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    const results = [];

    // Search through enriched knowledge data (array format)
    for (const page of knowledgeData) {
      const title = (page.title || '').toLowerCase();
      const content = (page.content || '').toLowerCase();
      const doc = (page.doc || '').toLowerCase();
      const url = page.url || '';
      const relUrl = page.relUrl || '';

      // Calculate relevance score
      let score = 0;

      // Exact phrase match (highest weight)
      if (title.includes(queryLower) || content.includes(queryLower) || doc.includes(queryLower)) {
        score += 10;
      }

      // Doc (category) matches - high weight since user might search by category
      if (doc.includes(queryLower)) {
        score += 5;
      }

      // Title keyword matches
      for (const word of queryWords) {
        if (title.includes(word)) {
          score += 3;
        }
        if (doc.includes(word)) {
          score += 2;
        }
      }

      // Content keyword matches
      for (const word of queryWords) {
        // Escape special regex characters
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('\\b' + escapedWord + '\\b', 'gi');
        const titleMatches = title.match(regex);
        const contentMatches = content.match(regex);
        const docMatches = doc.match(regex);

        if (titleMatches) {
          score += titleMatches.length * 1.5;
        }
        if (contentMatches) {
          score += contentMatches.length * 0.5;
        }
        if (docMatches) {
          score += docMatches.length * 1.0;
        }
      }

      // Store result if relevant
      if (score > CONFIG.minRelevanceScore) {
        results.push({
          id: page.id,
          doc: page.doc,
          title: page.title,
          content: page.content,
          url: url,
          relUrl: relUrl,
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

  // Multi-stage hybrid search with query preprocessing
  async function hybridSearch(query, useKnowledge = false) {
    try {
      console.log('[Chatbot] Multi-stage search started for:', query);
      if (useKnowledge) {
        console.log('[Chatbot] Using enriched knowledge data for search results');
      }

      // STAGE 1: Query Preprocessing and Expansion
      const processedQuery = preprocessQuery(query);
      console.log('[Chatbot] Processed query:', processedQuery);

      // STAGE 2: Get query embedding
      const queryEmbedding = await getQueryEmbedding(processedQuery.expanded);

      // STAGE 3: Calculate all scores for all pages
      const allResults = embeddingsData.map(page => {
        const semanticScore = cosineSimilarity(queryEmbedding, page.embedding);
        const keywordScore = calculateKeywordScore(processedQuery.original, page);
        const exactMatchBonus = calculateExactMatchBonus(processedQuery.original, page);

        // Keyword-focused scoring: 60% keyword, 30% semantic, 10% exact match
        // Keywords are more reliable for specific handbook queries
        const combinedScore = (keywordScore * 0.6) + (semanticScore * 0.3) + (exactMatchBonus * 0.1);

        // Use enriched content from knowledgeData if available
        let contentToUse = page.content;
        if (useKnowledge && knowledgeData) {
          const knowledgePage = knowledgeData.find(p => p.id === page.id);
          if (knowledgePage && knowledgePage.content) {
            contentToUse = knowledgePage.content;
          }
        }

        return {
          id: page.id,
          doc: page.doc,
          title: page.title,
          content: contentToUse,
          url: page.url,
          relUrl: page.relUrl,
          score: combinedScore,
          semanticScore: semanticScore,
          keywordScore: keywordScore,
          exactMatchBonus: exactMatchBonus,
          preview: generatePreview(contentToUse, processedQuery.original.toLowerCase().split(/\s+/))
        };
      });

      // STAGE 4: Sort and get initial pool (top 30)
      allResults.sort((a, b) => b.score - a.score);
      const initialPool = allResults.slice(0, CONFIG.initialSearchPool);

      // STAGE 5: Rerank the pool with advanced scoring
      const reranked = initialPool.map(result => {
        const titleRelevance = calculateTitleRelevance(processedQuery.original, result.title);
        const contentDensity = calculateContentDensity(processedQuery.keywords, result.content);

        // Final score with reranking
        const finalScore = (result.score * 0.7) + (titleRelevance * 0.2) + (contentDensity * 0.1);

        return {
          ...result,
          score: finalScore,
          titleRelevance,
          contentDensity
        };
      });

      // STAGE 6: Sort by final score and return top N
      reranked.sort((a, b) => b.score - a.score);
      const topResults = reranked.slice(0, CONFIG.maxSearchResults);

      console.log('[Chatbot] Multi-stage search complete. Top results:', topResults.map(r => ({
        title: r.title,
        semantic: r.semanticScore.toFixed(3),
        keyword: r.keywordScore.toFixed(3),
        exact: r.exactMatchBonus.toFixed(3),
        final: r.score.toFixed(3)
      })));

      return topResults;

    } catch (error) {
      console.error('[Chatbot] Hybrid search error, falling back to keyword search:', error);
      return useKnowledge && knowledgeData ? searchInKnowledgeData(query) : keywordSearch(query);
    }
  }

  // Preprocess query: extract keywords and dynamically find related terms from index
  function preprocessQuery(query) {
    const original = query;
    const queryLower = query.toLowerCase();

    // Extract base keywords (words longer than 2 chars)
    const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

    // Dynamically find related terms by scanning the search index
    const relatedTerms = new Set();

    if (embeddingsData && keywords.length > 0) {
      embeddingsData.forEach(page => {
        const titleLower = (page.title || '').toLowerCase();
        const docLower = (page.doc || '').toLowerCase();

        // Check if any keyword appears in title or doc
        const hasKeywordMatch = keywords.some(kw =>
          titleLower.includes(kw) || docLower.includes(kw)
        );

        if (hasKeywordMatch) {
          // Extract meaningful words from matching page's title and doc
          const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
          const docWords = docLower.split(/\s+/).filter(w => w.length > 3);

          // Add words that aren't already in the original keywords
          titleWords.concat(docWords).forEach(word => {
            if (!keywords.includes(word)) {
              relatedTerms.add(word);
            }
          });
        }
      });
    }

    // Limit related terms to top 10 to avoid over-expansion
    const topRelated = Array.from(relatedTerms).slice(0, 10);
    const expanded = original + ' ' + topRelated.join(' ');

    console.log('[Chatbot] Query preprocessing:', {
      original: keywords,
      relatedTerms: topRelated.length > 0 ? topRelated : 'none'
    });

    return {
      original: original,
      expanded: expanded,
      keywords: keywords,
      relatedTerms: topRelated
    };
  }

  // Calculate exact match bonus
  function calculateExactMatchBonus(query, page) {
    const queryLower = query.toLowerCase();
    const title = (page.title || '').toLowerCase();
    const content = (page.content || '').toLowerCase();

    let bonus = 0;

    // Exact phrase in title = high bonus
    if (title.includes(queryLower)) {
      bonus += 1.0;
    }

    // Exact phrase in content = medium bonus
    if (content.includes(queryLower)) {
      bonus += 0.5;
    }

    return Math.min(bonus, 1.0); // Normalize to 0-1
  }

  // Calculate title relevance score
  function calculateTitleRelevance(query, title) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const titleLower = title.toLowerCase();

    let matchedWords = 0;
    for (const word of queryWords) {
      if (titleLower.includes(word)) {
        matchedWords++;
      }
    }

    return queryWords.length > 0 ? matchedWords / queryWords.length : 0;
  }

  // Calculate content density (how concentrated the keywords are)
  function calculateContentDensity(keywords, content) {
    const contentLower = content.toLowerCase();
    let totalMatches = 0;

    for (const keyword of keywords) {
      const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
      const matches = contentLower.match(regex);
      if (matches) {
        totalMatches += matches.length;
      }
    }

    // Normalize by content length (matches per 1000 chars)
    const density = (totalMatches / content.length) * 1000;
    return Math.min(density / 10, 1.0); // Cap at 1.0
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

  // Enhanced keyword score with better weighting (normalized 0-1)
  function calculateKeywordScore(query, page) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    const title = (page.title || '').toLowerCase();
    const content = (page.content || '').toLowerCase();
    const doc = (page.doc || '').toLowerCase();

    let score = 0;

    // 1. Exact phrase match (highest weight)
    if (title.includes(queryLower)) score += 10;
    if (content.includes(queryLower)) score += 6;
    if (doc.includes(queryLower)) score += 5;

    // 2. All query words present (boolean AND)
    const allWordsInTitle = queryWords.every(w => title.includes(w));
    const allWordsInContent = queryWords.every(w => content.includes(w));
    const allWordsInDoc = queryWords.every(w => doc.includes(w));
    if (allWordsInTitle) score += 5;
    if (allWordsInContent) score += 3;
    if (allWordsInDoc) score += 4;

    // 3. Individual title keyword matches (partial match)
    for (const word of queryWords) {
      if (title.includes(word)) score += 2;
      if (doc.includes(word)) score += 1.5;
    }

    // 4. Content keyword matches with frequency
    for (const word of queryWords) {
      // Escape special regex characters in the word
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('\\b' + escapedWord + '\\b', 'gi');
      const matches = content.match(regex);
      if (matches) {
        // Diminishing returns for frequency (log scale)
        score += Math.min(matches.length * 0.5, 3);
      }
    }

    // 5. Proximity bonus: keywords close together in content
    if (queryWords.length >= 2) {
      const proximityBonus = calculateProximityBonus(queryWords, content);
      score += proximityBonus * 2;
    }

    // Normalize to 0-1 range (max realistic score ~35)
    return Math.min(score / 35, 1.0);
  }

  // Calculate proximity bonus: keywords appearing close together
  function calculateProximityBonus(keywords, content) {
    const contentLower = content.toLowerCase();
    let bestProximity = 0;

    // Find all positions of each keyword
    const positions = keywords.map(keyword => {
      // Escape special regex characters
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('\\b' + escapedKeyword + '\\b', 'gi');
      const matches = [];
      let match;
      while ((match = regex.exec(contentLower)) !== null) {
        matches.push(match.index);
      }
      return matches;
    });

    // Check if all keywords have at least one occurrence
    if (positions.some(p => p.length === 0)) {
      return 0;
    }

    // Find minimum distance between all keyword pairs
    for (let i = 0; i < positions[0].length; i++) {
      let maxDistance = 0;
      for (let j = 1; j < positions.length; j++) {
        let minDist = Infinity;
        for (let k = 0; k < positions[j].length; k++) {
          const dist = Math.abs(positions[0][i] - positions[j][k]);
          minDist = Math.min(minDist, dist);
        }
        maxDistance = Math.max(maxDistance, minDist);
      }

      // Proximity score: closer = better (within 200 chars is good)
      const proximityScore = Math.max(0, 1 - (maxDistance / 200));
      bestProximity = Math.max(bestProximity, proximityScore);
    }

    return bestProximity;
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
    // relevantContent already contains enriched knowledge data if available
    // (set by searchContent function)

    // Build response from most relevant content
    const topResult = relevantContent[0];

    // Create answer with context
    let answer = '';

    // Add direct answer based on top result
    if (topResult.score > 5) {
      answer = `Based on the Faculty Handbook, here's what I found:\n\n`;
    } else {
      answer = `I found some relevant information in the handbook:\n\n`;
    }

    // Smart truncation: show full content up to 1500 chars, ending on complete sentence
    let fullText = topResult.content || topResult.preview;
    let truncated = fullText.substring(0, 1500);

    // Find last sentence ending (. ! ?) followed by space or newline
    // Use regex to find proper sentence boundaries
    const sentenceEndRegex = /[.!?][\s\n]/g;
    let lastMatch = -1;
    let match;
    while ((match = sentenceEndRegex.exec(truncated)) !== null) {
      lastMatch = match.index;
    }

    // If found a good sentence break (after at least 500 chars), cut there
    if (lastMatch > 500) {
      answer += truncated.substring(0, lastMatch + 1); // +1 to include the period
    } else {
      // No good break point, show all we have
      answer += truncated;
    }

    // Add helpful closing line
    answer += `\n\nFor more details, click the references below.`;

    // Add references with doc field
    const references = relevantContent.slice(0, 3).map(result => ({
      doc: result.doc,
      title: result.title,
      url: result.url,
      relUrl: result.relUrl,
      preview: result.preview
    }));

    return { answer, references };
  }

  // Generate response using external AI API (via secure proxy)
  async function generateAPIResponse(query, relevantContent) {
    // Prepare context from relevant content - include ALL fields: doc, title, content, url, relUrl
    const contextParts = relevantContent.map((result, idx) => {
      return {
        text: `[${idx + 1}] Category: ${result.doc || 'General'}\nTitle: ${result.title}\nPath: ${result.relUrl || result.url}\n\n${result.content || result.preview}`,
        index: idx + 1,
        result: result
      };
    });

    // Build context string and track which results fit within limit
    let context = '';
    const includedResults = [];

    for (const part of contextParts) {
      const testContext = context + (context ? '\n\n---\n\n' : '') + part.text;
      if (testContext.length <= CONFIG.maxContextLength) {
        context = testContext;
        includedResults.push(part.result);
      } else {
        break; // Stop adding when we hit the limit
      }
    }

    // Extract references ONLY from results actually included in context
    const references = includedResults.map(result => ({
      doc: result.doc,
      title: result.title,
      url: result.url,
      relUrl: result.relUrl,
      preview: result.preview
    }));

    try {
      let answer;

      // Use secure proxy endpoint (API key stays on server)
      if (CONFIG.apiEndpoint) {
        answer = await callSecureProxy(query, context);
      } else {
        // Fallback to direct API calls (less secure, for backward compatibility)
        console.warn('[Chatbot] Using direct API calls. Consider using secure proxy.');
        if (CONFIG.apiType === 'gemini') {
          answer = await callGeminiAPI(query, context);
        } else if (CONFIG.apiType === 'claude') {
          answer = await callClaudeAPI(query, context);
        } else {
          answer = await callOpenAIAPI(query, context);
        }
      }

      // Extract which references were actually cited in the answer
      const citedReferences = extractCitedReferences(answer, references);

      return { answer, references: citedReferences };

    } catch (error) {
      console.error('[Chatbot] API error:', error);
      // Fallback to local response
      return generateLocalResponse(query, relevantContent);
    }
  }

  // Extract only the references that were actually cited in the answer
  function extractCitedReferences(answer, allReferences) {
    // Find all citation numbers [1], [2], [3], etc. in the answer
    const citationPattern = /\[(\d+)\]/g;
    const citedNumbers = new Set();
    let match;

    while ((match = citationPattern.exec(answer)) !== null) {
      const refNum = parseInt(match[1], 10);
      citedNumbers.add(refNum);
    }

    // If no citations found, return all references (backward compatibility)
    if (citedNumbers.size === 0) {
      console.warn('[Chatbot] No citations found in answer, showing all references');
      return allReferences.slice(0, 3);
    }

    // Filter references to only those that were cited
    const cited = [];
    citedNumbers.forEach(num => {
      const refIndex = num - 1; // Convert 1-based to 0-based index
      if (refIndex >= 0 && refIndex < allReferences.length) {
        cited.push(allReferences[refIndex]);
      }
    });

    console.log('[Chatbot] Citations found:', Array.from(citedNumbers), 'References:', cited.map(r => r.title));
    return cited;
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

    // Add speaker button for text-to-speech
    const speakerBtn = document.createElement('button');
    speakerBtn.className = 'speaker-btn';
    speakerBtn.title = 'Click to listen to response';
    speakerBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    speakerBtn.addEventListener('click', () => {
      if (currentUtterance) {
        // Stop speaking
        stopSpeaking();
        speakerBtn.classList.remove('speaking');
        speakerBtn.title = 'Click to listen to response';
      } else {
        // Start speaking
        speakText(message);
        speakerBtn.classList.add('speaking');
        speakerBtn.title = 'Click to stop';

        // Monitor when speech ends to update button state
        const checkSpeaking = setInterval(() => {
          if (!currentUtterance) {
            speakerBtn.classList.remove('speaking');
            speakerBtn.title = 'Click to listen to response';
            clearInterval(checkSpeaking);
          }
        }, 500);
      }
    });
    contentDiv.appendChild(speakerBtn);

    // Add references if available
    if (references && references.length > 0) {
      const referencesDiv = document.createElement('div');
      referencesDiv.className = 'message-references';
      referencesDiv.innerHTML = '<strong>📚 References:</strong>';

      const refList = document.createElement('ul');
      references.forEach(ref => {
        const li = document.createElement('li');
        const docLabel = ref.doc ? `[${escapeHtml(ref.doc)}] ` : '';
        li.innerHTML = `<a href="${escapeHtml(ref.url)}" target="_blank">${docLabel}${escapeHtml(ref.title)}</a>`;
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
