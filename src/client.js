import { DOMRenderer } from './client/dom-renderer.js';
import { CanvasRenderer } from './client/canvas-renderer.js';
import { decodeColorQL, defaultUIPrism } from './codec/colorql-codec.js';

export class Web2WasmClient {
  constructor(options = {}) {
    this.domContainer = options.domContainer || document.getElementById('dom-viewport');
    this.canvasElement = options.canvasElement || document.getElementById('canvas-viewport');
    this.wsUrl = options.wsUrl || `ws://${location.host}`;
    this.mode = options.mode || 'dom'; // 'dom' or 'canvas'
    this.onTelemetry = options.onTelemetry || null;

    this.domRenderer = new DOMRenderer(this.domContainer, (evt) => this.handleClientEvent(evt));
    this.canvasRenderer = new CanvasRenderer(this.canvasElement, (evt) => this.handleClientEvent(evt));

    this.ws = null;
    this.stats = {
      packetsReceived: 0,
      bytesReceived: 0,
      colorsProcessed: 0,
      lastLatencyMs: 0
    };
  }

  connect() {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log(`[web2wasm] Connected in mode: ${this.mode}`);
      this.ws.send(JSON.stringify({
        type: 'init_session',
        mode: this.mode
      }));
    };

    this.ws.onmessage = (event) => {
      const receiveTime = Date.now();
      this.stats.bytesReceived += event.data.length;
      this.stats.packetsReceived++;

      try {
        const packet = JSON.parse(event.data);
        if (packet.timestamp) {
          this.stats.lastLatencyMs = receiveTime - packet.timestamp;
        }
        if (packet.colors) {
          this.stats.colorsProcessed += packet.colors.length;
        }

        const operations = decodeColorQL(packet, defaultUIPrism);

        if (packet.mode === 'dom') {
          this.domRenderer.applyPatches(operations);
        } else if (packet.mode === 'canvas') {
          this.canvasRenderer.renderCommands(operations);
        }

        if (this.onTelemetry) {
          this.onTelemetry({
            ...this.stats,
            packetMode: packet.mode,
            colors: packet.colors || [],
            opCount: operations.length
          });
        }
      } catch (err) {
        console.error('[web2wasm] Error processing ColorQL packet:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[web2wasm] WebSocket disconnected. Retrying in 2s...');
      setTimeout(() => this.connect(), 2000);
    };
  }

  setMode(newMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;

    if (newMode === 'dom') {
      this.domContainer.style.display = 'block';
      this.canvasElement.style.display = 'none';
      this.canvasRenderer.reset();
    } else {
      this.domContainer.style.display = 'none';
      this.canvasElement.style.display = 'block';
      this.domRenderer.reset();
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'switch_mode',
        mode: newMode
      }));
    }
  }

  handleClientEvent(event) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'client_event',
        mode: this.mode,
        event
      }));
    }
  }
}