# 🌿 Serenity — Stress Management Bot

A full-stack stress management chatbot with guided breathing animations, mindfulness exercises, and AI-powered (or offline) responses. Built with Node.js + Express on the backend and vanilla HTML/CSS/JS on the frontend.

---

## 📁 Project Structure

```
stress-bot/
├── backend/
│   ├── server.js          # Express server + API routes
│   ├── sentiment.js       # Keyword-based sentiment detection
│   ├── responses.js       # Predefined fallback responses
│   ├── .env.example       # Environment variable template
│   └── package.json
│
├── frontend/
│   └── public/
│       ├── index.html     # Main HTML (single-page app)
│       ├── css/
│       │   └── style.css  # All styles (organic nature theme)
│       └── js/
│           └── app.js     # All frontend logic
│
├── package.json           # Root scripts for convenience
└── README.md
```

---

## 🚀 Quick Start

### Step 1 — Install dependencies
```bash
cd stress-bot/backend
npm install
```

### Step 2 — Configure environment
```bash
cp .env.example .env
```

Open `.env` and set:
```
PORT=3001
ANTHROPIC_API_KEY=your_key_here   # Optional — works without it
```

**To get an Anthropic API key:**
1. Go to https://console.anthropic.com
2. Create an account → API Keys → Create Key
3. Paste it into `.env`

> **No API key?** No problem! The bot runs fully offline with predefined mindfulness responses.

### Step 3 — Start the server
```bash
# Production
node server.js

# Development (auto-reload)
npm run dev
```

### Step 4 — Open the app
```
http://localhost:3001
```

---

## ✨ Features

### 💬 Chat Interface
- Real-time messaging with bot responses
- Mood quick-select chips (Anxious, Overwhelmed, Stressed, etc.)
- Chat history saved in `localStorage` — persists across sessions
- Sentiment detection (positive / neutral / negative) with intensity
- Animated typing indicator

### 🌬️ Breathing Exercises
- **Box Breathing** (4-4-4-4) — military-grade stress relief
- **4-7-8 Breathing** — activates the parasympathetic system
- **Calm Breath** (4-6) — gentle everyday relaxation
- Animated expanding/contracting circle
- Live countdown timer + progress bar
- Cycle counter

### 🧘 Mindfulness Library
- 5-4-3-2-1 Grounding
- Body Scan
- Safe Place Visualization
- Thought Journaling
- Mindful Observation
- Loving-Kindness Meditation
- Step-by-step modal for each exercise

### 🤖 AI Integration
- **With API key**: Uses Anthropic Claude for warm, context-aware responses
- **Without API key**: Falls back to curated mindfulness responses
- Sentiment-aware responses (mild / moderate / severe)
- Maintains conversation history (last 12 messages sent to API)

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server status + mode (ai-powered / offline) |
| POST | `/api/chat` | Send a message, receive a response |
| GET | `/api/exercises` | Retrieve all breathing + grounding exercises |

### POST `/api/chat`
**Request:**
```json
{
  "message": "I feel really anxious",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello!" }
  ]
}
```

**Response (AI mode):**
```json
{
  "type": "ai",
  "message": "I hear you — anxiety can feel overwhelming...",
  "sentiment": { "sentiment": "negative", "score": -2, "intensity": "moderate" },
  "powered_by": "anthropic"
}
```

**Response (Offline mode):**
```json
{
  "type": "support",
  "message": "You reached out, and that takes courage...",
  "followUp": "Would you like to try a breathing exercise?",
  "sentiment": { "sentiment": "negative", "score": -1, "intensity": "mild" },
  "powered_by": "offline"
}
```

---

## 🎨 Design Decisions

- **Theme**: Organic nature — sage greens, warm creams, earth tones
- **Fonts**: DM Serif Display (headings) + DM Sans (body)
- **Animations**: CSS-only breathing circle, orb backgrounds, message entry
- **UX**: Sidebar navigation, mood chips, modal exercises, dark-mode ready

---

## 🛡️ Safety Note

This bot is a wellness tool, not a medical device. For severe distress, always encourage professional support.

India crisis line: **iCall — 9152987821**
International: **findahelpline.com**

---

## 🔧 Customization

- **Add breathing patterns**: Edit `state.patterns` in `frontend/public/js/app.js`
- **Add exercises**: Append to the `EXERCISES` array in `app.js`
- **Change AI persona**: Edit the `systemPrompt` in `backend/server.js`
- **Add new fallback responses**: Edit `backend/responses.js`
