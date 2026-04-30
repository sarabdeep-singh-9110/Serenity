// server.js — Stress Management Bot Backend

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { analyzeSentiment } = require('./sentiment');
const { getFallbackResponse } = require('./responses');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Rate limiting — 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please slow down.' }
});
app.use('/api', limiter);

// ─── Anthropic API Helper ─────────────────────────────────────────────────────

async function callAnthropicAPI(userMessage, sentiment, chatHistory = []) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    return null; // Fall through to offline responses
  }

  const systemPrompt = `You are a warm, calm, and compassionate stress management companion called "Serenity". Your role is to help users manage stress, anxiety, and overwhelming feelings using evidence-based techniques.

Detected user sentiment: ${sentiment.sentiment} (intensity: ${sentiment.intensity})

Your guidelines:
- Keep responses SHORT (2-4 sentences max for conversational replies, longer for guided exercises)
- Tone: calm, gentle, supportive, non-judgmental — like a trusted friend
- Avoid clinical or medical language
- Never diagnose. Never dismiss feelings.
- If the user seems in crisis (mentioning self-harm), gently suggest professional help: "Please consider reaching out to a crisis helpline — in India: iCall at 9152987821"
- For breathing exercises: give step-by-step numbered instructions with counts (e.g., "Inhale for 4... hold for 4...")
- For grounding: give clear sensory-based steps
- Always end responses with something warm and encouraging
- If asked what you can do, mention: breathing exercises, grounding techniques, motivational support, and calm conversation`;

  const messages = [
    ...chatHistory.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('Anthropic API error:', err);
    return null;
  }

  const data = await response.json();
  return data.content?.[0]?.text || null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here'
      ? 'ai-powered'
      : 'offline',
    timestamp: new Date().toISOString()
  });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const trimmed = message.trim().slice(0, 1000);
  if (!trimmed) return res.status(400).json({ error: 'Message cannot be empty.' });

  // Analyze sentiment
  const sentiment = analyzeSentiment(trimmed);

  try {
    // Attempt AI response
    const aiText = await callAnthropicAPI(trimmed, sentiment, history);

    if (aiText) {
      return res.json({
        type: 'ai',
        message: aiText,
        sentiment,
        powered_by: 'anthropic'
      });
    }

    // Fallback to predefined responses
    const fallback = getFallbackResponse(trimmed, sentiment);
    return res.json({
      ...fallback,
      sentiment,
      powered_by: 'offline'
    });

  } catch (error) {
    console.error('Chat error:', error);
    const fallback = getFallbackResponse(trimmed, sentiment);
    return res.json({
      ...fallback,
      sentiment,
      powered_by: 'offline'
    });
  }
});

// Get available exercises
app.get('/api/exercises', (req, res) => {
  const { breathingExercises, groundingTechniques } = require('./responses');
  res.json({ breathing: breathingExercises, grounding: groundingTechniques });
});

// Serve frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const hasKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here';
  console.log(`\n🌿 Stress Management Bot running on http://localhost:${PORT}`);
  console.log(`📡 Mode: ${hasKey ? 'AI-Powered (Anthropic Claude)' : 'Offline (Predefined responses)'}`);
  console.log(`🔗 Open http://localhost:${PORT} in your browser\n`);
});
