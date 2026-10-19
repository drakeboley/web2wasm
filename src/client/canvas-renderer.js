import {
  OP_CLEAR,
  OP_DRAW_RECT,
  OP_DRAW_ROUNDED_RECT,
  OP_DRAW_TEXT,
  OP_REGISTER_HIT,
  OP_FRAME_FLUSH
} from '../core/opcodes.js';

/**
 * CanvasRenderer (Zero-DOM Obfuscated Mode)
 * Renders UI components purely onto an HTML5 Canvas with internal coordinate hit-testing.
 * Leaves 0 readable or inspectable DOM nodes in DevTools.
 */
export class CanvasRenderer {
  constructor(canvasElement, onEvent) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.onEvent = onEvent;
    this.hitTargets = [];
    this.setupHitTesting();
  }

  setupHitTesting() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      // Find hit target in reverse order (topmost first)
      for (let i = this.hitTargets.length - 1; i >= 0; i--) {
        const target = this.hitTargets[i];
        if (
          clickX >= target.x &&
          clickX <= target.x + target.w &&
          clickY >= target.y &&
          clickY <= target.y + target.h
        ) {
          if (this.onEvent) {
            this.onEvent({
              type: 'click',
              id: target.id,
              action: target.action,
              x: clickX,
              y: clickY,
              timestamp: Date.now()
            });
          }
          break;
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      let isHovering = false;
      for (const target of this.hitTargets) {
        if (
          mx >= target.x &&
          mx <= target.x + target.w &&
          my >= target.y &&
          my <= target.y + target.h
        ) {
          isHovering = true;
          break;
        }
      }
      this.canvas.style.cursor = isHovering ? 'pointer' : 'default';
    });
  }

  reset() {
    this.hitTargets = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderCommands(commands) {
    const ctx = this.ctx;

    for (const cmd of commands) {
      switch (cmd.op) {
        case OP_CLEAR: {
          this.hitTargets = [];
          ctx.fillStyle = cmd.color || '#0d1117';
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          break;
        }

        case OP_DRAW_RECT: {
          ctx.fillStyle = cmd.fill || '#161b22';
          ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
          if (cmd.stroke) {
            ctx.strokeStyle = cmd.stroke;
            ctx.lineWidth = cmd.lineWidth || 1;
            ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h);
          }
          break;
        }

        case OP_DRAW_ROUNDED_RECT: {
          const { x, y, w, h, radius = 6, fill, stroke, lineWidth = 1 } = cmd;
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + w - radius, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
          ctx.lineTo(x + w, y + h - radius);
          ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
          ctx.lineTo(x + radius, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();

          if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
          }
          if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
          }
          break;
        }

        case OP_DRAW_TEXT: {
          ctx.font = cmd.font || '16px sans-serif';
          ctx.fillStyle = cmd.color || '#ffffff';
          ctx.fillText(cmd.text, cmd.x, cmd.y);
          break;
        }

        case OP_REGISTER_HIT: {
          this.hitTargets.push({
            id: cmd.id,
            action: cmd.action,
            x: cmd.x,
            y: cmd.y,
            w: cmd.w,
            h: cmd.h
          });
          break;
        }

        case OP_FRAME_FLUSH:
        default:
          break;
      }
    }
  }
}
