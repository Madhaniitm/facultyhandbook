/**
 * Google Cloud Text-to-Speech API Proxy
 * Provides consistent voice across all browsers
 * Uses Indian English Neural2 voice (Neerja-like quality)
 */

export default async function handler(req, res) {
  // CORS headers
  const allowedOrigins = [
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'https://facportal.iitm.ac.in',
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || (origin && origin.includes('vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }

    // Get API key from environment
    const apiKey = process.env.CHATBOT_API_KEY;
    if (!apiKey) {
      console.error('CHATBOT_API_KEY not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Call Google Cloud Text-to-Speech API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'en-IN',
            name: 'en-IN-Neural2-A', // Female Indian English voice (similar to Neerja)
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.1, // Slightly faster
            pitch: 0.0,
            volumeGainDb: 0.0
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google TTS API error status:', response.status);
      console.error('Google TTS API error response:', errorText);

      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { message: errorText };
      }

      return res.status(response.status).json({
        error: 'TTS API error',
        details: errorDetails,
        status: response.status
      });
    }

    const data = await response.json();

    // Return the base64-encoded audio
    return res.status(200).json({
      audioContent: data.audioContent, // Base64-encoded MP3
      success: true
    });

  } catch (error) {
    console.error('TTS Proxy error:', error);
    return res.status(500).json({
      error: 'Failed to process TTS request',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}
