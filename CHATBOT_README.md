# 🤖 Faculty Handbook AI Chatbot

## Overview

The Faculty Handbook now includes an intelligent AI chatbot that helps users find information quickly and accurately. The chatbot uses a **RAG (Retrieval-Augmented Generation)** approach to ensure responses are grounded in actual handbook content, preventing hallucinations.

## Features

✅ **Accurate & Grounded**: Only answers based on actual handbook content
✅ **No Hallucination**: Uses RAG to prevent making up information
✅ **Source References**: Provides links to relevant handbook pages
✅ **Smart Search**: Finds relevant content using keyword matching and relevance scoring
✅ **Floating UI**: Non-intrusive floating button with chat window
✅ **Mobile Responsive**: Works seamlessly on all devices
✅ **Accessible**: Keyboard navigation and ARIA labels
✅ **Typing Animation**: Natural conversation feel
✅ **Dark Mode Support**: Adapts to user's color scheme preference
✅ **Configurable**: Can work with or without external AI API

## How It Works

### 1. **Content Indexing**
The chatbot reuses Jekyll's existing search data (`search-data.json`) which contains:
- All page titles
- Full page content
- URLs for reference
- Organized by sections

### 2. **Query Processing**
When a user asks a question:
1. The query is analyzed and broken into keywords
2. Content is searched using relevance scoring
3. Top matching results are retrieved
4. Context is prepared from relevant content

### 3. **Response Generation**

**Local Mode (Default)**:
- Uses rule-based approach
- Extracts relevant snippets from handbook
- Provides direct quotes and summaries
- **No external API required**

**API Mode (Optional)**:
- Sends context to AI API (OpenAI, Claude, local LLM)
- AI generates natural language response
- Response is constrained to provided context only
- System prompt prevents hallucination

### 4. **Reference Linking**
Every response includes:
- Links to source pages
- Preview snippets
- Accurate page titles

## Installation

The chatbot is already installed and integrated! Files added:

```
facultyhandbook/
├── _includes/components/chatbot.html       # Chatbot UI component
├── _sass/chatbot.scss                      # Chatbot styles
├── assets/js/chatbot.js                    # Chatbot logic
└── _config.yml                             # Configuration (updated)
```

## Configuration

### Basic Configuration

In [_config.yml](_config.yml):

```yaml
# AI Chatbot Configuration
chatbot:
  enabled: true  # Set to false to disable the chatbot
```

### Advanced Configuration (Optional AI API)

To use an external AI API for more natural responses:

```yaml
chatbot:
  enabled: true
  api_endpoint: "https://api.openai.com/v1/chat/completions"
  api_key: "your-api-key-here"
```

**Supported APIs**:
- OpenAI (GPT-3.5, GPT-4)
- Anthropic Claude
- Azure OpenAI
- Local LLMs (Ollama, LM Studio, etc.)
- Any OpenAI-compatible endpoint

### Security Note

⚠️ **Never commit API keys to Git!**

Instead, use environment variables:

```yaml
chatbot:
  enabled: true
  api_endpoint: "{{ site.env.CHATBOT_API_ENDPOINT }}"
  api_key: "{{ site.env.CHATBOT_API_KEY }}"
```

## Usage

### For End Users

1. **Open Chatbot**: Click the floating purple button in the bottom-right corner
2. **Ask Question**: Type your question or click a suggestion chip
3. **Get Answer**: Receive response with relevant page links
4. **Follow Links**: Click references to read full details
5. **Close**: Click X or press Escape key

### Example Questions

- "How do I apply for leave?"
- "What are the research grant procedures?"
- "How to book campus facilities?"
- "What are the teaching responsibilities?"
- "Tell me about travel reimbursement"
- "How do I access the payslip?"

## Customization

### Changing Appearance

Edit [_sass/chatbot.scss](_sass/chatbot.scss):

```scss
// Change color scheme
.chatbot-toggle {
  background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_COLOR 100%);
}

// Change position
.chatbot-container {
  bottom: 20px;  // Distance from bottom
  right: 20px;   // Distance from right
}
```

### Changing Behavior

Edit [assets/js/chatbot.js](assets/js/chatbot.js):

```javascript
const CONFIG = {
  maxSearchResults: 5,        // Number of pages to search
  minRelevanceScore: 0.1,     // Minimum relevance threshold
  maxContextLength: 3000,     // Maximum context characters
  typingDelay: 50,            // Typing animation speed (ms)
  useLocalMode: true,         // Use local vs API mode
};
```

### Customizing Welcome Message

Edit [_includes/components/chatbot.html](_includes/components/chatbot.html), find the welcome message section and modify as needed.

### Adding Suggestion Chips

In [_includes/components/chatbot.html](_includes/components/chatbot.html):

```html
<button class="suggestion-chip" data-question="Your question?">
  Display Text
</button>
```

## How RAG Prevents Hallucination

### Traditional AI Chatbots
- Generate responses from training data
- May "hallucinate" or make up information
- No source verification
- Can be confidently wrong

### Our RAG-Based Chatbot
1. **Retrieval**: First searches actual handbook content
2. **Augmentation**: Adds relevant context to prompt
3. **Generation**: AI only uses provided context
4. **Grounding**: Response constrained to handbook facts
5. **Citations**: Always includes source references

### System Prompt Example
```
You are a helpful assistant for the IIT Madras Faculty Handbook.

IMPORTANT RULES:
1. Only use information from the provided context
2. If answer is not in context, say so clearly
3. Always cite sources using references
4. Do not make up or assume information
```

## Technical Details

### Architecture

```
User Query
    ↓
[Keyword Extraction]
    ↓
[Content Search] → Search Index (search-data.json)
    ↓
[Relevance Scoring]
    ↓
[Context Building]
    ↓
┌─────────────┬─────────────┐
│ Local Mode  │  API Mode   │
│ (Default)   │ (Optional)  │
└─────────────┴─────────────┘
    ↓
[Response Generation]
    ↓
[Add References]
    ↓
Display to User
```

### Search Algorithm

1. **Query Processing**
   - Convert to lowercase
   - Split into words
   - Filter stop words

2. **Relevance Scoring**
   - Exact phrase match: +10 points
   - Title keyword match: +3 points per word
   - Content keyword match: +0.5 points per occurrence

3. **Result Ranking**
   - Sort by score
   - Return top N results
   - Generate preview snippets

### Performance

- **Fast**: Local mode responds in <500ms
- **Lightweight**: Reuses existing search index
- **Efficient**: No external dependencies required
- **Scalable**: Works with any size handbook

## Troubleshooting

### Chatbot Not Appearing

1. Check [_config.yml](_config.yml): `chatbot.enabled: true`
2. Clear Jekyll cache: `bundle exec jekyll clean`
3. Rebuild site: `bundle exec jekyll build`
4. Check browser console for errors

### Chatbot Shows But No Responses

1. Check if `search-data.json` exists at `/assets/js/search-data.json`
2. Open browser console and look for loading errors
3. Verify Jekyll search is enabled in [_config.yml](_config.yml)

### API Mode Not Working

1. Verify API endpoint is correct
2. Check API key is valid
3. Ensure endpoint is OpenAI-compatible
4. Check browser console for API errors
5. Verify CORS is enabled on API endpoint

### Styling Issues

1. Verify [_sass/chatbot.scss](_sass/chatbot.scss) exists
2. Check `@import "chatbot"` in [assets/css/just-the-docs-default.scss](assets/css/just-the-docs-default.scss)
3. Clear browser cache
4. Rebuild Jekyll

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader support (ARIA labels)
- ✅ Focus indicators
- ✅ High contrast support
- ✅ Reduced motion support

## Future Enhancements

Possible improvements:
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Conversation history persistence
- [ ] Admin analytics dashboard
- [ ] Custom knowledge base editor
- [ ] Feedback mechanism (thumbs up/down)
- [ ] Export conversation as PDF

## Contributing

To improve the chatbot:

1. Edit relevant files:
   - UI: [_includes/components/chatbot.html](_includes/components/chatbot.html)
   - Logic: [assets/js/chatbot.js](assets/js/chatbot.js)
   - Styles: [_sass/chatbot.scss](_sass/chatbot.scss)

2. Test thoroughly:
   ```bash
   bundle exec jekyll serve
   ```

3. Commit changes:
   ```bash
   git add .
   git commit -m "Improve chatbot: [description]"
   ```

## License

Same as Faculty Handbook project (MIT License).

## Support

For issues or questions:
1. Check this documentation
2. Review browser console errors
3. Contact the handbook maintainers

---

**Built with ❤️ for IIT Madras Faculty**
