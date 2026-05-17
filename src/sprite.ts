import type { Rect } from './types';

/**
 * Replaceable visual layer. Default impl draws a solid color block so the art
 * model can later swap each Sprite with a sprite-sheet or animated renderer
 * without touching gameplay code.
 */
export interface Sprite {
  draw(ctx: CanvasRenderingContext2D, rect: Rect, opts?: DrawOpts): void;
}

export interface DrawOpts {
  flashTimer?: number;
  facing?: number;
  alpha?: number;
}

export class BlockSprite implements Sprite {
  color: string;
  outline?: string;
  constructor(color: string, outline?: string) {
    this.color = color;
    this.outline = outline;
  }

  draw(ctx: CanvasRenderingContext2D, rect: Rect, opts: DrawOpts = {}) {
    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.fillStyle = opts.flashTimer && opts.flashTimer > 0 ? '#fff' : this.color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    if (this.outline) {
      ctx.strokeStyle = this.outline;
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    ctx.restore();
  }
}

export class TelegraphSprite implements Sprite {
  color: string;
  constructor(color: string) {
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D, rect: Rect) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = this.color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }
}
