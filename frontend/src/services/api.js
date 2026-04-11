const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

export const api = {
  getAlgorithms: () => request('/api/algorithms'),
  postAlgorithm: (payload) => request('/api/algorithms', { method: 'POST', body: JSON.stringify(payload) }),
  getSessions: () => request('/api/sessions'),
  postSession: (payload) => request('/api/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  getAnalytics: () => request('/api/analytics'),
  postAnalytics: (payload) => request('/api/analytics', { method: 'POST', body: JSON.stringify(payload) }),
};
