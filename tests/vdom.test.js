import test from 'node:test';
import assert from 'node:assert/strict';
import { h, diff, layoutCanvas, resetNodeIdCounter } from '../src/core/vdom.js';
import {
  OP_CREATE_ELEMENT,
  OP_CREATE_TEXT,
  OP_SET_TEXT,
  OP_CLEAR,
  OP_DRAW_ROUNDED_RECT,
  OP_DRAW_TEXT,
  OP_REGISTER_HIT
} from '../src/core/opcodes.js';

test('vdom: creates virtual node tree', () => {
  resetNodeIdCounter();
  const tree = h('div', { id: 'test' },
    h('h1', null, 'Hello World'),
    h('button', { 'data-action': 'inc' }, 'Click Me')
  );

  assert.equal(tree.type, 'element');
  assert.equal(tree.tag, 'div');
  assert.equal(tree.props.id, 'test');
  assert.equal(tree.children.length, 2);
  assert.equal(tree.children[0].tag, 'h1');
  assert.equal(tree.children[0].children[0].text, 'Hello World');
});

test('vdom diff: generates initial creation patches for null -> tree', () => {
  resetNodeIdCounter();
  const tree = h('div', { key: 'root' },
    h('p', { key: 'para' }, 'Initial text')
  );

  const patches = diff(null, tree);
  assert.ok(patches.length > 0);

  const createDiv = patches.find(p => p.op === OP_CREATE_ELEMENT && p.id === 'root');
  assert.ok(createDiv);
  assert.equal(createDiv.tag, 'div');

  const createText = patches.find(p => p.op === OP_CREATE_TEXT);
  assert.ok(createText);
  assert.equal(createText.text, 'Initial text');
});

test('vdom diff: produces minimal patch on text change', () => {
  resetNodeIdCounter();
  const oldTree = h('div', { key: 'root' },
    h('span', { key: 'label' }, 'Count: 0')
  );

  resetNodeIdCounter();
  const newTree = h('div', { key: 'root' },
    h('span', { key: 'label' }, 'Count: 1')
  );

  const patches = diff(oldTree, newTree);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].op, OP_SET_TEXT);
  assert.equal(patches[0].text, 'Count: 1');
});

test('layoutCanvas: generates 2D canvas draw commands and hit targets', () => {
  resetNodeIdCounter();
  const tree = h('div', { key: 'card', 'data-card': 'true' },
    h('h1', null, 'Secure Terminal'),
    h('button', { 'data-action': 'transfer' }, 'Execute Transfer')
  );

  const commands = layoutCanvas(tree, 640, 480);
  assert.ok(commands.length > 0);

  // Checks background clear
  assert.equal(commands[0].op, OP_CLEAR);

  // Checks text drawing
  const textCmd = commands.find(c => c.op === OP_DRAW_TEXT && c.text === 'Secure Terminal');
  assert.ok(textCmd);

  // Checks button draw and hit target registration
  const btnRect = commands.find(c => c.op === OP_DRAW_ROUNDED_RECT);
  assert.ok(btnRect);

  const hitTarget = commands.find(c => c.op === OP_REGISTER_HIT);
  assert.ok(hitTarget);
  assert.equal(hitTarget.action, 'transfer');
  assert.ok(hitTarget.w > 0);
  assert.ok(hitTarget.h > 0);
});
