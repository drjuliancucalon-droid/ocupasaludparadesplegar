// src/lib/apiClient.js — Central API client
// All backend communication goes through here.
// During transition: falls back to direct Supabase calls.
// After backend is ready: all requests go to /api/*

const API_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
  }

  _getHeaders() {
    const headers = { 'Content-Type': 'application/json' };

    // Get token from zustand persisted state
    try {
      const stored = JSON.parse(localStorage.getItem('siso-auth') || '{}');
      const token = stored?.state?.token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      // silently fail
    }

    return headers;
  }

  async _fetch(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this._getHeaders(),
        ...options.headers,
      },
    });

    // Handle 401 — token expired (only attempt refresh if we have a token)
    if (response.status === 401) {
      const stored = JSON.parse(localStorage.getItem('siso-auth') || '{}');
      const hasToken = !!stored?.state?.token;
      if (hasToken) {
        const refreshed = await this._tryRefresh();
        if (refreshed) return this._fetch(path, options);
      }
      // Don't force logout on 401 — just throw error for the hook to handle
      throw new Error(`Error 401: ${response.statusText}`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async _tryRefresh() {
    try {
      const stored = JSON.parse(localStorage.getItem('siso-auth') || '{}');
      const refreshToken = stored?.state?.refreshToken;
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const { token, refreshToken: newRefreshToken } = await response.json();

      // Update stored tokens
      const current = JSON.parse(localStorage.getItem('siso-auth') || '{}');
      if (current.state) {
        current.state.token = token;
        current.state.refreshToken = newRefreshToken;
        localStorage.setItem('siso-auth', JSON.stringify(current));
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  // ── HTTP methods ─────────────────────────────
  get(path) {
    return this._fetch(path, { method: 'GET' });
  }

  post(path, data) {
    return this._fetch(path, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(path, data) {
    return this._fetch(path, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(path) {
    return this._fetch(path, { method: 'DELETE' });
  }

  // ── File upload ──────────────────────────────
  async upload(path, file) {
    const headers = this._getHeaders();
    delete headers['Content-Type']; // Let browser set multipart boundary

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al subir archivo');
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
