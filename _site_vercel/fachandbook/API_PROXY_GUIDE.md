/**
 * Secure API Proxy for Faculty Handbook Chatbot
 * This runs on Vercel/Netlify and keeps your API key hidden
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers (adjust origin to your domain)
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your domain in production
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { query, context, apiType } = req.body;

    // Validate input
    if (!query || !context) {
      return res.status(400).json({ error: 'Missing query or context' });
    }

    // Get API key from environment variable (secure!)
    const apiKey = process.env.CHATBOT_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    let answer;

    // Call appropriate AI service
    if (apiType === 'gemini') {
      answer = await callGemini(query, context, apiKey);
    } else if (apiType === 'openai') {
      answer = await callOpenAI(query, context, apiKey);
    } else if (apiType === 'claude') {
      answer = await callClaude(query, context, apiKey);
    } else {
      return res.status(400).json({ error: 'Invalid API type' });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: 'Failed to process request',
      message: error.message
    });
  }
}

// Call Google Gemini
async function callGemini(query, context, apiKey) {
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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
          topP: 0.8,
          topK: 10
        }
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

// Call OpenAI
async function callOpenAI(query, context, apiKey) {
  const systemPrompt = `You are a helpful assistant for the IIT Madras Faculty Handbook.

IMPORTANT RULES:
1. Only use information from the provided context
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
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Call Claude
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
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
