/* ===================================================================
   AI CHAT CONFIG — Google Gemini
   - Local/dev:  js/.env.js provides window.STOCKFLOW_AI_KEY -> direct API
   - Deployed:   no client key; calls the Cloudflare Pages Function
                 /api/ai which holds the key server-side (see functions/api/ai.js)
   =================================================================== */
(function(){
  var key = window.STOCKFLOW_AI_KEY || localStorage.getItem('stockflow_ai_key') || '';
  var sb  = window.STOCKFLOW_SUPABASE_CONFIG || {};
  window.AI_CONFIG = {
    apiKey: key,
    provider: 'gemini',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta/models/',
    /* Supabase Edge Function holds the key server-side (see supabase/functions/ai). */
    proxyUrl: sb.url ? sb.url.replace(/\/$/, '') + '/functions/v1/ai' : '/api/ai',
    model: 'gemini-3.5-flash-lite',
    maxTokens: 1024,
    temperature: 0.7,
  };
})();
