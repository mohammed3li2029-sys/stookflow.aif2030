/* ===================================================================
   AI CHAT — Groq-powered assistant for StockFlow
   =================================================================== */
(function(){
  'use strict';

  const CFG = window.AI_CONFIG;
  const TOOLS = window.AI_TOOLS;
  if(!CFG || !TOOLS) { console.error('[AI] Config or tools not loaded'); return; }

  let chatHistory = [];
  let isOpen = false;
  let isTyping = false;

  /* ── Tool definitions for Groq function calling ── */
  const TOOL_DEFS = [
    { name:'getInventorySummary', description:'Get full inventory summary: total items, total stock, low-stock alerts, categories. Use when user asks about inventory, stock levels, items count.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'searchInventory', description:'Search inventory by name, SKU, or category. Use when user asks about a specific product or item.', parameters:{ type:'object', properties:{ query:{ type:'string', description:'Search query (item name, SKU, or category)' }}, required:['query'] }},
    { name:'getWarehouseSummary', description:'Get all warehouses with occupancy levels. Use when user asks about warehouses or storage capacity.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'getTaskStats', description:'Get task statistics: total, completed, in-progress, overdue, urgent counts. Use when user asks about task overview or productivity.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'getTodayTasks', description:'Get today\'s tasks and tasks currently in progress. Use when user asks about today\'s work or current tasks.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'searchTasks', description:'Search tasks by title, description, or assignee. Use when user asks about a specific task.', parameters:{ type:'object', properties:{ query:{ type:'string', description:'Search query' }}, required:['query'] }},
    { name:'getSalesSummary', description:'Get sales/quotation statistics: total quotes, total value, breakdown by status. Use when user asks about sales, revenue, or quotations.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'getRecentQuotations', description:'Get recent quotations list. Use when user asks to see recent quotes or recent sales.', parameters:{ type:'object', properties:{ limit:{ type:'number', description:'Number of quotes to return (default 5)' }}, required:[] }},
    { name:'getPurchaseOrderSummary', description:'Get purchase order statistics: total, pending, approved, total value. Use when user asks about purchase orders or procurement.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'getPendingPurchaseOrders', description:'Get list of pending purchase orders. Use when user asks about pending POs or what needs to be ordered.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'getProjectSummary', description:'Get all projects with status and progress. Use when user asks about projects.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'getSupplierSummary', description:'Get supplier list with delivery times, quality scores, and status. Use when user asks about suppliers.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'getUsersSummary', description:'Get users list with roles and departments. Use when user asks about team members or users.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'getTodayEvents', description:'Get today\'s calendar events. Use when user asks about today\'s schedule or events.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'getUpcomingEvents', description:'Get upcoming calendar events within N days. Use when user asks about upcoming events or schedule.', parameters:{ type:'object', properties:{ days:{ type:'number', description:'Number of days ahead (default 7)' }}, required:[] }},
    { name:'getMaterialRequestSummary', description:'Get material requests summary. Use when user asks about material requests or requisitions.', parameters:{ type:'object', properties:{}, required:[] }},
    { name:'getOverviewStats', description:'Get full app overview: inventory, tasks, POs, projects, sales in one call. Use for general overview questions.', parameters:{ type:'object', properties:{}, required:[] }},
  ];

  /* ── System prompt ─────────────────────────────── */
  function buildSystemPrompt(){
    const langName = lang === 'ar' ? 'Arabic' : 'English';
    return `You are StockFlow AI, a helpful assistant for the StockFlow warehouse & inventory management application.

IMPORTANT RULES:
- Always respond in the SAME language as the user's message (Arabic if they write in Arabic, English if they write in English).
- You have access to live application data through tools. When the user asks about data (inventory counts, tasks, orders, etc.), call the appropriate tool to get real data.
- Be concise and clear. Use bullet points or short lists when presenting data.
- If the user asks something unrelated to the app, politely redirect them to app-related questions.
- You can help with: inventory management, task tracking, sales/quotations, purchase orders, projects, suppliers, users, calendar events, material requests, and general app navigation.

APP PAGES: Dashboard, Inventory, Warehouses, Sales, Purchasing, Issues/Material Requests, Movements, Reports, Projects, Tasks, Users, Notifications, Settings.

When presenting data, format it nicely with bullet points or short tables. Always use the user's preferred language.`;
  }

  /* ── Execute a tool call ───────────────────────── */
  function executeTool(name, args) {
    const fn = TOOLS[name];
    if(!fn) return { error: 'Tool not found: ' + name };
    try { return fn(args || {}); } catch(e) { return { error: e.message }; }
  }

  /* ── Send message to Groq API ──────────────────── */
  async function sendToAI(userMessage) {
    chatHistory.push({ role:'user', content: userMessage });

    const messages = [
      { role:'system', content: buildSystemPrompt() },
      ...chatHistory.slice(-20),
    ];

    try {
      const response = await fetch(CFG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + CFG.apiKey,
        },
        body: JSON.stringify({
          model: CFG.model,
          messages: messages,
          tools: TOOL_DEFS,
          tool_choice: 'auto',
          max_tokens: CFG.maxTokens,
          temperature: CFG.temperature,
        }),
      });

      if(!response.ok) {
        const err = await response.text();
        throw new Error('API error ' + response.status + ': ' + err);
      }

      const data = await response.json();
      const choice = data.choices && data.choices[0];
      if(!choice) throw new Error('No response from AI');

      const msg = choice.message;

      /* If the AI wants to call tools, execute them and re-send */
      if(msg.tool_calls && msg.tool_calls.length > 0) {
        chatHistory.push({ role:'assistant', content: msg.content || null, tool_calls: msg.tool_calls });

        for(const tc of msg.tool_calls) {
          const fnName = tc.function.name;
          let fnArgs = {};
          try { fnArgs = JSON.parse(tc.function.arguments || '{}'); } catch(e){}
          const result = executeTool(fnName, fnArgs);
          chatHistory.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }

        /* Send again to get the final natural-language response */
        const response2 = await fetch(CFG.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + CFG.apiKey,
          },
          body: JSON.stringify({
            model: CFG.model,
            messages: [
              { role:'system', content: buildSystemPrompt() },
              ...chatHistory.slice(-20),
            ],
            max_tokens: CFG.maxTokens,
            temperature: CFG.temperature,
          }),
        });

        const data2 = await response2.json();
        const choice2 = data2.choices && data2.choices[0];
        const finalContent = choice2?.message?.content || 'No response.';
        chatHistory.push({ role:'assistant', content: finalContent });
        return finalContent;
      }

      /* No tools needed — direct response */
      const content = msg.content || 'No response.';
      chatHistory.push({ role:'assistant', content: content });
      return content;

    } catch(err) {
      console.error('[AI]', err);
      const errMsg = lang === 'ar'
        ? 'عذراً، حدث خطأ في الاتصال. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.'
        : 'Sorry, a connection error occurred. Please check your internet and try again.';
      chatHistory.push({ role:'assistant', content: errMsg });
      return errMsg;
    }
  }

  /* ── DOM Helpers ───────────────────────────────── */
  function el(id){ return document.getElementById(id); }

  function addMessage(text, role) {
    const body = el('aiChatBody');
    if(!body) return;
    const div = document.createElement('div');
    div.className = 'ai-msg ai-' + role;
    /* Simple markdown: bold, line breaks */
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    div.innerHTML = '<div class="ai-msg-bubble">' + html + '</div>';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function showTyping() {
    const body = el('aiChatBody');
    if(!body) return;
    const div = document.createElement('div');
    div.className = 'ai-msg ai-assistant ai-typing-indicator';
    div.id = 'aiTyping';
    div.innerHTML = '<div class="ai-msg-bubble"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span></div>';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function hideTyping() {
    const t = el('aiTyping');
    if(t) t.remove();
  }

  /* ── Send Handler ──────────────────────────────── */
  async function handleSend() {
    const input = el('aiChatInput');
    if(!input) return;
    const text = input.value.trim();
    if(!text || isTyping) return;

    input.value = '';
    addMessage(text, 'user');

    isTyping = true;
    const sendBtn = el('aiChatSend');
    if(sendBtn) sendBtn.disabled = true;
    showTyping();

    const reply = await sendToAI(text);

    hideTyping();
    addMessage(reply, 'assistant');
    isTyping = false;
    if(sendBtn) sendBtn.disabled = false;
  }

  /* ── Quick Actions ─────────────────────────────── */
  const QUICK_ACTIONS_AR = [
    { label:'نظرة عامة', prompt:'اعطني نظرة عامة على النظام' },
    { label:'المخزون', prompt:'كم عنصر عندي في المستودع؟' },
    { label:'مهام اليوم', prompt:'وش مهامي اليوم؟' },
    { label:'المشاريع', prompt:'كم مشروع عندي وش وضعهم؟' },
    { label:'طلبات الشراء', prompt:'كم طلب شراء معلق؟' },
  ];
  const QUICK_ACTIONS_EN = [
    { label:'Overview', prompt:'Give me an overview of the system' },
    { label:'Inventory', prompt:'How many items do I have in inventory?' },
    { label:'Today\'s Tasks', prompt:'What are my tasks today?' },
    { label:'Projects', prompt:'How many projects do I have and their status?' },
    { label:'Purchase Orders', prompt:'How many pending purchase orders?' },
  ];

  function renderQuickActions() {
    const wrap = el('aiQuickActions');
    if(!wrap) return;
    const acts = lang === 'ar' ? QUICK_ACTIONS_AR : QUICK_ACTIONS_EN;
    wrap.innerHTML = acts.map(a =>
      '<button class="ai-quick-btn" data-prompt="' + a.prompt.replace(/"/g, '&quot;') + '">' + a.label + '</button>'
    ).join('');
    wrap.querySelectorAll('.ai-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = el('aiChatInput');
        if(input) { input.value = btn.dataset.prompt; handleSend(); }
      });
    });
  }

  /* ── Toggle Chat ───────────────────────────────── */
  function toggleChat() {
    isOpen = !isOpen;
    const panel = el('aiChatPanel');
    const fab = el('aiChatFab');
    if(panel) panel.classList.toggle('open', isOpen);
    if(fab) fab.classList.toggle('active', isOpen);
    if(isOpen) {
      renderQuickActions();
      const input = el('aiChatInput');
      if(input && chatHistory.length === 0) {
        const welcome = lang === 'ar'
          ? 'مرحباً! أنا مساعد StockFlow الذكي. اسألني أي شي عن التطبيق — المخزون، المهام، المشاريع، الطلبات، وغيرهم.'
          : 'Hello! I\'m the StockFlow AI assistant. Ask me anything about the app — inventory, tasks, projects, orders, and more.';
        addMessage(welcome, 'assistant');
      }
      if(input) setTimeout(() => input.focus(), 200);
    }
  }

  function clearChat() {
    chatHistory = [];
    const body = el('aiChatBody');
    if(body) body.innerHTML = '';
    renderQuickActions();
  }

  /* ── Init ──────────────────────────────────────── */
  function init() {
    const fab = el('aiChatFab');
    const close = el('aiChatClose');
    const send = el('aiChatSend');
    const clear = el('aiChatClear');
    const input = el('aiChatInput');

    if(fab) fab.addEventListener('click', toggleChat);
    if(close) close.addEventListener('click', toggleChat);
    if(send) send.addEventListener('click', handleSend);
    if(clear) clear.addEventListener('click', clearChat);
    if(input) {
      input.addEventListener('keydown', e => {
        if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
      });
    }
  }

  /* Expose for external init */
  window.AIChat = { init, toggleChat };

})();
