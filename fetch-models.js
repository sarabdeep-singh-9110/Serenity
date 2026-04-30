const axios = require('axios');
require('dotenv').config();

axios.get('https://api.groq.com/openai/v1/models', {
  headers: { 'Authorization': `Bearer ${process.env.GROK_API_KEY}` }
}).then(res => console.log(JSON.stringify(res.data, null, 2))).catch(err => console.error(err.response?.data || err.message));
