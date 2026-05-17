import { sprites } from './assets';
import { justPressed, keys, mouse } from './input';
import { clamp } from './math';
import { HitArea, Projectile } from './projectile';
import { frameFromCycle } from './spritesheet';
import { gainStigma, state, stats, takenDamage } from './state';
import { ViewPlane, type Rect } from './types';
import { Sword, tickWeapon, type Weapon } from './weapon';

export const GRAVITY = 1500;
export const JUMP_FORCE = -600;
export const BASE_MOVE_VERT = 320;
export const BASE_MOVE_HORZ = 420;
export const DASH_SPEED = 900;
export const DASH_DURATION = 0.16;
export const BASE_DASH_CD = 0.7;
export const FLOOR_OFFSET = 50;

export class Player {
  x: number;
  y: number;
  width = 42;
  height = 72;
  vx = 0;
  vy = 0;
  hp: number;
  onGround = false;
  iFrames = 0;
  flashTimer = 0;
  facing = 1;
  animTime = 0;
  attackAnim = 0;

  dashTimer = 0;
  dashCooldown = 0;
  dashesLeft: number;

  weapon: Weapon = new Sword();
  shake = 0;

  constructor(canvasW: number, canvasH: number) {
    this.x = canvasW / 2;
    this.y = canvasH - 200;
    this.hp = stats.maxHp;
    this.dashesLeft = stats.dashCharges;
  }

  get cx() {
    return this.x + this.width / 2;
  }
  get cy() {
    return this.y + this.height / 2;
  }
  get rect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  setWeapon(w: Weapon) {
    this.weapon = w;
  }

  aimAngle(): number {
    return Math.atan2(mouse.y - this.cy, mouse.x - this.cx);
  }

  update(
    dt: number,
    canvasW: number,
    canvasH: number,
    obstacles: Rect[],
    projectiles: Projectile[],
    hits: HitArea[],
  ) {
    this.animTime += dt;
    if (this.iFrames > 0) this.iFrames -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.attackAnim > 0) this.attackAnim -= dt;

    this.facing = mouse.x >= this.cx ? 1 : -1;

    if (stats.regen > 0 && this.hp < stats.maxHp) {
      this.hp = Math.min(stats.maxHp, this.hp + stats.regen * dt);
    }

    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashesLeft < stats.dashCharges && this.dashCooldown <= 0) {
      this.dashesLeft = stats.dashCharges;
    }

    if (justPressed[' '] && this.dashesLeft > 0 && this.dashTimer <= 0) {
      this.startDash();
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
    } else if (state.plane === ViewPlane.Vertical) {
      this.vx = 0;
      const speed = BASE_MOVE_VERT * stats.moveSpeed;
      if (keys['a']) this.vx = -speed;
      if (keys['d']) this.vx = speed;
      this.vy += GRAVITY * dt;
      if (keys['w'] && this.onGround) {
        this.vy = JUMP_FORCE;
        this.onGround = false;
      }
    } else {
      this.vx = 0;
      this.vy = 0;
      const speed = BASE_MOVE_HORZ * stats.moveSpeed;
      if (keys['w']) this.vy = -speed;
      if (keys['s']) this.vy = speed;
      if (keys['a']) this.vx = -speed;
      if (keys['d']) this.vx = speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.resolveCollisions(dt, canvasW, canvasH, obstacles);

    tickWeapon(this.weapon, dt, hits);
    const aim = this.aimAngle();
    if (mouse.down) {
      const before = this.weapon.primaryTimer;
      this.weapon.primary(this, aim, projectiles, hits);
      if (before <= 0 && this.weapon.primaryTimer > 0) this.attackAnim = 0.32;
    }
    if (justPressed['q']) this.weapon.special(this, aim, projectiles, hits);
  }

  private startDash() {
    this.dashTimer = DASH_DURATION;
    this.dashesLeft -= 1;
    if (this.dashesLeft === 0) this.dashCooldown = BASE_DASH_CD * stats.dashCdMul;
    this.iFrames = Math.max(this.iFrames, DASH_DURATION + 0.05);
    let dx = 0;
    let dy = 0;
    if (state.plane === ViewPlane.Horizontal) {
      if (keys['a']) dx -= 1;
      if (keys['d']) dx += 1;
      if (keys['w']) dy -= 1;
      if (keys['s']) dy += 1;
      if (dx === 0 && dy === 0) {
        const a = this.aimAngle();
        dx = Math.cos(a);
        dy = Math.sin(a);
      }
    } else {
      const dir = keys['a'] ? -1 : keys['d'] ? 1 : this.facing;
      dx = dir;
      dy = 0;
    }
    const len = Math.hypot(dx, dy) || 1;
    this.vx = (dx / len) * DASH_SPEED;
    this.vy = (dy / len) * DASH_SPEED * (state.plane === ViewPlane.Vertical ? 0.4 : 1);
  }

  private resolveCollisions(dt: number, canvasW: number, canvasH: number, obstacles: Rect[]) {
    if (state.plane === ViewPlane.Vertical) {
      this.onGround = false;
      const floorY = canvasH - FLOOR_OFFSET;
      const prevBottom = this.y + this.height - this.vy * dt;
      const currentBottom = this.y + this.height;
      for (const obs of obstacles) {
        const hovering = this.x + this.width > obs.x && this.x < obs.x + obs.width;
        const falling = this.vy >= 0;
        if (
          hovering &&
          falling &&
          ((prevBottom <= obs.y + 10 && currentBottom >= obs.y) || Math.abs(currentBottom - obs.y) < 2)
        ) {
          this.y = obs.y - this.height;
          this.vy = 0;
          this.onGround = true;
        }
      }
      if (this.y + this.height > floorY) {
        this.y = floorY - this.height;
        this.vy = 0;
        this.onGround = true;
      }
    } else {
      for (const obs of obstacles) {
        if (rectsOverlap(this.rect, obs)) {
          const overlapX = (this.width + obs.width) / 2 - Math.abs(this.cx - (obs.x + obs.width / 2));
          const overlapY = (this.height + obs.height) / 2 - Math.abs(this.cy - (obs.y + obs.height / 2));
          if (overlapX < overlapY) {
            if (this.x < obs.x) this.x -= overlapX;
            else this.x += overlapX;
          } else {
            if (this.y < obs.y) this.y -= overlapY;
            else this.y += overlapY;
          }
        }
      }
    }
    this.x = clamp(this.x, 0, canvasW - this.width);
    if (state.plane === ViewPlane.Horizontal) this.y = clamp(this.y, 0, canvasH - this.height);
  }

  takeDamage(raw: number) {
    if (this.iFrames > 0) return;
    if (stats.dodge > 0 && Math.random() < stats.dodge) {
      this.iFrames = 0.18;
      return;
    }
    const dmg = takenDamage(raw);
    this.hp -= dmg;
    this.iFrames = 0.62;
    this.flashTimer = 0.12;
    this.shake = 0.2;
    if (state.stigmaActive) {
      state.resurrectChance = Math.max(0.05, state.resurrectChance - 0.01);
      // Collapse trigger handled by game.ts to know its scene swap.
    } else {
      gainStigma(20);
    }
    if (this.hp < 0) this.hp = 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    let frame = 0;
    if (this.dashTimer > 0) {
      frame = 7;
    } else if (this.attackAnim > 0) {
      frame = 4 + clamp(Math.floor((0.32 - this.attackAnim) / 0.11), 0, 2);
    } else if (Math.abs(this.vx) > 10 || (Math.abs(this.vy) > 10 && state.plane === ViewPlane.Horizontal)) {
      frame = frameFromCycle(1, 3, this.animTime, 8);
    }
    const drawWidth = 150;
    const drawHeight = 150;
    const drawX = this.cx - drawWidth / 2;
    const drawY = this.y + this.height - drawHeight + 18;
    const alpha = this.iFrames > 0 ? 0.62 + Math.sin(this.animTime * 45) * 0.22 : 1;
    const drew = sprites.player.drawFrame(ctx, frame, drawX, drawY, drawWidth, drawHeight, this.facing < 0, alpha);
    if (!drew) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.flashTimer > 0 ? '#fff' : '#3498db';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.restore();
    }
    // Aim line
    const aim = this.aimAngle();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.cx, this.cy);
    ctx.lineTo(this.cx + Math.cos(aim) * 44, this.cy + Math.sin(aim) * 44);
    ctx.stroke();
    ctx.restore();
  }
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
