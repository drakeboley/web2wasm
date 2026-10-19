import test from 'node:test';
import assert from 'node:assert/strict';
import { h, diff, layoutCanvas, resetNodeIdCounter } from '../src/core/vdom.js';
import { encodeColorQL, decodeColorQL } from '../src/codec/colorql-codec.js';
import { CanvasRenderer } from '../src/client/canvas-renderer.js';
import { DOMRenderer } from '../src/client/dom-renderer.js';

test('engine integration: full roundtrip state mutation to diff patch and ColorQL packet', () => {
  // 1. Initial State
  let count = 0;
  function getTree() {
    resetNodeIdCounter();
    return h('div', { key: 'app' },
      h('h1', { key: 'title' }, 'Counter Demo'),
      h('button', { key: 'btn', 'data-action': 'inc' }, `Count: ${count}`)
    );
  }

  const initialTree = getTree();
  const initPatches = diff(null, initialTree);
  const initPacket = encodeColorQL(initPatches, 'dom');
  assert.equal(initPacket.mode, 'dom');

  // 2. State Mutation
  count = 1;
  const nextTree = getTree();
  const diffPatches = diff(initialTree, nextTree);
  assert.ok(diffPatches.length > 0);

  const diffPacket = encodeColorQL(diffPatches, 'dom');
  assert.ok(diffPacket.colors.length > 0);

  // 3. Client Decode
  const clientOperations = decodeColorQL(diffPacket);
  assert.deepEqual(clientOperations, diffPatches);
});

test('engine integration: canvas renderer simulates hit-testing and draw execution', () => {
  const drawCalls = [];
  const eventCalls = [];

  // Mock Canvas & 2D Context
  const mockCtx = {
    clearRect: () => {},
    fillRect: (x, y, w, h) => drawCalls.push({ type: 'fillRect', x, y, w, h }),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    closePath: () => {},
    fill: () => drawCalls.push({ type: 'fill' }),
    stroke: () => drawCalls.push({ type: 'stroke' }),
    fillText: (text, x, y) => drawCalls.push({ type: 'fillText', text, x, y })
  };

  const listeners = {};
  const mockCanvas = {
    getContext: () => mockCtx,
    addEventListener: (ev, handler) => { listeners[ev] = handler; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 640, height: 400 }),
    width: 640,
    height: 400,
    style: {}
  };

  const renderer = new CanvasRenderer(mockCanvas, (evt) => eventCalls.push(evt));

  // Build tree and layout commands
  resetNodeIdCounter();
  const tree = h('div', { key: 'app' },
    h('button', { key: 'btn_action', 'data-action': 'run_transfer' }, 'Execute')
  );
  const commands = layoutCanvas(tree, 640, 400);
  const packet = encodeColorQL(commands, 'canvas');

  // Client decodes and renders
  const decodedCommands = decodeColorQL(packet);
  renderer.renderCommands(decodedCommands);

  assert.ok(drawCalls.length > 0);
  assert.ok(renderer.hitTargets.length > 0);
  assert.equal(renderer.hitTargets[0].action, 'run_transfer');

  // Simulate mouse click on the button coordinates
  const target = renderer.hitTargets[0];
  listeners['click']({
    clientX: target.x + 5,
    clientY: target.y + 5
  });

  assert.equal(eventCalls.length, 1);
  assert.equal(eventCalls[0].action, 'run_transfer');
});
