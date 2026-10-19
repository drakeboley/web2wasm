/**
 * web2wasm Operation Codes
 * Standardized binary/chromatic identifiers for DOM diff patches and Canvas draw lists.
 */

// DOM Opcodes (1-9)
export const OP_CREATE_ELEMENT = 1;
export const OP_CREATE_TEXT = 2;
export const OP_SET_ATTR = 3;
export const OP_REMOVE_ATTR = 4;
export const OP_SET_TEXT = 5;
export const OP_APPEND_CHILD = 6;
export const OP_REMOVE_CHILD = 7;
export const OP_REPLACE_CHILD = 8;
export const OP_BATCH_END = 9;

// Canvas Opcodes (10-25)
export const OP_CLEAR = 10;
export const OP_DRAW_RECT = 11;
export const OP_DRAW_ROUNDED_RECT = 12;
export const OP_DRAW_TEXT = 13;
export const OP_SET_FILL = 14;
export const OP_SET_STROKE = 15;
export const OP_REGISTER_HIT = 16;
export const OP_DRAW_LINE = 17;
export const OP_FRAME_FLUSH = 18;

export const OPCODE_NAMES = {
  [OP_CREATE_ELEMENT]: 'CREATE_ELEMENT',
  [OP_CREATE_TEXT]: 'CREATE_TEXT',
  [OP_SET_ATTR]: 'SET_ATTR',
  [OP_REMOVE_ATTR]: 'REMOVE_ATTR',
  [OP_SET_TEXT]: 'SET_TEXT',
  [OP_APPEND_CHILD]: 'APPEND_CHILD',
  [OP_REMOVE_CHILD]: 'REMOVE_CHILD',
  [OP_REPLACE_CHILD]: 'REPLACE_CHILD',
  [OP_BATCH_END]: 'BATCH_END',

  [OP_CLEAR]: 'CLEAR',
  [OP_DRAW_RECT]: 'DRAW_RECT',
  [OP_DRAW_ROUNDED_RECT]: 'DRAW_ROUNDED_RECT',
  [OP_DRAW_TEXT]: 'DRAW_TEXT',
  [OP_SET_FILL]: 'SET_FILL',
  [OP_SET_STROKE]: 'SET_STROKE',
  [OP_REGISTER_HIT]: 'REGISTER_HIT',
  [OP_DRAW_LINE]: 'DRAW_LINE',
  [OP_FRAME_FLUSH]: 'FRAME_FLUSH'
};
