require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const axios = require('axios');
const { analyzeSentiment } = require('./sentiment');
const { getFallbackResponse } = require('./responses');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { initDB } = require('./db');

let db;
initDB().then(database => {
  db = database;
  console.log("Database initialized");
}).catch(err => console.error("DB Init error:", err));

// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ✅ Serve frontend from SAME folder
app.use(express.static(__dirname));

// Rate limit
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 60
}));

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.GROK_API_KEY ? 'ai-powered' : 'offline' });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    
    const token = jwt.sign({ id: result.lastID, email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, email });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, email: user.email });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Chat
app.post('/api/chat', authenticateToken, async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }

  const sentiment = analyzeSentiment(message);

  if (process.env.GROK_API_KEY) {
    try {
      const messages = [
        { role: 'system', content: 'You are a compassionate stress management bot. Keep answers concise, empathetic, and offer actionable relaxation or grounding tips. The user may be experiencing stress or anxiety.' },
        ...(history || []),
        { role: 'user', content: message }
      ];

      const grokRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: messages,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const aiMessage = grokRes.data.choices[0].message.content;
      return res.json({
        type: 'ai',
        message: aiMessage,
        sentiment
      });
    } catch (err) {
      console.error('Grok API error:', err.response?.data || err.message);
      const response = getFallbackResponse(message, sentiment);
      return res.json({ ...response, sentiment });
    }
  } else {
    const response = getFallbackResponse(message, sentiment);
    return res.json({ ...response, sentiment });
  }
});

// Serve index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});