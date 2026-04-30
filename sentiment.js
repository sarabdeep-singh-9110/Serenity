function analyzeSentiment(text) {
  const lower = text.toLowerCase();

  if (lower.includes('anxious') || lower.includes('stress') || lower.includes('overwhelmed')) {
    return { sentiment: 'negative', intensity: 'moderate' };
  }

  if (lower.includes('happy') || lower.includes('good')) {
    return { sentiment: 'positive', intensity: 'low' };
  }

  return { sentiment: 'neutral', intensity: 'low' };
}

module.exports = { analyzeSentiment };