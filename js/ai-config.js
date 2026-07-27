/* ===================================================================
   AI CHAT CONFIG
   =================================================================== */
(function(){
  var key = window.STOCKFLOW_AI_KEY || localStorage.getItem('stockflow_ai_key') || '';
  if(!key && window.prompt) {
    var entered = prompt(
      'Enter your Groq API key to enable AI Chat:\n\n' +
      'Get a free key at: https://console.groq.com/keys\n\n' +
      '(This key is stored locally and never sent to any server except Groq.)'
    );
    if(entered && entered.trim()) {
      key = entered.trim();
      localStorage.setItem('stockflow_ai_key', key);
    }
  }
  window.AI_CONFIG = {
    apiKey: key,
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 1024,
    temperature: 0.7,
  };
})();
