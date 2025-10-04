const express = require("express");
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve static files from project root (so main.html, main.js etc. are available)
app.use(express.static(path.join(__dirname)));

// Health route
app.get('/', (req, res) => {
  res.send('KisanMitra backend running.');
});

// Proxy route to securely call OpenRouter from the server
app.post('/openrouter-proxy', async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured on server' });
  }

  try {
    // Use global fetch (Node 18+) if available
    const fetchFn = global.fetch || (await import('node-fetch')).default;
    const forwardResp = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        // Allow optional referer/title forwarded from client
        'HTTP-Referer': req.headers['http-referer'] || req.body._referer || '',
        'X-Title': req.headers['x-title'] || req.body._title || ''
      },
      body: JSON.stringify(req.body)
    });

    const text = await forwardResp.text();
    // Forward status and body as-is
    res.status(forwardResp.status).send(text);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message || 'Proxy error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
