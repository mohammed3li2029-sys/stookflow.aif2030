/* ===================================================================
   AI TOOLS — Data fetchers the AI assistant can call
   Reads directly from Supabase via StockFlowBackend
   =================================================================== */
window.AI_TOOLS = {

  /* ── Inventory ─────────────────────────────────── */
  async getInventorySummary() {
    const items = await window.StockFlowBackend.loadCollection('inventory') || [];
    const totalItems = items.length;
    const totalStock = items.reduce((s, i) => s + (i.stock || 0), 0);
    const lowStock = items.filter(i => i.stock <= i.min);
    const categories = [...new Set(items.map(i => i.cat || i.catAr))];
    return {
      totalItems,
      totalStock,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.map(i => ({
        name: lang === 'ar' ? i.nameAr : i.name,
        sku: i.sku,
        stock: i.stock,
        min: i.min,
        location: i.loc,
      })),
      categories,
    };
  },

  async searchInventory(query) {
    const items = await window.StockFlowBackend.loadCollection('inventory') || [];
    const q = (query || '').toLowerCase();
    const results = items.filter(i => {
      const hay = ((i.name || '') + (i.nameAr || '') + (i.sku || '') + (i.cat || '') + (i.catAr || '')).toLowerCase();
      return hay.includes(q);
    });
    return results.map(i => ({
      name: lang === 'ar' ? i.nameAr : i.name,
      sku: i.sku,
      stock: i.stock,
      min: i.min,
      category: lang === 'ar' ? i.catAr : i.cat,
      location: i.loc,
      status: i.stock <= i.min ? 'low' : 'ok',
    }));
  },

  /* ── Warehouses ────────────────────────────────── */
  async getWarehouseSummary() {
    const whs = await window.StockFlowBackend.loadCollection('warehouses') || [];
    return whs.map(w => ({
      name: lang === 'ar' ? w.nameAr : w.name,
      occupancy: w.occ + '%',
      items: w.items,
      sections: w.sections,
      status: w.occ >= 90 ? 'critical' : w.occ >= 70 ? 'high' : 'normal',
    }));
  },

  /* ── Tasks ─────────────────────────────────────── */
  async getTaskStats() {
    const tasks = await window.StockFlowBackend.loadCollection('tasks') || [];
    const today = new Date().toISOString().slice(0, 10);
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'inProgress').length;
    const overdue = tasks.filter(t =>
      t.dueDate && t.dueDate < today && t.status !== 'completed' && t.status !== 'cancelled'
    ).length;
    const urgent = tasks.filter(t =>
      t.priority === 'urgent' && t.status !== 'completed' && t.status !== 'cancelled'
    ).length;
    return { total, completed, inProgress, overdue, urgent, completionRate: total ? Math.round((completed / total) * 100) + '%' : '0%' };
  },

  async getTodayTasks() {
    const tasks = await window.StockFlowBackend.loadCollection('tasks') || [];
    const today = new Date().toISOString().slice(0, 10);
    return tasks
      .filter(t => t.dueDate === today || (t.status === 'inProgress' && !t.dueDate))
      .map(t => ({
        id: t.id,
        title: lang === 'ar' ? t.titleAr : t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee || 'Unassigned',
        project: t.project || null,
      }));
  },

  async searchTasks(query) {
    const tasks = await window.StockFlowBackend.loadCollection('tasks') || [];
    const q = (query || '').toLowerCase();
    return tasks
      .filter(t => {
        const hay = ((t.title || '') + (t.titleAr || '') + (t.desc || '') + (t.descAr || '') + (t.assignee || '') + (t.id || '')).toLowerCase();
        return hay.includes(q);
      })
      .map(t => ({
        id: t.id,
        title: lang === 'ar' ? t.titleAr : t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee || 'Unassigned',
        dueDate: t.dueDate || null,
      }));
  },

  /* ── Sales / Quotations ────────────────────────── */
  async getSalesSummary() {
    const quotes = await window.StockFlowBackend.loadCollection('quotations') || [];
    const totalQuotes = quotes.length;
    const totalValue = quotes.reduce((s, q) => s + (q.total || 0), 0);
    const byStatus = {};
    quotes.forEach(q => { byStatus[q.status] = (byStatus[q.status] || 0) + 1; });
    return { totalQuotes, totalValue, byStatus };
  },

  async getRecentQuotations(limit) {
    const quotes = await window.StockFlowBackend.loadCollection('quotations') || [];
    return quotes.slice(0, limit || 5).map(q => ({
      id: q.id,
      customer: q.customer,
      date: q.date,
      status: q.status,
      total: q.total,
    }));
  },

  /* ── Purchase Orders ───────────────────────────── */
  async getPurchaseOrderSummary() {
    const pos = await window.StockFlowBackend.loadCollection('purchase_orders') || [];
    const total = pos.length;
    const pending = pos.filter(p => p.status === 'pending').length;
    const approved = pos.filter(p => p.status === 'approved').length;
    const totalValue = pos.reduce((s, p) => s + (p.grandTotal || 0), 0);
    return { total, pending, approved, totalValue };
  },

  async getPendingPurchaseOrders() {
    const pos = await window.StockFlowBackend.loadCollection('purchase_orders') || [];
    return pos
      .filter(p => p.status === 'pending')
      .map(p => ({
        id: p.id,
        supplier: p.supplier,
        date: p.date,
        deliveryDate: p.deliveryDate,
        total: p.grandTotal,
      }));
  },

  /* ── Projects ──────────────────────────────────── */
  async getProjectSummary() {
    const prjs = await window.StockFlowBackend.loadCollection('projects') || [];
    const total = prjs.length;
    const active = prjs.filter(p => p.status === 'active').length;
    const completed = prjs.filter(p => p.status === 'completed').length;
    return {
      total,
      active,
      completed,
      onHold: prjs.filter(p => p.status === 'onHold').length,
      projects: prjs.map(p => ({
        id: p.id,
        name: lang === 'ar' ? p.nameAr : p.name,
        status: p.status,
        progress: p.progress + '%',
        priority: p.priority,
        client: lang === 'ar' ? p.clientAr : p.client,
      })),
    };
  },

  /* ── Suppliers (hardcoded — no Supabase table) ── */
  async getSupplierSummary() {
    const sups = window.suppliers || [];
    return sups.map(s => ({
      name: lang === 'ar' ? s.nameAr : s.name,
      deliveryDays: s.delivery,
      quality: s.quality + '%',
      orders: s.orders,
      status: s.status,
    }));
  },

  /* ── Users ─────────────────────────────────────── */
  async getUsersSummary() {
    const users = await window.StockFlowBackend.loadCollection('users') || [];
    return {
      total: users.length,
      users: users.map(u => ({
        name: u.name,
        role: u.role,
        department: lang === 'ar' ? u.deptAr : u.dept,
      })),
    };
  },

  /* ── Calendar Events (localStorage) ─────────────── */
  async getTodayEvents() {
    const events = window.CAL_EVENTS || [];
    const today = new Date().toISOString().slice(0, 10);
    return events.filter(e => e.date === today).map(e => ({
      name: e.name,
      time: e.time || null,
    }));
  },

  async getUpcomingEvents(days) {
    const events = window.CAL_EVENTS || [];
    const today = new Date();
    const future = new Date(today);
    future.setDate(future.getDate() + (days || 7));
    const todayStr = today.toISOString().slice(0, 10);
    const futureStr = future.toISOString().slice(0, 10);
    return events.filter(e => e.date >= todayStr && e.date <= futureStr).map(e => ({
      name: e.name,
      date: e.date,
      time: e.time || null,
    }));
  },

  /* ── Material Requests ─────────────────────────── */
  async getMaterialRequestSummary() {
    const reqs = await window.StockFlowBackend.loadCollection('material_requests') || [];
    return {
      total: reqs.length,
      pending: reqs.filter(r => r.status === 'pending').length,
      approved: reqs.filter(r => r.status === 'approved').length,
      requests: reqs.map(r => ({
        id: r.id,
        department: lang === 'ar' ? r.deptAr : r.dept,
        item: lang === 'ar' ? r.itemAr : r.item,
        qty: r.qty,
        status: r.status,
        priority: r.priority,
      })),
    };
  },

  /* ── General Stats ─────────────────────────────── */
  async getOverviewStats() {
    const inv = await AI_TOOLS.getInventorySummary();
    const tasks = await AI_TOOLS.getTaskStats();
    const po = await AI_TOOLS.getPurchaseOrderSummary();
    const prj = await AI_TOOLS.getProjectSummary();
    const sales = await AI_TOOLS.getSalesSummary();
    return {
      inventory: { totalItems: inv.totalItems, totalStock: inv.totalStock, lowStock: inv.lowStockCount },
      tasks,
      purchaseOrders: { total: po.total, pending: po.pending },
      projects: { total: prj.total, active: prj.active },
      sales: { totalQuotes: sales.totalQuotes, totalValue: sales.totalValue },
    };
  },
};
