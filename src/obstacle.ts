import { obstacleArt } from './assets';
import { state } from './state';
import { ObstacleKind, ViewPlane, type Rect } from './types';

/**
 * An obstacle has a collision rect (used by physics) plus a render kind
 * controlling its art. Each area produces different kinds to keep visual variety
 * while reusing the same physics interface.
 */
export class Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: ObstacleKind;
  /** Persistent variant index — picks between 3 art variants for stump/tombstone. */
  variant: number;

  constructor(x: number, y: number, width: number, height: number, kind: ObstacleKind = ObstacleKind.Torii) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.kind = kind;
    this.variant = Math.floor(Math.random() * 3);
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  draw(ctx: CanvasRenderingContext2D) {
    const vertical = state.plane === ViewPlane.Vertical;
    switch (this.kind) {
      case ObstacleKind.Torii:
        drawArt(ctx, obstacleArt.torii, this, vertical ? 0.46 : 0.82, -35, -82, 70, 124, 'rgba(245,245,245,0.35)');
        break;
      case ObstacleKind.Stump: {
        const art = this.variant === 0 ? obstacleArt.stump : this.variant === 1 ? obstacleArt.stumpAlt : obstacleArt.stumpSmall;
        drawArt(ctx, art, this, vertical ? 0.85 : 0.96, -18, -28, 36, 38, '#8e6e3e');
        break;
      }
      case ObstacleKind.Floater: {
        const art = this.variant === 0 ? obstacleArt.floaterSlab : obstacleArt.floaterPillar;
        drawArt(ctx, art, this, vertical ? 0.78 : 0.94, -10, -18, 20, 30, '#3a3f4b');
        break;
      }
      case ObstacleKind.Tombstone: {
        const art = this.variant === 0 ? obstacleArt.tombstone : this.variant === 1 ? obstacleArt.tombstoneAlt : obstacleArt.tombstoneSmall;
        drawArt(ctx, art, this, vertical ? 0.82 : 0.96, -14, -28, 28, 34, '#7f8c8d');
        break;
      }
      case ObstacleKind.Chain:
        drawArt(ctx, obstacleArt.chain, this, vertical ? 0.7 : 0.92, -8, -10, 16, 16, '#d8c97c');
        break;
    }

    if (vertical) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.width, this.y);
      ctx.stroke();
    }
  }
}

function drawArt(
  ctx: CanvasRenderingContext2D,
  art: { image: HTMLImageElement; isReady: () => boolean },
  o: Obstacle,
  alpha: number,
  padX: number,
  padY: number,
  padW: number,
  padH: number,
  fallback: string,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (art.isReady()) {
    ctx.drawImage(art.image, o.x + padX, o.y + padY, o.width + padW, o.height + padH);
  } else {
    ctx.fillStyle = fallback;
    ctx.fillRect(o.x, o.y, o.width, o.height);
  }
  ctx.restore();
}
