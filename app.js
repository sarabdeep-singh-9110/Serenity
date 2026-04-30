// app.js — Stress Management Bot Frontend

const API_BASE = '/api';
const STORAGE_KEY = 'serenity_chat_history'; // deprecated
const SESSIONS_KEY = 'serenity_sessions';
const MAX_SESSIONS = 50;

// ─── State ──────────────────────────────────────────────────────────────────

const state = {
  sessionId: Date.now().toString(),
  chatHistory: [],   // active session messages
  sessions: [],      // [{ id, date, preview, messages: [] }]
  isSending: false,
  breathTimer: null,
  breathRunning: false,
  breathCycles: 0,
  currentPattern: 'box',
  patterns: {
    box:  [{ label:'Inhale', dur:4 }, { label:'Hold', dur:4 }, { label:'Exhale', dur:4 }, { label:'Hold', dur:4 }],
    '478':  [{ label:'Inhale', dur:4 }, { label:'Hold', dur:7 }, { label:'Exhale', dur:8 }],
    calm: [{ label:'Inhale', dur:4 }, { label:'Exhale', dur:6 }],
  }
};

// ─── DOM refs ────────────────────────────────────────────────────────────────

const el = {
  chatMsgs: document.getElementById('chat-messages'),
  msgInput: document.getElementById('msg-input'),
  sendBtn: document.getElementById('send-btn'),
  charCount: document.getElementById('char-count'),
  clearBtn: document.getElementById('clear-btn'),
  modeBadge: document.getElementById('mode-badge'),
  modeLabel: document.querySelector('.mode-label'),

  breathCircle: document.getElementById('breathe-circle'),
  breathCount: document.getElementById('breathe-count'),
  breathAction: document.getElementById('breathe-action'),
  breathFill: document.getElementById('breathe-fill'),
  breathStatus: document.getElementById('breathe-status'),
  breathStart: document.getElementById('breathe-start'),
  breathReset: document.getElementById('breathe-reset'),
  cycleCount: document.getElementById('cycle-count'),

  exercisesGrid: document.getElementById('exercises-grid'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalContent: document.getElementById('modal-content'),
  modalClose: document.getElementById('modal-close'),
  newChatBtn: document.getElementById('new-chat-btn'),

  loginOverlay: document.getElementById('login-overlay'),
  loginForm: document.getElementById('login-form'),
  authTitle: document.getElementById('auth-title'),
  authSub: document.getElementById('auth-sub'),
  authError: document.getElementById('auth-error'),
  authBtn: document.getElementById('auth-btn'),
  authToggle: document.getElementById('auth-toggle'),
  emailInput: document.getElementById('email'),
  passwordInput: document.getElementById('password'),
  logoutBtn: document.getElementById('logout-btn'),
};

// ─── Navigation ──────────────────────────────────────────────────────────────

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.id === 'new-chat-btn') return;
    const target = btn.dataset.panel;
    document.querySelectorAll('.nav-btn:not(#new-chat-btn)').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${target}`)?.classList.add('active');
  });
});

el.newChatBtn.addEventListener('click', () => {
  state.sessionId = Date.now().toString();
  state.chatHistory = [];
  el.chatMsgs.innerHTML = `
    <div class="msg bot welcome-msg">
      <div class="msg-avatar">S</div>
      <div class="msg-bubble">
        <p>Hi there 🌿 I'm Serenity, your calm companion. Whatever you're carrying right now — stress, anxiety, or just a heavy day — you don't have to face it alone.</p>
        <p style="margin-top:0.5rem; opacity:0.85">Tell me how you're feeling, or choose a quick option above to get started.</p>
      </div>
    </div>`;
  document.querySelector('[data-panel="chat"]')?.click();
});

// ─── Chat ────────────────────────────────────────────────────────────────────

function loadSessions() {
  try {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (saved) {
      state.sessions = JSON.parse(saved);
    } else {
      const oldSaved = localStorage.getItem(STORAGE_KEY);
      if (oldSaved) {
        const oldHistory = JSON.parse(oldSaved);
        if (oldHistory.length > 0) {
          state.sessions.push({
            id: Date.now().toString(),
            date: Date.now(),
            messages: oldHistory,
            preview: 'Migrated Session'
          });
          localStorage.removeItem(STORAGE_KEY);
          saveSessions();
        }
      }
    }
  } catch { state.sessions = []; }
  
  renderSessions();
}

function saveSessions() {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(state.sessions.slice(0, MAX_SESSIONS))); }
  catch {}
}

function saveCurrentSession() {
  if (state.chatHistory.length === 0) return;
  
  let session = state.sessions.find(s => s.id === state.sessionId);
  if (!session) {
    session = { id: state.sessionId, date: Date.now(), messages: [], preview: '' };
    state.sessions.unshift(session);
  }
  session.messages = [...state.chatHistory];
  
  const firstUserMsg = session.messages.find(m => m.role === 'user');
  session.preview = firstUserMsg ? firstUserMsg.content : 'Chat Session';
  
  saveSessions();
  renderSessions();
}

el.clearBtn.addEventListener('click', () => {
  if (!confirm('Clear all chat history and sessions?')) return;
  state.chatHistory = [];
  state.sessions = [];
  state.sessionId = Date.now().toString();
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(STORAGE_KEY);
  el.chatMsgs.innerHTML = `
    <div class="msg bot welcome-msg">
      <div class="msg-avatar">S</div>
      <div class="msg-bubble">
        <p>Chat cleared. I'm still here whenever you need me 🌿</p>
      </div>
    </div>`;
  renderSessions();
});

// Textarea auto-resize + char count
el.msgInput.addEventListener('input', () => {
  el.msgInput.style.height = 'auto';
  el.msgInput.style.height = Math.min(el.msgInput.scrollHeight, 120) + 'px';
  el.charCount.textContent = el.msgInput.value.length;
});

el.msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

el.sendBtn.addEventListener('click', sendMessage);

// Mood chips
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    el.msgInput.value = chip.dataset.msg;
    el.msgInput.dispatchEvent(new Event('input'));
    sendMessage();
  });
});

async function sendMessage() {
  const text = el.msgInput.value.trim();
  if (!text || state.isSending) return;

  el.msgInput.value = '';
  el.msgInput.style.height = 'auto';
  el.charCount.textContent = '0';
  state.isSending = true;
  el.sendBtn.disabled = true;

  renderUserMsg(text);
  state.chatHistory.push({ role: 'user', content: text, timestamp: Date.now() });

  const typingEl = renderTyping();

  try {
    const historyForAPI = state.chatHistory
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content }));

    const token = localStorage.getItem('serenity_token');
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ message: text, history: historyForAPI })
    });

    typingEl.remove();

    if (!res.ok) throw new Error('Server error');

    const data = await res.json();
    renderBotMsg(data, data.sentiment);

    state.chatHistory.push({
      role: 'assistant',
      content: data.message,
      sentiment: data.sentiment,
      responseData: data,
      timestamp: Date.now()
    });
    saveCurrentSession();

  } catch (err) {
    typingEl.remove();
    renderBotMsg({
      type: 'error',
      message: 'I\'m having trouble connecting right now. Please make sure the server is running on port 3001. In the meantime, try the breathing exercises in the sidebar!'
    }, null);
  }

  state.isSending = false;
  el.sendBtn.disabled = false;
  el.msgInput.focus();
}

function renderUserMsg(text) {
  const div = document.createElement('div');
  div.className = 'msg user';
  div.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
  el.chatMsgs.appendChild(div);
  scrollBottom();
}

function renderBotMsg(data, sentiment) {
  const div = document.createElement('div');
  div.className = 'msg bot';

  let bubbleHTML = '';

  if (data.type === 'breathing' || data.type === 'grounding') {
    const steps = data.steps || [];
    const stepsHTML = steps.map((s, i) =>
      `<li class="step-item"><span class="step-num">${i+1}</span>${escapeHtml(s)}</li>`
    ).join('');
    bubbleHTML = `
      <p><strong>${escapeHtml(data.title || '')}</strong></p>
      <p>${escapeHtml(data.message || '')}</p>
      ${stepsHTML ? `<ul class="step-list">${stepsHTML}</ul>` : ''}
    `;
  } else if (data.type === 'menu') {
    const optsHTML = (data.options || []).map(o =>
      `<button class="option-btn" data-msg="${escapeHtml(o.value)}">${escapeHtml(o.label)}</button>`
    ).join('');
    bubbleHTML = `
      <p>${escapeHtml(data.message || '')}</p>
      <div class="option-btns">${optsHTML}</div>
    `;
  } else if (data.type === 'support' || data.type === 'positive' || data.type === 'neutral' || data.type === 'ai' || data.type === 'text' || data.type === 'error') {
    bubbleHTML = `<p>${formatMessage(data.message || '')}</p>`;
    if (data.followUp) bubbleHTML += `<p class="follow-up">${escapeHtml(data.followUp)}</p>`;
  } else {
    bubbleHTML = `<p>${formatMessage(data.message || JSON.stringify(data))}</p>`;
  }

  // Sentiment pill
  if (sentiment && sentiment.sentiment) {
    const label = { negative: '💙 Stress detected', positive: '🌿 Feeling good', neutral: '🌀 Neutral' }[sentiment.sentiment] || '';
    bubbleHTML += `<div class="sentiment-pill ${sentiment.sentiment}">${label}</div>`;
  }

  div.innerHTML = `
    <div class="msg-avatar">S</div>
    <div class="msg-bubble">${bubbleHTML}</div>
  `;

  el.chatMsgs.appendChild(div);

  // Wire option buttons
  div.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.msgInput.value = btn.dataset.msg;
      sendMessage();
    });
  });

  scrollBottom();
}

function renderTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.innerHTML = `
    <div class="msg-avatar">S</div>
    <div class="msg-bubble">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  el.chatMsgs.appendChild(div);
  scrollBottom();
  return div;
}



function scrollBottom() {
  el.chatMsgs.scrollTop = el.chatMsgs.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMessage(str) {
  // Bold **text** and convert newlines
  return escapeHtml(str)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function renderSessions() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  if (state.sessions.length === 0) {
    historyList.innerHTML = '<div style="opacity: 0.7; padding: 1rem;">No past sessions yet.</div>';
    return;
  }
  
  historyList.innerHTML = state.sessions.map(s => `
    <div class="history-item" data-id="${escapeHtml(s.id)}">
      <div class="history-content">
        <div class="history-date">${new Date(s.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
        <div class="history-preview">${escapeHtml(s.preview)}</div>
      </div>
      <button class="delete-chat-btn" data-id="${escapeHtml(s.id)}" title="Delete Chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
      </button>
    </div>
  `).join('');
  
  historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.delete-chat-btn')) return;
      const sess = state.sessions.find(s => s.id === item.dataset.id);
      if (sess) loadSessionIntoChat(sess);
    });
  });

  historyList.querySelectorAll('.delete-chat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('Delete this chat session?')) return;
      const id = btn.dataset.id;
      state.sessions = state.sessions.filter(s => s.id !== id);
      saveSessions();
      renderSessions();
      if (state.sessionId === id) {
        if (el.newChatBtn) el.newChatBtn.click();
      }
    });
  });
}

function loadSessionIntoChat(session) {
  state.sessionId = session.id;
  state.chatHistory = [...session.messages];
  
  el.chatMsgs.innerHTML = '';
  state.chatHistory.forEach(msg => {
    if (msg.role === 'user') renderUserMsg(msg.content);
    else renderBotMsg(msg.responseData || { message: msg.content, type: 'text' }, msg.sentiment);
  });
  
  document.querySelector('[data-panel="chat"]')?.click();
}

// ─── Breathing ───────────────────────────────────────────────────────────────

document.querySelectorAll('.pattern-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentPattern = btn.dataset.pattern;
    if (state.breathRunning) stopBreath();
    resetBreath();
  });
});

el.breathStart.addEventListener('click', () => {
  if (state.breathRunning) stopBreath();
  else startBreath();
});

el.breathReset.addEventListener('click', () => {
  stopBreath();
  state.breathCycles = 0;
  el.cycleCount.textContent = '0';
  resetBreath();
});

function resetBreath() {
  const phases = state.patterns[state.currentPattern];
  el.breathCount.textContent = phases[0].dur;
  el.breathAction.textContent = phases[0].label;
  el.breathFill.style.width = '0%';
  el.breathCircle.className = 'breathe-circle';
  el.breathStatus.textContent = 'Choose a pattern and press Start';
  el.breathStart.textContent = 'Start';
}

function startBreath() {
  state.breathRunning = true;
  el.breathStart.textContent = 'Stop';
  runPhase(0, 0);
}

function stopBreath() {
  state.breathRunning = false;
  clearTimeout(state.breathTimer);
  el.breathStart.textContent = 'Start';
  el.breathCircle.className = 'breathe-circle';
  el.breathFill.style.width = '0%';
  el.breathStatus.textContent = 'Paused — press Start to continue';
}

function runPhase(phaseIdx, cyclePhaseCount) {
  if (!state.breathRunning) return;
  const phases = state.patterns[state.currentPattern];
  const phase = phases[phaseIdx % phases.length];
  const isNewCycle = phaseIdx > 0 && phaseIdx % phases.length === 0;
  if (isNewCycle) {
    state.breathCycles++;
    el.cycleCount.textContent = state.breathCycles;
  }

  el.breathAction.textContent = phase.label;
  el.breathStatus.textContent = phaseIdx === 0 ? 'Breathe along with the circle...' : `Keep going — you\'re doing well`;

  // Circle animation class
  el.breathCircle.className = 'breathe-circle';
  requestAnimationFrame(() => {
    const cls = phase.label === 'Inhale' ? 'expanding' : phase.label === 'Hold' ? 'holding' : 'contracting';
    el.breathCircle.classList.add(cls);
  });

  runCountdown(phase.dur, phase.dur, phaseIdx, phases);
}

function runCountdown(remaining, total, phaseIdx, phases) {
  if (!state.breathRunning) return;
  el.breathCount.textContent = remaining;
  el.breathFill.style.width = ((total - remaining) / total * 100) + '%';

  if (remaining > 0) {
    state.breathTimer = setTimeout(() => runCountdown(remaining - 1, total, phaseIdx, phases), 1000);
  } else {
    state.breathTimer = setTimeout(() => runPhase(phaseIdx + 1), 300);
  }
}

// ─── Exercises ───────────────────────────────────────────────────────────────

const EXERCISES = [
  {
    icon: '🌿',
    title: '5-4-3-2-1 Grounding',
    desc: 'Anchor yourself using all five senses to quickly return to the present moment.',
    tag: 'Grounding · 3 min',
    steps: [
      'Find a comfortable position and soften your gaze.',
      'Notice 5 things you can see around you right now.',
      'Feel 4 things you can physically touch — your chair, your hands, the floor.',
      'Listen for 3 sounds in your environment — near or far.',
      'Find 2 things you can smell, or imagine a calming scent.',
      'Notice 1 thing you can taste.',
      'Take one slow breath. You\'re here. You\'re grounded. You\'re okay.'
    ]
  },
  {
    icon: '🧘',
    title: 'Body Scan',
    desc: 'Release stored tension from head to toe with a gentle, mindful body scan.',
    tag: 'Relaxation · 5 min',
    steps: [
      'Sit or lie comfortably. Close your eyes.',
      'Take three slow, deep breaths to settle in.',
      'Begin at the crown of your head — notice any tension, then let it soften.',
      'Move to your forehead, jaw, and neck — release any tightness.',
      'Relax your shoulders. Let them drop away from your ears.',
      'Continue through your chest, belly, arms, and hands — releasing with each exhale.',
      'Finish at your feet. Take one final deep breath. Well done.'
    ]
  },
  {
    icon: '🌄',
    title: 'Safe Place Visualization',
    desc: 'Create a vivid mental sanctuary to retreat to whenever you feel overwhelmed.',
    tag: 'Visualization · 5 min',
    steps: [
      'Close your eyes and take three slow, deep breaths.',
      'Imagine a place where you feel completely safe and calm — a beach, forest, room.',
      'What does the light look like? Warm sun, soft glow, gentle shade?',
      'What sounds do you hear? Waves, birds, silence, rain?',
      'What does the air feel like? Cool and fresh, or warm and soft?',
      'Rest here for as long as you like. This place is always available to you.',
      'When ready, take a deep breath and gently return. You are safe.'
    ]
  },
  {
    icon: '📓',
    title: 'Thought Journaling',
    desc: 'Reframe anxious thoughts by examining them with curiosity rather than judgment.',
    tag: 'Cognitive · Open-ended',
    steps: [
      'Write down the thought that\'s causing stress, exactly as it feels.',
      'Ask: "Is this thought definitely true? What\'s the evidence?"',
      'Ask: "What\'s the worst realistic outcome — and could I cope with it?"',
      'Consider: "What would I tell a close friend with this same thought?"',
      'Write a more balanced version — not forced positivity, just fair perspective.',
      'Notice how you feel. Even slightly lighter is progress.',
      'Return to this whenever intrusive thoughts arise. You\'re building a skill.'
    ]
  },
  {
    icon: '🎯',
    title: 'Mindful Observation',
    desc: 'Choose one object and observe it with complete, curious attention for two minutes.',
    tag: 'Mindfulness · 2 min',
    steps: [
      'Choose any object near you — a cup, plant, pen, or your hand.',
      'Look at it as if seeing it for the very first time.',
      'Notice its color, texture, shape, shadows, edges.',
      'Does it have a smell or temperature? What does it feel like?',
      'If your mind wanders, gently bring it back to the object.',
      'After two minutes, notice how present and clear you feel.'
    ]
  },
  {
    icon: '💙',
    title: 'Loving-Kindness',
    desc: 'Cultivate warmth and compassion toward yourself and others with this classic practice.',
    tag: 'Compassion · 5 min',
    steps: [
      'Sit quietly and close your eyes.',
      'Think of yourself. Say silently: "May I be happy. May I be healthy. May I be at peace."',
      'Feel genuine warmth toward yourself — as you would a dear friend.',
      'Bring to mind someone you love. Extend the same wishes to them.',
      'Bring to mind someone neutral — a neighbor, a stranger. Extend the wishes.',
      'Finally, extend to all beings everywhere: "May all beings be happy and at peace."',
      'Rest in this warmth for a moment. You\'ve just made the world a little kinder.'
    ]
  }
];

function renderExercises() {
  el.exercisesGrid.innerHTML = EXERCISES.map((ex, i) => `
    <div class="ex-card" data-idx="${i}">
      <div class="ex-icon">${ex.icon}</div>
      <div class="ex-title">${ex.title}</div>
      <div class="ex-desc">${ex.desc}</div>
      <div class="ex-tag">${ex.tag}</div>
    </div>
  `).join('');

  el.exercisesGrid.querySelectorAll('.ex-card').forEach(card => {
    card.addEventListener('click', () => openExerciseModal(EXERCISES[+card.dataset.idx]));
  });
}

function openExerciseModal(ex) {
  const stepsHTML = ex.steps.map((s, i) => `
    <div class="modal-step">
      <div class="modal-step-num">${i + 1}</div>
      <div class="modal-step-text">${escapeHtml(s)}</div>
    </div>
  `).join('');

  el.modalContent.innerHTML = `
    <div style="font-size:36px;margin-bottom:12px">${ex.icon}</div>
    <h2>${ex.title}</h2>
    <p class="modal-desc">${ex.desc}</p>
    <div class="modal-steps">${stepsHTML}</div>
  `;

  el.modalOverlay.classList.add('open');
}

el.modalClose.addEventListener('click', () => el.modalOverlay.classList.remove('open'));
el.modalOverlay.addEventListener('click', e => {
  if (e.target === el.modalOverlay) el.modalOverlay.classList.remove('open');
});

// ─── Health Check ─────────────────────────────────────────────────────────────

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (data.mode === 'ai-powered') {
      el.modeBadge.classList.add('online');
      el.modeLabel.textContent = 'AI On';
    } else {
      el.modeLabel.textContent = 'Offline';
    }
  } catch {
    el.modeLabel.textContent = 'Server?';
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

function init() {
  loadSessions();
  renderExercises();
  checkHealth();

  const token = localStorage.getItem('serenity_token');
  if (token) {
    el.loginOverlay.classList.remove('open');
    el.loginOverlay.style.display = 'none';
  }

  let isLoginMode = true;

  if (el.authToggle) {
    el.authToggle.addEventListener('click', () => {
      isLoginMode = !isLoginMode;
      el.authTitle.textContent = isLoginMode ? 'Welcome Back' : 'Create Account';
      el.authSub.textContent = isLoginMode ? 'Please sign in to continue your journey.' : 'Begin your journey to mindfulness.';
      el.authBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
      el.authToggle.textContent = isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Sign in';
      el.authError.style.display = 'none';
    });
  }

  if (el.loginForm) {
    el.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      el.authError.style.display = 'none';
      el.authBtn.disabled = true;
      const prevText = el.authBtn.textContent;
      el.authBtn.textContent = 'Loading...';

      const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
      
      try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: el.emailInput.value, password: el.passwordInput.value })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Authentication failed');

        // Save token
        localStorage.setItem('serenity_token', data.token);

        // Hide overlay
        el.loginOverlay.style.opacity = '0';
        setTimeout(() => {
          el.loginOverlay.classList.remove('open');
          el.loginOverlay.style.display = 'none';
        }, 400);

      } catch (err) {
        el.authError.textContent = err.message;
        el.authError.style.display = 'block';
      } finally {
        el.authBtn.disabled = false;
        el.authBtn.textContent = prevText;
      }
    });
  }

  if (el.logoutBtn) {
    el.logoutBtn.addEventListener('click', () => {
      console.log('Logout clicked');
      localStorage.removeItem('serenity_token');
      el.loginOverlay.style.display = 'flex';
      setTimeout(() => {
        el.loginOverlay.classList.add('open');
        el.loginOverlay.style.opacity = '1';
      }, 10);
    });
  }
}

init();
