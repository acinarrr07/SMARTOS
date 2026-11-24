const API_BASE_URL = String(window.SMG_CONFIG?.API_BASE_URL || '').replace(/\/+$/, '');
const API_PREFIX = '/api/v1';

async function request(path, options = {}) {
  if (!API_BASE_URL) throw new Error('Backend API is not configured.');
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers,
    credentials: 'include'
  });
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const detail = typeof payload === 'object' ? (payload.detail || payload.message) : payload;
    throw new Error(typeof detail === 'string' ? detail : `Request failed (${response.status}).`);
  }
  return payload;
}

export const api = Object.freeze({
  enabled: Boolean(API_BASE_URL),
  baseURL: API_BASE_URL,
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
  asset: (path) => /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
});
