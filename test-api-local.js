/**
 * Local test server for API proxy
 * Use this to test the chatbot API locally before deploying to Vercel
 *
 * Usage:
 *   1. Create a .env file with: CHATBOT_API_KEY=your_gemini_api_key
 *   2. Run: node test-api-local.js
 *   3. Update _config.yml to use: api_endpoint: "http://localhost:3000/api/chat"
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file if it exists
try {
  const envFile = readFileSync(join(__dirname, '.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
  console.log('✅ Loaded .env file');
} catch (e) {
  console.log('⚠️  No .env file found, using process.env');
}

// Import the API handler
const handlerModule = await import('./api/chat.js');
const handler = handlerModule.default;

const PORT = 3000;

const server = createServer(async (req, res) => {
  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Only handle /api/chat
  if (url.pathname !== '/api/chat') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Parse body for POST requests
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        req.body = JSON.parse(body);
      } catch (e) {
        req.body = {};
      }

      // Create a mock Vercel-style response object
      const mockRes = {
        statusCode: 200,
        headers: {},
        setHeader(key, value) {
          this.headers[key] = value;
          return this;
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          res.writeHead(this.statusCode, {
            'Content-Type': 'application/json',
            ...this.headers
          });
          res.end(JSON.stringify(data));
          return this;
        },
        end(data) {
          res.writeHead(this.statusCode, this.headers);
          res.end(data);
          return this;
        }
      };

      // Call the handler
      try {
        await handler(req, mockRes);
      } catch (error) {
        console.error('Handler error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Internal server error',
          message: error.message
        }));
      }
    });
  } else if (req.method === 'OPTIONS') {
    // Handle CORS preflight
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('============================================================');
  console.log('🚀 Local API Test Server Running');
  console.log('============================================================');
  console.log('');
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`📡 API Endpoint: http://localhost:${PORT}/api/chat`);
  console.log('');
  console.log('📋 Configuration:');
  console.log(`   - API Key: ${process.env.CHATBOT_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   - API Type: gemini`);
  console.log('');
  console.log('🔧 To use with chatbot:');
  console.log('   1. Update _config.yml:');
  console.log('      chatbot:');
  console.log('        api_endpoint: "http://localhost:3000/api/chat"');
  console.log('   2. Restart Jekyll server');
  console.log('   3. Test the chatbot!');
  console.log('');
  console.log('⏹  Press Ctrl+C to stop');
  console.log('============================================================');
  console.log('');

  if (!process.env.CHATBOT_API_KEY) {
    console.log('⚠️  WARNING: CHATBOT_API_KEY not set!');
    console.log('');
    console.log('Please create a .env file with:');
    console.log('CHATBOT_API_KEY=your_gemini_api_key_here');
    console.log('');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error('   Try stopping other services or use a different port.');
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});
