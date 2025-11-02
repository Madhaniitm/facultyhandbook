/**
 * Secure API Proxy for Faculty Handbook Chatbot
 * Serverless function that keeps API keys hidden from frontend
 * Deploy to Vercel/Netlify - API key stored in environment variables
 */

export default async function handler(req, res) {
  // CORS headers - adjust origin to your domain in production
  const allowedOrigins = [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'https://facportal.iitm.ac.in',
    // Add your production domain here
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, context, conversationHistory = '', apiType = 'gemini' } = req.body;

    // Validate input
    if (!query || !context) {
      return res.status(400).json({ error: 'Missing query or context' });
    }

    // Rate limiting (basic)
    const userAgent = req.headers['user-agent'] || '';
    if (!userAgent) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Get API key from environment variable (SECURE!)
    const apiKey = process.env.CHATBOT_API_KEY;
    if (!apiKey) {
      console.error('CHATBOT_API_KEY not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let answer;

    // Call appropriate AI service
    if (apiType === 'gemini') {
      answer = await callGemini(query, context, apiKey, conversationHistory);
    } else if (apiType === 'openai') {
      answer = await callOpenAI(query, context, apiKey, conversationHistory);
    } else if (apiType === 'claude') {
      answer = await callClaude(query, context, apiKey, conversationHistory);
    } else {
      return res.status(400).json({ error: 'Invalid API type' });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

/**
 * Call Google Gemini API
 */
async function callGemini(query, context, apiKey, conversationHistory = '') {
  // Format context array into readable text
  const formattedContext = Array.isArray(context)
    ? context.map(item => `${item.title || 'Content'}:\n${item.content || item}`).join('\n\n')
    : context;

  // Format conversation history
  let formattedHistory = '';
  if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    formattedHistory = conversationHistory
      .map(turn => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.parts[0].text}`)
      .join('\n');
  } else if (conversationHistory && typeof conversationHistory === 'string') {
    formattedHistory = conversationHistory;
  }

  const prompt = `You are a helpful assistant for the IIT Madras Faculty Handbook.

IMPORTANT RULES:
1. Provide DETAILED and COMPREHENSIVE answers (3-5 sentences minimum)
2. Include specific examples and explanations
3. Only use information from the provided context below
4. If the answer is not in the context, say so clearly
5. Be conversational and helpful
6. If there's conversation history, use it to understand follow-up questions

${formattedHistory ? `Previous Conversation:\n${formattedHistory}\n\n` : ''}

Context from Faculty Handbook:
${formattedContext}

User Question: ${query}

Provide a detailed answer:`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
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
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(query, context, apiKey) {
  const systemPrompt = `You are a helpful assistant for the IIT Madras Faculty Handbook.

IMPORTANT RULES:
1. Only use information from the provided context below
2. If the answer is not in the context, say so clearly
3. Be concise and helpful
4. Do not make up information

Context from Faculty Handbook:
${context}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
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
    const error = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Call Anthropic Claude API
 */
async function callClaude(query, context, apiKey) {
  const systemPrompt = `You are a helpful assistant for the IIT Madras Faculty Handbook.

IMPORTANT RULES:
1. Only use information from the provided context
2. If the answer is not in the context, say so clearly
3. Be concise and helpful
4. Do not make up information

Context from Faculty Handbook:
${context}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: query }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
