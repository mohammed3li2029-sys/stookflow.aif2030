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
function syncCollection(table, items, idField) {
  if (!supabase) return; // demo mode: nothing to sync
  clearTimeout(_timers[table]);
  _timers[table] = setTimeout(async () => {
    try {
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
      const { error: upsertErr } = await supabase.from(table).upsert(deduped);
      if (upsertErr) throw upsertErr;
      const { error: deleteErr } = await supabase
        .from(table)
        .delete()
        .not("id", "in", `(${ids.map(id => `"${id}"`).join(",")})`);
      if (deleteErr) throw deleteErr;
    } catch (err) {
      console.error(`[StockFlow] Failed to sync Supabase table "${table}":`, err);
    }
  }, 500);
}

window.StockFlowBackend = {
  enabled,
  signInWithEmail,
  signOutUser,
  onAuthChange,
  loadCollection,
  syncCollection
};

// Let the rest of the app know the backend is ready to use (or confirmed demo-only).
window.dispatchEvent(new CustomEvent("stockflow-backend-ready", { detail: { enabled } }));
