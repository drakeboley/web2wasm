self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[SW] Activated');
});

// Optional: forward events from the page to the server via the SW’s own WS.
const ws = new WebSocket(`ws://${location.host}`);
ws.onopen = () => console.log('[SW‑WS] Connected');

self.addEventListener('message', (e) => {
  // e.data should be a stringified JSON event
  ws.send(e.data);
});