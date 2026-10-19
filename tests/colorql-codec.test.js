import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUIPrism,
  encodeColorQL,
  decodeColorQL,
  defaultUIPrism
} from '../src/codec/colorql-codec.js';
import {
  OP_CREATE_ELEMENT,
  OP_SET_TEXT,
  OP_CLEAR,
  OP_DRAW_TEXT,
  OP_REGISTER_HIT
} from '../src/core/opcodes.js';

test('colorql prism: builds deterministic token table', () => {
  const prism = createUIPrism(['custom_action', 'balance_widget']);
  assert.ok(prism.tokenCount > 20);
  assert.ok(prism.tokensToHex['CREATE_ELEMENT']);
  assert.match(prism.tokensToHex['CREATE_ELEMENT'], /^#[0-9A-F]{6}$/i);
  assert.ok(prism.tokensToHex['custom_action']);
  assert.equal(prism.hexToTokens[prism.tokensToHex['custom_action']], 'custom_action');
});

test('colorql encode/decode: lossless round-trip for DOM patches', () => {
  const patches = [
    { op: OP_CREATE_ELEMENT, id: 'btn_1', tag: 'button' },
    { op: OP_SET_TEXT, id: 'btn_1', text: 'Submit Query' }
  ];

  const packet = encodeColorQL(patches, 'dom', defaultUIPrism);
  assert.equal(packet.mode, 'dom');
  assert.equal(packet.version, 'colorql.ui.v1');
  assert.ok(Array.isArray(packet.colors));
  assert.ok(packet.colors.length >= 2);

  const decoded = decodeColorQL(packet, defaultUIPrism);
  assert.deepEqual(decoded, patches);
});

test('colorql encode/decode: lossless round-trip for Canvas commands', () => {
  const commands = [
    { op: OP_CLEAR, color: '#000000' },
    { op: OP_DRAW_TEXT, text: 'Balance: $10,000', x: 20, y: 40, color: '#58a6ff' },
    { op: OP_REGISTER_HIT, id: 'btn_buy', action: 'buy', x: 20, y: 60, w: 100, h: 36 }
  ];

  const packet = encodeColorQL(commands, 'canvas', defaultUIPrism);
  assert.equal(packet.mode, 'canvas');
  assert.ok(packet.colors.length >= 3);

  const decoded = decodeColorQL(packet, defaultUIPrism);
  assert.deepEqual(decoded, commands);
});
