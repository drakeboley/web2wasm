/**
 * ColorQL Codec Bridge for web2wasm
 * Multi-dimensional chromatic serialization and Prism tokenization for UI diffs & draw commands.
 */

import {
  OP_CREATE_ELEMENT,
  OP_CREATE_TEXT,
  OP_SET_ATTR,
  OP_REMOVE_ATTR,
  OP_SET_TEXT,
  OP_APPEND_CHILD,
  OP_REMOVE_CHILD,
  OP_CLEAR,
  OP_DRAW_RECT,
  OP_DRAW_ROUNDED_RECT,
  OP_DRAW_TEXT,
  OP_REGISTER_HIT,
  OP_FRAME_FLUSH,
  OPCODE_NAMES
} from '../core/opcodes.js';

// Standard dictionary of UI vocabulary for ColorQL Prism Tables
export const UI_VOCABULARY = [
  // Opcodes
  ...Object.values(OPCODE_NAMES),

  // Common HTML tags
  'div', 'span', 'button', 'h1', 'h2', 'h3', 'p', 'input', 'a',
  'label', 'section', 'header', 'card', 'main', 'nav',

  // Common Attributes & Properties
  'id', 'class', 'style', 'data-action', 'data-card', 'color',
  'backgroundColor', 'stroke', 'radius', 'font', 'text', 'parentId',
  'key', 'value', 'x', 'y', 'w', 'h', 'action',

  // Standard Events
  'click', 'input', 'keydown', 'mouseenter', 'mouseleave'
];

/**
 * Creates a deterministic Prism table for web2wasm UI operations.
 */
export function createUIPrism(customTokens = []) {
  const allTokens = Array.from(new Set([...UI_VOCABULARY, ...customTokens]));
  const tokensToHex = {};
  const hexToTokens = {};

  allTokens.forEach((token, idx) => {
    // Generate deterministic 24-bit RGB hex color
    const r = (idx * 37) % 256;
    const g = (idx * 79) % 256;
    const b = (idx * 113) % 256;
    const hex = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase();
    tokensToHex[token] = hex;
    hexToTokens[hex] = token;
  });

  return {
    id: 'prism_web2wasm_v1',
    tokensToHex,
    hexToTokens,
    tokenCount: allTokens.length
  };
}

export const defaultUIPrism = createUIPrism();

/**
 * Encodes a list of DOM patches or Canvas draw commands into a ColorQL Chromatic Packet.
 * 
 * @param {Array} operations - List of patches or canvas commands
 * @param {'dom' | 'canvas'} mode - Operating mode
 * @param {Object} [prism] - Optional PrismTable instance
 * @returns {Object} Chromatic Packet
 */
export function encodeColorQL(operations, mode = 'dom', prism = defaultUIPrism) {
  const chromaticColors = [];
  const packedEntries = [];

  for (const op of operations) {
    const opcodeName = OPCODE_NAMES[op.op] || `OP_${op.op}`;
    const opcodeHex = prism.tokensToHex[opcodeName] || '#000000';
    chromaticColors.push(opcodeHex);

    // Pack operation with chromatic tokens for known dictionary keys
    const packed = { op: op.op, _c: opcodeHex };

    for (const [key, val] of Object.entries(op)) {
      if (key === 'op') continue;
      packed[key] = val;

      if (typeof val === 'string' && prism.tokensToHex[val]) {
        chromaticColors.push(prism.tokensToHex[val]);
      }
    }

    packedEntries.push(packed);
  }

  return {
    version: 'colorql.ui.v1',
    mode,
    timestamp: Date.now(),
    colorCount: chromaticColors.length,
    colors: chromaticColors,
    payload: packedEntries
  };
}

/**
 * Decodes a ColorQL Chromatic Packet back into standard executable commands.
 * 
 * @param {Object} packet - ColorQL Chromatic Packet
 * @param {Object} [prism] - Optional PrismTable instance
 * @returns {Array} List of operations
 */
export function decodeColorQL(packet, prism = defaultUIPrism) {
  if (!packet || !Array.isArray(packet.payload)) {
    throw new Error('Invalid ColorQL packet: missing payload');
  }

  return packet.payload.map(entry => {
    const { _c, ...rest } = entry;
    return rest;
  });
}
