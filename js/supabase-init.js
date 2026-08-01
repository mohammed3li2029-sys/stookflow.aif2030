/* ============================================================================
   StockFlow — Supabase Bootstrap (Auth + Database)
   ============================================================================
   This module:
     - Initializes Supabase only if js/supabase-config.js has been filled in.
     - Exposes a small, safe API on window.StockFlowBackend that the rest
       of the app (js/app.js) uses. If Supabase isn't configured, every
       method degrades gracefully so the app keeps working in demo mode.
     - Provides generic table helpers (loadCollection / syncCollection)
       used to back the Inventory and Warehouses modules with real,
       persistent data (see supabase-schema.sql for the table definitions).
   ============================================================================ */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.STOCKFLOW_SUPABASE_CONFIG || {};
const isConfigured = !!(cfg.url && cfg.anonKey &&
  !String(cfg.url).includes("REPLACE_ME") && !String(cfg.anonKey).includes("REPLACE_ME"));

let supabase = null;

if (isConfigured) {
  try {
    supabase = createClient(cfg.url, cfg.anonKey);
  } catch (err) {
    console.error("[StockFlow] Supabase failed to initialize:", err);
  }
} else {
  console.info("[StockFlow] js/supabase-config.js not found or incomplete — running in demo mode (local sample data only).");
}

const enabled = !!supabase;

/** Sign in with email + password. Rejects if Supabase isn't configured. */
async function signInWithEmail(email, password) {
  if (!supabase) throw new Error("supabase-not-configured");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOutUser() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => sub.subscription.unsubscribe();
}

/** Returns the current session (if the browser already has a valid,
    non-expired Supabase login), or null if there isn't one / not configured. */
async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) { console.error('[StockFlow] getSession failed:', error); return null; }
  return data.session || null;
}

function safeKey(raw) {
  return String(raw).trim();
}

/** Load every row from a table as a plain array of the original item objects. */
async function loadCollection(table) {
  if (!supabase) return null; // null = "not available", caller should keep demo data
  try {
    const { data, error } = await supabase.from(table).select("data");
    if (error) throw error;
    if (!data || !data.length) return null;
    return data.map(row => row.data);
  } catch (err) {
    console.error(`[StockFlow] Failed to load Supabase table "${table}":`, err);
    return null;
  }
}

/**
 * Overwrite a Supabase table with the current contents of `items`.
 * Each item is stored as a JSONB blob keyed by a safe version of its
 * unique field (id/sku/name). Debounced so rapid edits don't spam writes.
 */
const _timers = {};
const _pendingSyncs = {};
async function _doSyncTable(table, items, idField) {
  const rows = items.map((item, i) => ({
    id: safeKey(item[idField] ?? i),
    data: item
  }));
  // Guard against duplicate ids within the same batch (Postgres
  // rejects an upsert where two rows in one command share an id).
  // If a duplicate slips through, keep the last occurrence, which
  // reflects the most recent state of that item.
  const deduped = Array.from(
    rows.reduce((map, row) => map.set(row.id, row), new Map()).values()
  );
  const ids = deduped.map(r => r.id);
  // Upsert current rows, then remove any rows no longer present.
  // Kept in separate try/catch blocks so a failure in one step (e.g. a
  // statement timeout while pruning) can never discard the data that the
  // other step already wrote to the database.
  try {
    const { error: upsertErr } = await supabase.from(table).upsert(deduped);
    if (upsertErr) throw upsertErr;
  } catch (err) {
    console.error(`[StockFlow] Failed to upsert Supabase table "${table}":`, err);
  }
  try {
    let query = supabase.from(table).delete();
    if (ids.length) {
      query = query.not("id", "in", `(${ids.map(id => `"${id}"`).join(",")})`);
    } else {
      // Empty collection: prune everything (a NOT IN () would be invalid SQL).
      query = query.neq("id", "___stockflow_prune_all___");
    }
    const { error: deleteErr } = await query;
    if (deleteErr) throw deleteErr;
  } catch (err) {
    console.error(`[StockFlow] Failed to prune Supabase table "${table}":`, err);
  }
}
function syncCollection(table, items, idField) {
  if (!supabase) return; // demo mode: nothing to sync
  clearTimeout(_timers[table]);
  _pendingSyncs[table] = () => _doSyncTable(table, items, idField);
  _timers[table] = setTimeout(() => {
    delete _timers[table];
    const run = _pendingSyncs[table];
    delete _pendingSyncs[table];
    if (run) run();
  }, 500);
}

/**
 * Single-row upsert (no pruning of other rows). Used for per-item edits
 * (e.g. one project's phases) where rewriting the whole collection on
 * every keystroke is wasteful and — on a busy/free-tier Supabase — can
 * blow past the server's statement timeout (57014). A transient timeout
 * is retried once after a short delay; the localStorage safety net in
 * app.js covers the worst case regardless.
 */
async function _doSyncOne(table, row) {
  try {
    const { error } = await supabase.from(table).upsert(row);
    if (error) throw error;
  } catch (err) {
    console.error(`[StockFlow] Failed to write one row to Supabase table "${table}":`, err);
    setTimeout(async () => {
      try {
        const { error } = await supabase.from(table).upsert(row);
        if (error) throw error;
      } catch (err2) {
        console.error(`[StockFlow] Retry failed for Supabase table "${table}":`, err2);
      }
    }, 2500);
  }
}
function syncRow(table, item, idField) {
  if (!supabase) return; // demo mode: nothing to sync
  clearTimeout(_timers[table]);
  const id = safeKey(item && item[idField] !== undefined ? item[idField] : '');
  if (!id) return; // nothing identifiable to write
  const row = { id, data: item };
  _pendingSyncs[table] = () => _doSyncOne(table, row);
  _timers[table] = setTimeout(() => {
    delete _timers[table];
    const run = _pendingSyncs[table];
    delete _pendingSyncs[table];
    if (run) run();
  }, 500);
}
/** Run every pending debounced write immediately. Called when the page is
    being hidden/unloaded so a refresh or navigation that happens inside
    the debounce window doesn't silently drop the last edit. */
function flushPendingSyncs() {
  Object.keys(_timers).forEach(table => {
    clearTimeout(_timers[table]);
    delete _timers[table];
    const run = _pendingSyncs[table];
    delete _pendingSyncs[table];
    if (run) { try { run(); } catch (err) { console.error('[StockFlow] Failed to flush sync:', err); } }
  });
}
window.addEventListener('pagehide', flushPendingSyncs);
window.addEventListener('beforeunload', flushPendingSyncs);

/**
 * Subscribe to realtime changes (insert/update/delete) on a table.
 * Calls `onChange` with no arguments whenever anything changes — callers
 * are expected to just re-fetch that table's current state (simpler and
 * safer than trying to patch individual rows from the change payload).
 * Returns an unsubscribe function; safe to call even if not configured
 * (returns a no-op unsubscribe in that case).
 */
function subscribeToTable(table, onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`stockflow-${table}-changes`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => onChange()
    )
    .subscribe();
  return () => { try { supabase.removeChannel(channel); } catch (e) {} };
}

const STORAGE_BUCKET = "stockflow-files";

/**
 * Upload a File (from an <input type="file">) to Supabase Storage under
 * `folder/` (e.g. "inventory", "profile", "quotes", "projects"), using a
 * collision-proof filename. Returns the public URL on success, or null
 * if Supabase isn't configured (caller should fall back to demo/local
 * behavior in that case).
 */
async function uploadFile(folder, file) {
  if (!supabase) return null;
  const safeName = String(file.name || "file").replace(/[^\w.\-]+/g, "_");
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safeName}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) {
    console.error(`[StockFlow] File upload failed (${folder}):`, error);
    throw error;
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Delete a previously-uploaded file by its storage path (not its public URL). */
async function deleteFile(path) {
  if (!supabase || !path) return;
  try {
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  } catch (err) {
    console.error("[StockFlow] File delete failed:", err);
  }
}

/** True if a string looks like base64 image/file data (old format) rather
    than a Storage URL (new format) — used to keep old records displaying
    correctly without forcing a one-time migration. */
function isLegacyDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}

window.StockFlowBackend = {
  enabled,
  signInWithEmail,
  signOutUser,
  onAuthChange,
  getSession,
  loadCollection,
  syncCollection,
  syncRow,
  uploadFile,
  deleteFile,
  isLegacyDataUrl,
  subscribeToTable
};

// Let the rest of the app know the backend is ready to use (or confirmed demo-only).
window.dispatchEvent(new CustomEvent("stockflow-backend-ready", { detail: { enabled } }));
