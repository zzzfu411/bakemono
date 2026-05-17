import { sprites } from './assets';
import type { Faction, Rect } from './types';

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

export class Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  damage: number;
  faction: Faction;
  pierce: number;
  char: string;
  angle: number;
  rotationSpeed: number;
  color: string;

  constructor(opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    faction: Faction;
    radius?: number;
    life?: number;
    pierce?: number;
    color?: string;
  }) {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx;
    this.vy = opts.vy;
    this.radius = opts.radius ?? 8;
    this.life = opts.life ?? 2;
    this.damage = opts.damage;
    this.faction = opts.faction;
    this.pierce = opts.pierce ?? 0;
    this.color = opts.color ?? (opts.faction === 'player' ? '#e74c3c' : '#9b59b6');
    this.char = KATAKANA[Math.floor(Math.random() * KATAKANA.length)];
    this.angle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 10;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.angle += this.rotationSpeed * dt;
  }

  get rect(): Rect {
    return { x: this.x - this.radius, y: this.y - this.radius, width: this.radius * 2, height: this.radius * 2 };
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.radius * 2.4}px "Yu Gothic", "Meiryo", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillText(this.char, 0, 0);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-this.vx * 0.02, -this.vy * 0.02);
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

/** Sprite-driven poison gobs etc. */
export class EnemyProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 16;
  life = 4;
  animTime = 0;
  damage: number;

  constructor(x: number, y: number, vx: number, vy: number, damage = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.animTime += dt;
  }

  get rect(): Rect {
    return { x: this.x - this.radius, y: this.y - this.radius, width: this.radius * 2, height: this.radius * 2 };
  }

  draw(ctx: CanvasRenderingContext2D) {
    const size = 72 + Math.sin(this.animTime * 12) * 6;
    if (!sprites.effects.drawFrame(ctx, 9, this.x - size / 2, this.y - size / 2, size, size)) {
      ctx.fillStyle = '#93f241';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Brief AOE pulse used by sword swing, bell wave, Q skills. */
export class HitArea {
  x: number;
  y: number;
  radius: number;
  damage: number;
  life: number;
  faction: Faction;
  hitSet = new WeakSet<object>();
  color: string;
  expanding: number;
  knockback: number;

  constructor(opts: {
    x: number;
    y: number;
    radius: number;
    damage: number;
    faction: Faction;
    life?: number;
    color?: string;
    expanding?: number;
    knockback?: number;
  }) {
    this.x = opts.x;
    this.y = opts.y;
    this.radius = opts.radius;
    this.damage = opts.damage;
    this.faction = opts.faction;
    this.life = opts.life ?? 0.18;
    this.color = opts.color ?? 'rgba(241,196,15,0.55)';
    this.expanding = opts.expanding ?? 0;
    this.knockback = opts.knockback ?? 0;
  }

  update(dt: number) {
    this.life -= dt;
    this.radius += this.expanding * dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const fade = Math.max(0, this.life / 0.18);
    ctx.globalAlpha = 0.35 + 0.4 * fade;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
