/* ===================================================================
   AI CHAT CONFIG
   =================================================================== */
window.AI_CONFIG = {
  apiKey: window.STOCKFLOW_AI_KEY || '',
  apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
  model: 'llama-3.3-70b-versatile',
  maxTokens: 1024,
  temperature: 0.7,
};
