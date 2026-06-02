// backend/src/services/supabaseClient.js — Server-side Supabase client
// Uses service role key for full access (NOT the anon key)
import { config } from '../config/env.js';

const { url, serviceKey, anonKey } = config.supabase;

/**
 * Make authenticated request to Supabase REST API.
 * Uses service key when available, falls back to anon key.
 */
async function supabaseRequest(path, options = {}) {
  if (!url) throw new Error('SUPABASE_URL not configured');

  const key = serviceKey || anonKey;
  if (!key) throw new Error('No Supabase key configured');

  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const err = new Error(error.message || `Supabase error: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ── Convenience methods ────────────────────────
export const supabase = {
  /**
   * SELECT from a table
   */
  async select(table, query = '') {
    return supabaseRequest(`/rest/v1/${table}?${query}`);
  },

  /**
   * INSERT into a table (upsert by default)
   */
  async upsert(table, data) {
    return supabaseRequest(`/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(data),
    });
  },

  /**
   * UPDATE rows matching filter
   */
  async update(table, filter, data) {
    return supabaseRequest(`/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE rows matching filter
   */
  async delete(table, filter) {
    return supabaseRequest(`/rest/v1/${table}?${filter}`, {
      method: 'DELETE',
    });
  },

  /**
   * Raw key-value store (siso_store table)
   */
  async getStoreValue(key) {
    const rows = await supabaseRequest(
      `/rest/v1/siso_store?key=eq.${encodeURIComponent(key)}&select=key,value,updated_at`
    );
    return rows?.[0]?.value ?? null;
  },

  async setStoreValue(key, value) {
    return supabaseRequest('/rest/v1/siso_store', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    });
  },
};
