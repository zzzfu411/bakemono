import { bossSprites, sprites } from './assets';
import { Effect } from './effect';
import { clamp } from './math';
import type { Player } from './player';
import { FLOOR_OFFSET, GRAVITY } from './player';
import { EnemyProjectile, Projectile } from './projectile';
import { frameFromCycle, type SpriteSheet } from './spritesheet';
import { state } from './state';
import { ViewPlane, type Rect } from './types';

export type EnemyKind = 'crab' | 'claw' | 'snake' | 'stagKing' | 'chimeKeeper' | 'mourner' | 'cathedra';

export interface SpawnContext {
  player: Player;
  effects: Effect[];
  enemyProjectiles: EnemyProjectile[];
  bossProjectiles: Projectile[];
  canvasW: number;
  canvasH: number;
}

export abstract class Enemy {
  kind: EnemyKind;
  x: number;
  y: number;
  width: number;
  height: number;
  vx = 0;
  vy = 0;
  hp: number;
  maxHp: number;
  speed: number;
  onGround = false;
  animTime = 0;
  attackTimer = 0;
  attackCooldown = 0;
  attackHitDone = false;
  facing = -1;
  iFrames = 0;
  flashTimer = 0;
  contactDamage = 1;
  rewardMoney = 1;
  rewardXp = 2;
  isBoss = false;

  constructor(kind: EnemyKind, x: number, y: number, width: number, height: number, hp: number, speed: number) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
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

  update(dt: number, ctx: SpawnContext) {
    this.animTime += dt;
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.iFrames > 0) this.iFrames -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    this.think(dt, ctx);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.resolveCollision(ctx.canvasW, ctx.canvasH);
  }

  protected resolveCollision(canvasW: number, canvasH: number) {
    if (state.plane === ViewPlane.Vertical) {
      const floorY = canvasH - FLOOR_OFFSET;
      if (this.y + this.height > floorY) {
        this.y = floorY - this.height;
        this.vy = 0;
        this.onGround = true;
      } else this.onGround = false;
    } else {
      this.onGround = false;
      this.y = clamp(this.y, 0, canvasH - this.height);
    }
    this.x = clamp(this.x, 0, canvasW - this.width);
  }

  protected seek(dx: number, dy: number, distance: number, speed: number) {
    if (state.plane === ViewPlane.Vertical) {
      this.vx = Math.sign(dx) * speed;
      this.vy += GRAVITY / 60;
    } else {
      const len = Math.max(1, distance);
      this.vx = (dx / len) * speed;
      this.vy = (dy / len) * speed;
    }
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    this.flashTimer = 0.08;
    this.iFrames = 0.05;
  }

  abstract think(dt: number, ctx: SpawnContext): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;

  protected drawHpBar(ctx: CanvasRenderingContext2D) {
    if (this.hp >= this.maxHp) return;
    const ratio = clamp(this.hp / this.maxHp, 0, 1);
    ctx.fillStyle = '#222';
    ctx.fillRect(this.x, this.y - 9, this.width, 4);
    ctx.fillStyle = this.isBoss ? '#9b59b6' : '#e74c3c';
    ctx.fillRect(this.x, this.y - 9, this.width * ratio, 4);
  }
}

export class CrabYokai extends Enemy {
  guardTimer = 0;
  guardCooldown = 0;

  constructor(x: number, y: number) {
    super('crab', x, y, 76, 52, 18, 60);
    this.contactDamage = 1;
    this.rewardMoney = 2;
    this.rewardXp = 3;
  }

  takeDamage(amount: number) {
    if (this.guardTimer > 0) {
      super.takeDamage(amount * 0.2);
      return;
    }
    super.takeDamage(amount);
  }

  think(dt: number, ctx: SpawnContext) {
    this.guardTimer = Math.max(0, this.guardTimer - dt);
    this.guardCooldown = Math.max(0, this.guardCooldown - dt);
    const dx = ctx.player.cx - this.cx;
    const dy = ctx.player.cy - this.cy;
    const d = Math.hypot(dx, dy);
    this.facing = dx >= 0 ? 1 : -1;

    if (this.guardCooldown <= 0 && d < 260) {
      this.guardTimer = 1.35;
      this.guardCooldown = 3.1;
      ctx.effects.push(new Effect('crabGuard', this.cx, this.cy, 0.55, 1.2, this.facing));
    }
    if (this.guardTimer > 0) {
      this.vx = 0;
      this.vy = state.plane === ViewPlane.Vertical ? this.vy + GRAVITY / 60 : 0;
      return;
    }
    this.seek(dx, dy, d, this.speed);
  }

  draw(ctx: CanvasRenderingContext2D) {
    let frame = 0;
    if (this.guardTimer > 0) {
      frame = 4 + clamp(Math.floor((1.35 - this.guardTimer) / 0.34), 0, 3);
    } else if (Math.abs(this.vx) > 6) frame = frameFromCycle(1, 3, this.animTime, 7);
    const w = 158;
    const h = 118;
    const dx = this.cx - w / 2;
    const dy = this.y + this.height - h + 24;
    if (!sprites.crab.drawFrame(ctx, frame, dx, dy, w, h, this.facing < 0)) fallback(ctx, this.x, this.y, this.width, this.height, '#f6f1df', this.flashTimer > 0);
    this.drawHpBar(ctx);
  }
}

export class ClawYokai extends Enemy {
  constructor(x: number, y: number) {
    super('claw', x, y, 48, 68, 10, 160);
    this.contactDamage = 1;
    this.rewardMoney = 1;
    this.rewardXp = 2;
  }

  think(dt: number, ctx: SpawnContext) {
    const dx = ctx.player.cx - this.cx;
    const dy = ctx.player.cy - this.cy;
    const d = Math.hypot(dx, dy);
    this.facing = dx >= 0 ? 1 : -1;

    if (d < 118 && this.attackCooldown <= 0) {
      this.attackTimer = 0.48;
      this.attackCooldown = 1.12;
      this.attackHitDone = false;
      ctx.effects.push(new Effect('clawSlash', this.cx + this.facing * 42, this.cy, 0.32, 1, this.facing));
    }
    if (this.attackTimer > 0) {
      this.vx = 0;
      this.vy = state.plane === ViewPlane.Vertical ? this.vy + GRAVITY / 60 : 0;
      if (!this.attackHitDone && this.attackTimer < 0.24 && d < 135) {
        ctx.player.takeDamage(1);
        this.attackHitDone = true;
      }
      void dt;
      return;
    }
    this.seek(dx, dy, d, this.speed);
  }

  draw(ctx: CanvasRenderingContext2D) {
    let frame = 0;
    if (this.attackTimer > 0) frame = 4 + clamp(Math.floor((0.56 - this.attackTimer) / 0.14), 0, 3);
    else if (Math.abs(this.vx) > 6) frame = frameFromCycle(1, 3, this.animTime, 10);
    const w = 148;
    const h = 138;
    const dx = this.cx - w / 2;
    const dy = this.y + this.height - h + 24;
    if (!sprites.claw.drawFrame(ctx, frame, dx, dy, w, h, this.facing < 0)) fallback(ctx, this.x, this.y, this.width, this.height, '#e9e9e9', this.flashTimer > 0);
    this.drawHpBar(ctx);
  }
}

export class SnakeYokai extends Enemy {
  constructor(x: number, y: number) {
    super('snake', x, y, 82, 58, 12, 92);
    this.contactDamage = 1;
    this.rewardMoney = 2;
    this.rewardXp = 3;
  }

  think(dt: number, ctx: SpawnContext) {
    const dx = ctx.player.cx - this.cx;
    const dy = ctx.player.cy - this.cy;
    const d = Math.hypot(dx, dy);
    this.facing = dx >= 0 ? 1 : -1;

    if (this.attackCooldown <= 0 && d < 620) {
      const length = Math.max(1, d);
      const speed = 330;
      ctx.enemyProjectiles.push(new EnemyProjectile(this.cx, this.cy, (dx / length) * speed, (dy / length) * speed));
      ctx.effects.push(new Effect('poison', this.cx + this.facing * 52, this.cy - 8, 0.42, 0.78, this.facing));
      this.attackTimer = 0.56;
      this.attackCooldown = 2.25;
    }
    if (d < 260) this.seek(-dx, -dy, d, this.speed * 0.78);
    else if (d > 400) this.seek(dx, dy, d, this.speed);
    else {
      this.vx *= 0.86;
      this.vy = state.plane === ViewPlane.Vertical ? this.vy + GRAVITY / 60 : this.vy * 0.86;
    }
    void dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    let frame = 0;
    if (this.attackTimer > 0) frame = 4 + clamp(Math.floor((0.56 - this.attackTimer) / 0.14), 0, 3);
    else if (Math.abs(this.vx) > 6 || (Math.abs(this.vy) > 6 && state.plane === ViewPlane.Horizontal))
      frame = frameFromCycle(1, 3, this.animTime, 7);
    const w = 182;
    const h = 142;
    const dx = this.cx - w / 2;
    const dy = this.y + this.height - h + 24;
    if (!sprites.snake.drawFrame(ctx, frame, dx, dy, w, h, this.facing < 0)) fallback(ctx, this.x, this.y, this.width, this.height, '#bff068', this.flashTimer > 0);
    this.drawHpBar(ctx);
  }
}

/** Common drawing for all 4 area bosses — sprite sheet (4×2) with idle/walk/attack frames. */
function drawBossSprite(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  enemy: Enemy,
  acting: boolean,
  fallbackColor: string,
) {
  let frame = 0;
  if (acting) {
    frame = 4 + clamp(Math.floor(enemy.animTime * 8) % 4, 0, 3);
  } else if (Math.abs(enemy.vx) > 6 || Math.abs(enemy.vy) > 6) {
    frame = frameFromCycle(1, 3, enemy.animTime, 6);
  }
  const w = enemy.width * 2.1;
  const h = enemy.height * 2.0;
  const dx = enemy.cx - w / 2;
  const dy = enemy.y + enemy.height - h + 30;
  const drew = sheet.drawFrame(ctx, frame, dx, dy, w, h, enemy.facing < 0, enemy.flashTimer > 0 ? 0.8 : 1);
  if (!drew) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = enemy.flashTimer > 0 ? '#fff' : fallbackColor;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.restore();
  }
}

/** Area 1 Boss — 巨木薄林 · 鹿王 · 冲撞 + 法阵爆裂. */
export class StagKingBoss extends Enemy {
  phase: 'idle' | 'wind' | 'charge' | 'stomp' = 'idle';
  timer = 1.5;
  chargeDir = 0;
  rootCooldown = 4;

  constructor(x: number, y: number) {
    super('stagKing', x, y, 130, 140, 180, 165);
    this.contactDamage = 3;
    this.rewardMoney = 42;
    this.rewardXp = 55;
    this.isBoss = true;
    this.rootCooldown = 3.2;
  }

  think(dt: number, ctx: SpawnContext) {
    this.timer -= dt;
    this.rootCooldown -= dt;
    const dx = ctx.player.cx - this.cx;
    const dy = ctx.player.cy - this.cy;
    this.facing = dx >= 0 ? 1 : -1;

    if (state.plane === ViewPlane.Vertical) this.vy += GRAVITY / 60;

    switch (this.phase) {
      case 'idle': {
        const dir = Math.sign(dx) || 1;
        this.vx = dir * this.speed * 0.5;
        if (this.timer <= 0) {
          if (this.rootCooldown <= 0 && state.plane === ViewPlane.Horizontal) {
            this.phase = 'stomp';
            this.timer = 0.8;
          } else {
            this.phase = 'wind';
            this.timer = 0.7;
            this.chargeDir = dir;
          }
        }
        break;
      }
      case 'wind':
        this.vx = 0;
        if (this.timer <= 0) {
          this.phase = 'charge';
          this.timer = 0.55;
        }
        break;
      case 'charge':
        this.vx = this.chargeDir * 820;
        if (state.plane === ViewPlane.Horizontal) this.vy = Math.sign(dy) * 280;
        if (this.timer <= 0) {
          this.phase = 'idle';
          this.timer = 0.95;
        }
        break;
      case 'stomp':
        this.vx = 0;
        if (this.timer <= 0) {
          for (let i = 0; i < 12; i++) {
            const ang = (Math.PI * 2 * i) / 12;
            ctx.bossProjectiles.push(
              new Projectile({
                x: this.cx,
                y: this.cy,
                vx: Math.cos(ang) * 360,
                vy: Math.sin(ang) * 360,
                damage: 1,
                faction: 'enemy',
                color: '#7d3c98',
                radius: 11,
                life: 2.5,
              }),
            );
          }
          this.phase = 'idle';
          this.timer = 1.4;
          this.rootCooldown = 5.5;
        }
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawBossSprite(ctx, bossSprites.stagKing, this, this.phase === 'wind' || this.phase === 'stomp', '#7d3c98');
    if (this.phase === 'wind' || this.phase === 'stomp') {
      ctx.save();
      ctx.strokeStyle = '#f1c40f';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 3;
      ctx.strokeRect(this.x - 6, this.y - 6, this.width + 12, this.height + 12);
      ctx.restore();
    }
    this.drawHpBar(ctx);
  }
}

/** Area 2 Boss — 失重钟楼 · 钟守 · 弹幕花 + 时停延音. */
export class ChimeKeeperBoss extends Enemy {
  phase: 'idle' | 'cast' | 'ring' = 'idle';
  timer = 1.8;
  ringCount = 0;

  constructor(x: number, y: number) {
    super('chimeKeeper', x, y, 140, 150, 230, 120);
    this.contactDamage = 3;
    this.rewardMoney = 55;
    this.rewardXp = 72;
    this.isBoss = true;
  }

  think(dt: number, ctx: SpawnContext) {
    this.timer -= dt;
    const dx = ctx.player.cx - this.cx;
    const dy = ctx.player.cy - this.cy;
    this.facing = dx >= 0 ? 1 : -1;
    if (state.plane === ViewPlane.Vertical) this.vy += GRAVITY / 60;

    switch (this.phase) {
      case 'idle': {
        // Drift slowly toward the player but back away if too close.
        const d = Math.hypot(dx, dy);
        const dir = d < 280 ? -Math.sign(dx) : Math.sign(dx);
        this.vx = (dir || 1) * this.speed * 0.55;
        if (this.timer <= 0) {
          this.phase = 'cast';
          this.timer = 0.85;
        }
        break;
      }
      case 'cast':
        this.vx = 0;
        if (this.timer <= 0) {
          this.phase = 'ring';
          this.timer = 0.0;
          this.ringCount = 0;
        }
        break;
      case 'ring':
        this.vx = 0;
        this.timer -= dt;
        if (this.timer <= 0 && this.ringCount < 4) {
          // 4 successive rings of 10 chime-petals.
          const offset = this.ringCount * (Math.PI / 10);
          for (let i = 0; i < 10; i++) {
            const ang = offset + (Math.PI * 2 * i) / 10;
            ctx.bossProjectiles.push(
              new Projectile({
                x: this.cx,
                y: this.cy,
                vx: Math.cos(ang) * 330,
                vy: Math.sin(ang) * 330,
                damage: 1,
                faction: 'enemy',
                color: '#e67e22',
                radius: 11,
                life: 3.4,
              }),
            );
          }
          this.ringCount += 1;
          this.timer = 0.35;
        }
        if (this.ringCount >= 4 && this.timer <= 0) {
          this.phase = 'idle';
          this.timer = 1.6;
        }
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawBossSprite(ctx, bossSprites.chimeKeeper, this, this.phase !== 'idle', '#e67e22');
    this.drawHpBar(ctx);
  }
}

/** Area 3 Boss — 灰海墓原 · 哀悼者 · 召唤墓中爪 + 黑波. */
export class MournerBoss extends Enemy {
  phase: 'idle' | 'summon' | 'wave' = 'idle';
  timer = 2.0;
  summonsSpawned = false;

  constructor(x: number, y: number) {
    super('mourner', x, y, 130, 150, 260, 130);
    this.contactDamage = 3;
    this.rewardMoney = 65;
    this.rewardXp = 88;
    this.isBoss = true;
  }

  think(dt: number, ctx: SpawnContext) {
    this.timer -= dt;
    const dx = ctx.player.cx - this.cx;
    const dy = ctx.player.cy - this.cy;
    this.facing = dx >= 0 ? 1 : -1;
    if (state.plane === ViewPlane.Vertical) this.vy += GRAVITY / 60;

    switch (this.phase) {
      case 'idle': {
        const dir = Math.sign(dx) || 1;
        this.vx = dir * this.speed * 0.7;
        if (this.timer <= 0) {
          this.phase = Math.random() < 0.55 ? 'wave' : 'summon';
          this.timer = this.phase === 'summon' ? 0.9 : 0.6;
          this.summonsSpawned = false;
        }
        break;
      }
      case 'summon':
        this.vx = 0;
        if (!this.summonsSpawned && this.timer < 0.55) {
          // Spawn 3 fast-moving claw projectiles converging on the player.
          for (const sign of [-1, 0, 1]) {
            ctx.bossProjectiles.push(
              new Projectile({
                x: ctx.player.cx + sign * 200,
                y: ctx.player.cy + 70,
                vx: -sign * 280,
                vy: -140,
                damage: 2,
                faction: 'enemy',
                color: '#9b59b6',
                radius: 13,
                life: 2.4,
              }),
            );
          }
          this.summonsSpawned = true;
        }
        if (this.timer <= 0) {
          this.phase = 'idle';
          this.timer = 1.4;
        }
        break;
      case 'wave':
        this.vx = 0;
        if (this.timer <= 0) {
          // 7-bullet fan toward player.
          const baseAng = Math.atan2(dy, dx);
          for (let i = -3; i <= 3; i++) {
            const ang = baseAng + i * 0.16;
            ctx.bossProjectiles.push(
              new Projectile({
                x: this.cx,
                y: this.cy,
                vx: Math.cos(ang) * 460,
                vy: Math.sin(ang) * 460,
                damage: 1,
                faction: 'enemy',
                color: '#3d2c5b',
                radius: 11,
                life: 2.8,
              }),
            );
          }
          this.phase = 'idle';
          this.timer = 1.1;
        }
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawBossSprite(ctx, bossSprites.mourner, this, this.phase !== 'idle', '#3d2c5b');
    this.drawHpBar(ctx);
  }
}

/** Area 4 Boss — 教会圣城 · 圣座 · 十字光柱 + 圣印追击. */
export class CathedraBoss extends Enemy {
  phase: 'idle' | 'cross' | 'judgment' = 'idle';
  timer = 1.6;
  judgmentTargets: Array<{ x: number; y: number; warn: number }> = [];

  constructor(x: number, y: number) {
    super('cathedra', x, y, 150, 160, 340, 110);
    this.contactDamage = 4;
    this.rewardMoney = 88;
    this.rewardXp = 115;
    this.isBoss = true;
  }

  think(dt: number, ctx: SpawnContext) {
    this.timer -= dt;
    const dx = ctx.player.cx - this.cx;
    this.facing = dx >= 0 ? 1 : -1;
    if (state.plane === ViewPlane.Vertical) this.vy += GRAVITY / 60;

    // Tick warning telegraphs — when warn hits 0 fire the column.
    for (let i = this.judgmentTargets.length - 1; i >= 0; i--) {
      const t = this.judgmentTargets[i];
      t.warn -= dt;
      if (t.warn <= 0) {
        const dist = Math.hypot(ctx.player.cx - t.x, ctx.player.cy - t.y);
        if (dist < 90) ctx.player.takeDamage(2);
        this.judgmentTargets.splice(i, 1);
      }
    }

    switch (this.phase) {
      case 'idle': {
        const dir = Math.sign(dx) || 1;
        this.vx = dir * this.speed * 0.45;
        if (this.timer <= 0) {
          this.phase = Math.random() < 0.5 ? 'cross' : 'judgment';
          this.timer = this.phase === 'cross' ? 0.6 : 0.7;
        }
        break;
      }
      case 'cross':
        this.vx = 0;
        if (this.timer <= 0) {
          // Cross-shaped beam: 4 directions × 3 = 12 bullets, harder hits.
          for (let i = 0; i < 12; i++) {
            const ang = (i / 6) * Math.PI;
            ctx.bossProjectiles.push(
              new Projectile({
                x: this.cx,
                y: this.cy,
                vx: Math.cos(ang) * 420,
                vy: Math.sin(ang) * 420,
                damage: 2,
                faction: 'enemy',
                color: '#f1c40f',
                radius: 13,
                life: 2.6,
              }),
            );
          }
          this.phase = 'idle';
          this.timer = 1.15;
        }
        break;
      case 'judgment':
        this.vx = 0;
        if (this.timer <= 0) {
          // 4 telegraphed pillars now (was 3), with shorter warn windows.
          this.judgmentTargets.push({ x: ctx.player.cx, y: ctx.player.cy, warn: 0.55 });
          this.judgmentTargets.push({
            x: ctx.player.cx + (Math.random() - 0.5) * 200,
            y: ctx.player.cy + (Math.random() - 0.5) * 160,
            warn: 0.7,
          });
          this.judgmentTargets.push({
            x: ctx.player.cx + (Math.random() - 0.5) * 240,
            y: ctx.player.cy + (Math.random() - 0.5) * 200,
            warn: 0.85,
          });
          this.judgmentTargets.push({
            x: ctx.player.cx + (Math.random() - 0.5) * 280,
            y: ctx.player.cy + (Math.random() - 0.5) * 220,
            warn: 1.0,
          });
          this.phase = 'idle';
          this.timer = 1.3;
        }
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawBossSprite(ctx, bossSprites.cathedra, this, this.phase !== 'idle', '#f1c40f');
    // Draw judgment telegraphs.
    for (const t of this.judgmentTargets) {
      const a = clamp(t.warn / 1.0, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.4 + (1 - a) * 0.5;
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 2 + (1 - a) * 4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    this.drawHpBar(ctx);
  }
}

function fallback(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, flash: boolean) {
  ctx.save();
  ctx.fillStyle = flash ? '#fff' : color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
