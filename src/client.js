import { WanderClient } from 'wander-client';

// Connect to the Wander server that already runs on WANDER_PORT.
const wander = new WanderClient(`http://localhost:${WANDER_PORT}`);

// Open a WebSocket back to the Node server.
const ws = new WebSocket(`ws://${location.host}`);

ws.onopen = () => console.log('[WS] Connected to backend');

// Forward any DOM event that bubbles on `document.body`
function forwardEvent(e) {
  // Send only event type & minimal payload
  const payload = { type: e.type, key: e.key };
  ws.send(JSON.stringify(payload));
}

// Register listeners for a few common events.
['click', 'keydown'].forEach((ev) => document.addEventListener(ev, forwardEvent));

// Service worker – registers it and sets up communication.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(() => {
    console.log('[SW] Registered');
  });
}