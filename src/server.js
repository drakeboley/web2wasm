import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const WANDER_PORT = 4000;          // the Wander server you already run

// Serve static bundle and index.html
app.use(express.static(path.join(__dirname, '..', 'public')));

// ------------------------------------------------------------------
// WebSocket – one per browser client.  It receives events from the
// browser and forwards them to the Preact instance.
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('[WS] Browser connected');

  ws.on('message', async (msg) => {
    // Expect a JSON payload {type, ...}
    const evt = JSON.parse(msg);

    // 1. Re‑hydrate the Preact component tree.
    // For simplicity we just log here – replace with your own render logic.
    console.log('[WS] Event from client:', evt);

    // 2. Send an updated HTML string to Wander
    // (here you would call a function that serialises your Preact app).
    const html = await renderPreactToString(evt);   // stub

    // 3. Forward the new markup to Wander via its HTTP API.
    // Wander expects POST /render with {markup: "<html…>"}
    await fetch(`http://localhost:${WANDER_PORT}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markup: html })
    });
  });

  ws.on('close', () => console.log('[WS] Browser disconnected'));
});

// Upgrade HTTP to WS
app.server = app.listen(PORT, () => {
  console.log(`⚡️ Server listening on http://localhost:${PORT}`);
});
app.server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// ------------------------------------------------------------------
// Dummy renderer – replace with your own logic.
async function renderPreactToString(evt) {
  // e.g. import { h } from './preact'; const app = <MyApp />;
  // return await preactRenderToString(app);   // you may need to bundle this
  return `<div>Hello, event type: ${evt.type}</div>`;
}