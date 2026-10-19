import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { h, diff, layoutCanvas, resetNodeIdCounter } from './core/vdom.js';
import { encodeColorQL } from './codec/colorql-codec.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve public assets and source files for direct ES module loading
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/src', express.static(path.join(__dirname, '..', 'src')));

/**
 * Stateful UI Component Definition
 */
function renderApp(state) {
  return h('div', { key: 'app_root', 'data-card': 'true' },
    h('h1', { key: 'app_title' }, 'web2wasm Enterprise UI'),
    h('p', { key: 'app_meta' }, `Security Sandbox: [ACTIVE] | Mode: [${state.mode.toUpperCase()}]`),
    h('h2', { key: 'app_count', style: { color: '#58a6ff' } }, `Counter Value: ${state.count}`),
    h('button', {
      key: 'btn_inc',
      'data-action': 'increment',
      style: { backgroundColor: '#238636', color: '#ffffff' }
    }, '⚡ Increment Counter'),
    h('button', {
      key: 'btn_rst',
      'data-action': 'reset',
      style: { backgroundColor: '#da3633', color: '#ffffff' }
    }, '↺ Reset Counter'),
    h('p', {
      key: 'app_log',
      style: { color: '#8b949e', fontSize: '13px' }
    }, `Last Event: ${state.lastAction} (at ${state.lastTime})`)
  );
}

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');

  const session = {
    mode: 'dom',
    count: 0,
    lastAction: 'Session Initiated',
    lastTime: new Date().toLocaleTimeString(),
    oldTree: null
  };

  function sendFullSync() {
    resetNodeIdCounter();
    const tree = renderApp(session);
    session.oldTree = tree;

    if (session.mode === 'dom') {
      const patches = diff(null, tree);
      const packet = encodeColorQL(patches, 'dom');
      ws.send(JSON.stringify(packet));
    } else {
      const commands = layoutCanvas(tree, 640, 400);
      const packet = encodeColorQL(commands, 'canvas');
      ws.send(JSON.stringify(packet));
    }
  }

  function handleAction(action) {
    if (action === 'increment') {
      session.count++;
      session.lastAction = 'increment (+1)';
    } else if (action === 'reset') {
      session.count = 0;
      session.lastAction = 'reset (0)';
    } else {
      session.lastAction = action || 'unknown';
    }
    session.lastTime = new Date().toLocaleTimeString();

    resetNodeIdCounter();
    const newTree = renderApp(session);

    if (session.mode === 'dom') {
      const patches = diff(session.oldTree, newTree);
      session.oldTree = newTree;
      if (patches.length > 0) {
        const packet = encodeColorQL(patches, 'dom');
        ws.send(JSON.stringify(packet));
      }
    } else {
      session.oldTree = newTree;
      const commands = layoutCanvas(newTree, 640, 400);
      const packet = encodeColorQL(commands, 'canvas');
      ws.send(JSON.stringify(packet));
    }
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'init_session') {
        session.mode = msg.mode || 'dom';
        sendFullSync();
      } else if (msg.type === 'switch_mode') {
        session.mode = msg.mode;
        sendFullSync();
      } else if (msg.type === 'client_event') {
        const action = msg.event?.action || msg.event?.id;
        handleAction(action);
      }
    } catch (err) {
      console.error('[WS] Error handling message:', err);
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 web2wasm server running on http://localhost:${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});