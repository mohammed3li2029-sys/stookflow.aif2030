/* ===================================================================
   AI CHAT CONFIG — Google Gemini
   - Local/dev:  js/.env.js provides window.STOCKFLOW_AI_KEY -> direct API
   - Deployed:   no client key; calls the Supabase Edge Function
                 supabase/functions/ai which holds the key server-side.
   =================================================================== */
(function(){
  /* Ignore any stale key left in localStorage by older versions. */
  try { localStorage.removeItem('stockflow_ai_key'); } catch (e) {}

  var key = window.STOCKFLOW_AI_KEY || '';
  var sb  = window.STOCKFLOW_SUPABASE_CONFIG || {};
  window.AI_CONFIG = {
    apiKey: key,
    provider: 'gemini',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta/models/',
    proxyUrl: sb.url ? sb.url.replace(/\/$/, '') + '/functions/v1/ai' : '',
    model: 'gemini-3.5-flash-lite',
    maxTokens: 1024,
    temperature: 0.7,
  };
})();
