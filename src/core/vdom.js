import {
  OP_CREATE_ELEMENT,
  OP_CREATE_TEXT,
  OP_SET_ATTR,
  OP_REMOVE_ATTR,
  OP_SET_TEXT,
  OP_APPEND_CHILD,
  OP_REMOVE_CHILD,
  OP_CLEAR,
  OP_DRAW_ROUNDED_RECT,
  OP_DRAW_TEXT,
  OP_REGISTER_HIT,
  OP_FRAME_FLUSH
} from './opcodes.js';

let nextId = 1;
export function resetNodeIdCounter() {
  nextId = 1;
}

/**
 * Creates a Virtual DOM Node.
 */
export function h(tag, props = {}, ...children) {
  const flattenedChildren = children.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false).map(c => {
    if (typeof c === 'string' || typeof c === 'number') {
      return {
        type: '#text',
        id: props?.key ? `${props.key}_txt` : `node_${nextId++}`,
        text: String(c)
      };
    }
    return c;
  });

  const node = {
    type: 'element',
    id: props?.key || `node_${nextId++}`,
    tag: tag.toLowerCase(),
    props: { ...props },
    children: flattenedChildren
  };

  delete node.props.key;
  return node;
}

/**
 * Computes the minimal diff patch list between two VNode trees.
 */
export function diff(oldTree, newTree, parentId = null) {
  const patches = [];

  if (!oldTree && newTree) {
    // Brand new node
    patches.push(...createTreePatches(newTree, parentId));
    return patches;
  }

  if (oldTree && !newTree) {
    // Removed node
    patches.push({
      op: OP_REMOVE_CHILD,
      parentId,
      id: oldTree.id
    });
    return patches;
  }

  // Node type changed or tag changed -> recreate
  if (oldTree.type !== newTree.type || oldTree.tag !== newTree.tag) {
    patches.push({
      op: OP_REMOVE_CHILD,
      parentId,
      id: oldTree.id
    });
    patches.push(...createTreePatches(newTree, parentId));
    return patches;
  }

  // Text node diff
  if (oldTree.type === '#text' && newTree.type === '#text') {
    if (oldTree.text !== newTree.text) {
      patches.push({
        op: OP_SET_TEXT,
        id: oldTree.id,
        text: newTree.text
      });
    }
    return patches;
  }

  // Attribute diffs
  const oldProps = oldTree.props || {};
  const newProps = newTree.props || {};

  // Find updated or added props
  for (const [key, val] of Object.entries(newProps)) {
    if (oldProps[key] !== val) {
      patches.push({
        op: OP_SET_ATTR,
        id: oldTree.id,
        key,
        value: val
      });
    }
  }

  // Find removed props
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) {
      patches.push({
        op: OP_REMOVE_ATTR,
        id: oldTree.id,
        key
      });
    }
  }

  // Children diff
  const oldChildren = oldTree.children || [];
  const newChildren = newTree.children || [];
  const maxLen = Math.max(oldChildren.length, newChildren.length);

  for (let i = 0; i < maxLen; i++) {
    const oldChild = oldChildren[i];
    const newChild = newChildren[i];
    patches.push(...diff(oldChild, newChild, oldTree.id));
  }

  return patches;
}

function createTreePatches(node, parentId) {
  const patches = [];
  if (node.type === '#text') {
    patches.push({
      op: OP_CREATE_TEXT,
      id: node.id,
      text: node.text,
      parentId
    });
    if (parentId) {
      patches.push({
        op: OP_APPEND_CHILD,
        parentId,
        id: node.id
      });
    }
    return patches;
  }

  patches.push({
    op: OP_CREATE_ELEMENT,
    id: node.id,
    tag: node.tag,
    parentId
  });

  if (node.props) {
    for (const [key, val] of Object.entries(node.props)) {
      patches.push({
        op: OP_SET_ATTR,
        id: node.id,
        key,
        value: val
      });
    }
  }

  if (parentId) {
    patches.push({
      op: OP_APPEND_CHILD,
      parentId,
      id: node.id
    });
  }

  if (node.children) {
    for (const child of node.children) {
      patches.push(...createTreePatches(child, node.id));
    }
  }

  return patches;
}

/**
 * Calculates a direct 2D canvas draw command list from a VNode tree.
 * This powers Mode B (Canvas / Zero-DOM Obfuscated Streaming Mode).
 */
export function layoutCanvas(tree, width = 640, height = 480) {
  const commands = [];

  // Frame start: clear background
  commands.push({
    op: OP_CLEAR,
    color: '#0d1117'
  });

  let curY = 32;
  const paddingX = 32;

  function processNode(node) {
    if (!node) return;

    if (node.type === '#text') {
      commands.push({
        op: OP_DRAW_TEXT,
        text: node.text,
        x: paddingX,
        y: curY,
        font: '16px monospace',
        color: '#e6edf3'
      });
      curY += 28;
      return;
    }

    const { tag, props = {}, children = [] } = node;
    const style = props.style || {};

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const fontSize = tag === 'h1' ? '24px' : tag === 'h2' ? '20px' : '18px';
      const text = children.map(c => c.text || '').join('');
      commands.push({
        op: OP_DRAW_TEXT,
        text,
        x: paddingX,
        y: curY + (tag === 'h1' ? 24 : 20),
        font: `bold ${fontSize} -apple-system, sans-serif`,
        color: style.color || '#58a6ff'
      });
      curY += tag === 'h1' ? 44 : 36;
    } else if (tag === 'button') {
      const btnText = children.map(c => c.text || '').join('');
      const btnW = Math.max(160, btnText.length * 11 + 36);
      const btnH = 40;
      const btnX = paddingX;
      const btnY = curY;

      // Draw button background
      commands.push({
        op: OP_DRAW_ROUNDED_RECT,
        x: btnX,
        y: btnY,
        w: btnW,
        h: btnH,
        radius: 8,
        fill: style.backgroundColor || '#238636',
        stroke: '#2ea043',
        lineWidth: 1
      });

      // Draw button label
      commands.push({
        op: OP_DRAW_TEXT,
        text: btnText,
        x: btnX + 18,
        y: btnY + 25,
        font: '600 15px -apple-system, sans-serif',
        color: style.color || '#ffffff'
      });

      // Register hit target for clicks
      commands.push({
        op: OP_REGISTER_HIT,
        id: node.id,
        action: props['data-action'] || 'click',
        x: btnX,
        y: btnY,
        w: btnW,
        h: btnH
      });

      curY += btnH + 16;
    } else if (tag === 'div' && props['data-card']) {
      // Draw a container card
      const cardX = paddingX;
      const cardY = curY;
      const cardW = width - paddingX * 2;
      const startY = curY + 20;

      curY = startY;
      for (const child of children) {
        processNode(child);
      }

      const cardH = curY - cardY + 16;
      // Prepend card background before children drawing
      commands.splice(commands.length - children.length * 3, 0, {
        op: OP_DRAW_ROUNDED_RECT,
        x: cardX,
        y: cardY,
        w: cardW,
        h: cardH,
        radius: 10,
        fill: '#161b22',
        stroke: '#30363d',
        lineWidth: 1
      });

      curY += 20;
    } else {
      for (const child of children) {
        processNode(child);
      }
    }
  }

  processNode(tree);

  commands.push({
    op: OP_FRAME_FLUSH
  });

  return commands;
}
