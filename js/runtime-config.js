/*
 * Optional backend connection.
 * GitHub Pages works with an empty API_BASE_URL (demo/localStorage mode).
 * To use a separately deployed FastAPI backend, set the full HTTPS API origin,
 * for example: API_BASE_URL: 'https://api.your-domain.example'
 */
window.SMG_CONFIG = Object.freeze({
  API_BASE_URL: ''
});
