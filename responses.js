// responses.js — Improved fallback responses (less repetition)

const breathingExercises = [
  {
    name: 'Box Breathing',
    steps: [
      'Find a comfortable position and gently close your eyes.',
      'Inhale slowly through your nose for 4 counts.',
      'Hold your breath gently for 4 counts.',
      'Exhale smoothly through your mouth for 4 counts.',
      'Hold again for 4 counts.',
      'Repeat this 4–6 times.'
    ],
    duration: '4-4-4-4'
  },
  {
    name: '4-7-8 Breathing',
    steps: [
      'Sit comfortably and relax your shoulders.',
      'Inhale quietly through your nose for 4 counts.',
      'Hold your breath for 7 counts.',
      'Exhale completely through your mouth for 8 counts.',
      'Repeat for 3–4 cycles.'
    ],
    duration: '4-7-8'
  },
  {
    name: 'Calm Breath',
    steps: [
      'Place one hand on your chest, one on your belly.',
      'Breathe in gently for 4 counts.',
      'Exhale slowly for 6 counts.',
      'Continue slowly and naturally.'
    ],
    duration: '4-6'
  }
];

const groundingTechniques = [
  {
    name: '5-4-3-2-1 Grounding',
    steps: [
      'Notice 5 things you can see.',
      'Feel 4 things you can touch.',
      'Listen for 3 sounds.',
      'Find 2 things you can smell.',
      'Notice 1 thing you can taste.'
    ]
  },
  {
    name: 'Body Scan',
    steps: [
      'Close your eyes and take a slow breath.',
      'Relax your forehead, jaw, and neck.',
      'Drop your shoulders.',
      'Relax your chest and arms.',
      'Finish by relaxing your legs and feet.'
    ]
  }
];

const motivationalResponses = [
  "You reached out — that takes strength.",
  "It’s okay to feel this way.",
  "You’ve handled difficult moments before.",
  "You’re doing better than you think.",
  "This feeling is temporary."
];

const positiveResponses = [
  "That’s great to hear.",
  "Glad you’re feeling good.",
  "That sounds like progress.",
  "Keep that positive energy going."
];

const neutralResponses = [
  "I’m here with you. What’s on your mind?",
  "Tell me how you're feeling.",
  "Would you like a breathing or grounding exercise?"
];

// ✅ NEW extra responses (reduce repetition)
const extraResponses = [
  "Take a slow breath. You’re not as stuck as it feels.",
  "Let’s pause — inhale slowly, exhale longer.",
  "You don’t need to solve everything right now.",
  "Focus on just one small step.",
  "Even this feeling will pass.",
  "You’re handling more than you realize.",
  "Slow down. You’re allowed to take a moment."
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getFallbackResponse(text, sentiment) {
  const lower = text.toLowerCase();

  // Breathing
  if (lower.includes('breath') || lower.includes('inhale') || lower.includes('exhale')) {
    const ex = getRandomItem(breathingExercises);
    return {
      type: 'breathing',
      title: ex.name,
      message: `Try this: ${ex.name}`,
      steps: ex.steps,
      duration: ex.duration
    };
  }

  // Grounding
  if (lower.includes('ground') || lower.includes('present')) {
    const tech = getRandomItem(groundingTechniques);
    return {
      type: 'grounding',
      title: tech.name,
      message: `Try this grounding technique:`,
      steps: tech.steps
    };
  }

  // Help / menu
  if (lower.includes('help') || lower.includes('what can')) {
    return {
      type: 'menu',
      message: 'I can help with:',
      options: [
        { label: 'Breathing Exercise', value: 'breathing' },
        { label: 'Grounding Technique', value: 'grounding' },
        { label: 'Support', value: 'support' }
      ]
    };
  }

  // Negative
  if (sentiment.sentiment === 'negative') {
    return {
      type: 'support',
      message: getRandomItem(motivationalResponses.concat(extraResponses))
    };
  }

  // Positive
  if (sentiment.sentiment === 'positive') {
    return {
      type: 'positive',
      message: getRandomItem(positiveResponses)
    };
  }

  // Neutral
  return {
    type: 'neutral',
    message: getRandomItem(neutralResponses.concat(extraResponses))
  };
}

module.exports = {
  getFallbackResponse,
  breathingExercises,
  groundingTechniques
};