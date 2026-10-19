import {
  OP_CREATE_ELEMENT,
  OP_CREATE_TEXT,
  OP_SET_ATTR,
  OP_REMOVE_ATTR,
  OP_SET_TEXT,
  OP_APPEND_CHILD,
  OP_REMOVE_CHILD
} from '../core/opcodes.js';

/**
 * DOM Patch Renderer
 * Applies virtual DOM diff patches to real browser DOM nodes.
 */
export class DOMRenderer {
  constructor(rootContainer, onEvent) {
    this.root = rootContainer;
    this.onEvent = onEvent;
    this.nodeMap = new Map();
    this.setupEventDelegation();
  }

  setupEventDelegation() {
    this.root.addEventListener('click', (e) => {
      const target = e.target.closest('[data-id], button');
      if (target) {
        const id = target.getAttribute('data-id');
        const action = target.getAttribute('data-action') || 'click';
        if (this.onEvent) {
          this.onEvent({
            type: 'click',
            id,
            action,
            timestamp: Date.now()
          });
        }
      }
    });
  }

  reset() {
    this.nodeMap.clear();
    this.root.innerHTML = '';
  }

  applyPatches(patches) {
    for (const patch of patches) {
      switch (patch.op) {
        case OP_CREATE_ELEMENT: {
          const el = document.createElement(patch.tag);
          el.setAttribute('data-id', patch.id);
          this.nodeMap.set(patch.id, el);
          break;
        }

        case OP_CREATE_TEXT: {
          const txt = document.createTextNode(patch.text || '');
          this.nodeMap.set(patch.id, txt);
          break;
        }

        case OP_SET_ATTR: {
          const node = this.nodeMap.get(patch.id);
          if (node && node instanceof HTMLElement) {
            if (patch.key === 'style' && typeof patch.value === 'object') {
              Object.assign(node.style, patch.value);
            } else if (patch.key === 'style' && typeof patch.value === 'string') {
              node.setAttribute('style', patch.value);
            } else if (patch.key === 'class' || patch.key === 'className') {
              node.className = patch.value;
            } else {
              node.setAttribute(patch.key, patch.value);
            }
          }
          break;
        }

        case OP_REMOVE_ATTR: {
          const node = this.nodeMap.get(patch.id);
          if (node && node instanceof HTMLElement) {
            node.removeAttribute(patch.key);
          }
          break;
        }

        case OP_SET_TEXT: {
          const node = this.nodeMap.get(patch.id);
          if (node) {
            node.textContent = patch.text;
          }
          break;
        }

        case OP_APPEND_CHILD: {
          const parent = patch.parentId ? this.nodeMap.get(patch.parentId) : this.root;
          const child = this.nodeMap.get(patch.id);
          if (parent && child) {
            parent.appendChild(child);
          }
          break;
        }

        case OP_REMOVE_CHILD: {
          const child = this.nodeMap.get(patch.id);
          if (child && child.parentNode) {
            child.parentNode.removeChild(child);
            this.nodeMap.delete(patch.id);
          }
          break;
        }

        default:
          break;
      }
    }
  }
}
