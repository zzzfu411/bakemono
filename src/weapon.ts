import { Effect, type WeaponEffectId } from './effect';
import { clamp } from './math';
import type { Player } from './player';
import { HitArea, Projectile } from './projectile';
import { gainStigma, rollCrit, state, stats } from './state';
import { ViewPlane } from './types';

/** Per-weapon FX bus. game.ts wires this to its `effects` array on init. */
let fxSink: { push: (e: Effect) => void } | null = null;
export function bindWeaponFxSink(sink: { push: (e: Effect) => void }) {
  fxSink = sink;
}
function emitSwing(id: WeaponEffectId, x: number, y: number, rot: number, scale = 1, durMs = 280) {
  fxSink?.push(Effect.weaponSwing(id, x, y, rot, scale, durMs));
}

export type WeaponKind = 'melee' | 'ranged' | 'spell';

export interface WeaponSpec {
  /** Base damage per primary hit (before stats). */
  baseDamage: number;
  /** Primary attack interval in seconds. */
  primaryCooldown: number;
  /** Q special cooldown in seconds. */
  specialCooldown: number;
  /** Effective reach in px (visualization only). */
  reach: number;
}

export interface Weapon {
  id: string;
  name: string;
  kind: WeaponKind;
  spec: WeaponSpec;
  description: string;
  specialName: string;
  specialDesc: string;
  primaryTimer: number;
  specialTimer: number;
  primary(p: Player, aim: number, projectiles: Projectile[], hits: HitArea[]): void;
  special(p: Player, aim: number, projectiles: Projectile[], hits: HitArea[]): void;
}

function damageOf(spec: WeaponSpec, kind: WeaponKind, mult = 1): number {
  const flat = kind === 'melee' ? stats.meleeDamage : stats.rangedDamage;
  return (spec.baseDamage + flat) * stats.damage * rollCrit() * mult;
}

function primaryInterval(spec: WeaponSpec) {
  return spec.primaryCooldown / Math.max(0.3, stats.attackSpeed);
}

function reachOf(spec: WeaponSpec) {
  return spec.reach * stats.attackRange;
}

export class Sword implements Weapon {
  id = 'sword';
  name = '墨刃';
  kind: WeaponKind = 'melee';
  spec: WeaponSpec = { baseDamage: 8, primaryCooldown: 0.42, specialCooldown: 3.0, reach: 90 };
  description = '近战扇形挥砍，倍率高，需贴脸';
  specialName = '墨突斩';
  specialDesc = '向瞄准方向突进 200px，附带 0.35s 无敌，命中 AOE +120% 伤害';
  primaryTimer = 0;
  specialTimer = 0;

  primary(p: Player, aim: number, _proj: Projectile[], hits: HitArea[]) {
    if (this.primaryTimer > 0) return;
    this.primaryTimer = primaryInterval(this.spec);
    const r = reachOf(this.spec);
    emitSwing('sword', p.cx + Math.cos(aim) * r * 0.45, p.cy + Math.sin(aim) * r * 0.45, aim, 0.9);
    hits.push(
      new HitArea({
        x: p.cx + Math.cos(aim) * r * 0.45,
        y: p.cy + Math.sin(aim) * r * 0.45,
        radius: r * 0.65,
        damage: damageOf(this.spec, this.kind),
        faction: 'player',
        life: 0.16,
        color: 'rgba(255,255,255,0.45)',
        knockback: 220,
      }),
    );
  }

  special(p: Player, aim: number, _proj: Projectile[], hits: HitArea[]) {
    if (this.specialTimer > 0) return;
    this.specialTimer = this.spec.specialCooldown;
    p.x += Math.cos(aim) * 200;
    p.y += Math.sin(aim) * 200 * (state.plane === ViewPlane.Vertical ? 0.2 : 1);
    p.iFrames = Math.max(p.iFrames, 0.35);
    emitSwing('sword', p.cx, p.cy, aim, 1.6, 360);
    hits.push(
      new HitArea({
        x: p.cx,
        y: p.cy,
        radius: 95 * stats.attackRange,
        damage: damageOf(this.spec, this.kind, 2.2),
        faction: 'player',
        life: 0.22,
        color: 'rgba(231,76,60,0.55)',
        knockback: 380,
      }),
    );
  }
}

export class Spear implements Weapon {
  id = 'spear';
  name = '骨矛';
  kind: WeaponKind = 'melee';
  spec: WeaponSpec = { baseDamage: 6, primaryCooldown: 0.55, specialCooldown: 4.0, reach: 150 };
  description = '远距长矛直刺，攻速慢命中长';
  specialName = '贯穿刺';
  specialDesc = '蓄力一击，向前 320px 内的所有目标各造成 1.8 倍伤害';
  primaryTimer = 0;
  specialTimer = 0;

  primary(p: Player, aim: number, _proj: Projectile[], hits: HitArea[]) {
    if (this.primaryTimer > 0) return;
    this.primaryTimer = primaryInterval(this.spec);
    const r = reachOf(this.spec);
    const dmg = damageOf(this.spec, this.kind);
    emitSwing('spear', p.cx + Math.cos(aim) * r * 0.5, p.cy + Math.sin(aim) * r * 0.5, aim, 1.0);
    hits.push(
      new HitArea({
        x: p.cx + Math.cos(aim) * r * 0.5,
        y: p.cy + Math.sin(aim) * r * 0.5,
        radius: r * 0.3,
        damage: dmg,
        faction: 'player',
        life: 0.18,
        color: 'rgba(127,140,141,0.5)',
        knockback: 180,
      }),
    );
  }

  special(p: Player, aim: number, _proj: Projectile[], hits: HitArea[]) {
    if (this.specialTimer > 0) return;
    this.specialTimer = this.spec.specialCooldown;
    const dmg = damageOf(this.spec, this.kind, 1.8);
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      const dist = (320 / steps) * i;
      emitSwing('spear', p.cx + Math.cos(aim) * dist, p.cy + Math.sin(aim) * dist, aim, 1.1, 220);
      hits.push(
        new HitArea({
          x: p.cx + Math.cos(aim) * dist,
          y: p.cy + Math.sin(aim) * dist,
          radius: 50 * stats.attackRange,
          damage: dmg / steps,
          faction: 'player',
          life: 0.3,
          color: 'rgba(189,195,199,0.5)',
          knockback: 220,
        }),
      );
    }
  }
}

export class Bow implements Weapon {
  id = 'bow';
  name = '言灵弓';
  kind: WeaponKind = 'ranged';
  // Nerfed 2026-05-17: was 4 dmg @0.24s + ×3 pierce-5 special. Too dominant.
  spec: WeaponSpec = { baseDamage: 3, primaryCooldown: 0.32, specialCooldown: 5.5, reach: 700 };
  description = '远程片假名箭，攻速中等基础伤害低，靠堆远程加成';
  specialName = '穿透神箭';
  specialDesc = '射出穿透 3 个目标的高速箭，2.4 倍伤害';
  primaryTimer = 0;
  specialTimer = 0;

  primary(p: Player, aim: number, proj: Projectile[], _hits: HitArea[]) {
    if (this.primaryTimer > 0) return;
    this.primaryTimer = primaryInterval(this.spec);
    emitSwing('bow', p.cx + Math.cos(aim) * 40, p.cy + Math.sin(aim) * 40, aim, 0.6, 180);
    proj.push(
      new Projectile({
        x: p.cx,
        y: p.cy,
        vx: Math.cos(aim) * 820,
        vy: Math.sin(aim) * 820,
        damage: damageOf(this.spec, this.kind),
        faction: 'player',
        color: '#e74c3c',
      }),
    );
  }

  special(p: Player, aim: number, proj: Projectile[], _hits: HitArea[]) {
    if (this.specialTimer > 0) return;
    this.specialTimer = this.spec.specialCooldown;
    emitSwing('bow', p.cx + Math.cos(aim) * 50, p.cy + Math.sin(aim) * 50, aim, 1.4, 320);
    proj.push(
      new Projectile({
        x: p.cx,
        y: p.cy,
        vx: Math.cos(aim) * 1200,
        vy: Math.sin(aim) * 1200,
        damage: damageOf(this.spec, this.kind, 2.4),
        faction: 'player',
        radius: 14,
        pierce: 3,
        life: 1.2,
        color: '#f39c12',
      }),
    );
  }
}

export class Staff implements Weapon {
  id = 'staff';
  name = '冥府法杖';
  kind: WeaponKind = 'spell';
  spec: WeaponSpec = { baseDamage: 6, primaryCooldown: 0.5, specialCooldown: 6.0, reach: 600 };
  description = '慢速法弹，可穿过障碍';
  specialName = '净魂法阵';
  specialDesc = '瞄准地面落下 1.4s 持续法阵，每 0.15s 造成区域伤害';
  primaryTimer = 0;
  specialTimer = 0;
  /** Active circles {x,y,life,tickT}. */
  zones: { x: number; y: number; life: number; tickT: number }[] = [];

  primary(p: Player, aim: number, proj: Projectile[], _hits: HitArea[]) {
    if (this.primaryTimer > 0) return;
    this.primaryTimer = primaryInterval(this.spec);
    emitSwing('staff', p.cx + Math.cos(aim) * 60, p.cy + Math.sin(aim) * 60, aim, 0.95);
    proj.push(
      new Projectile({
        x: p.cx,
        y: p.cy,
        vx: Math.cos(aim) * 480,
        vy: Math.sin(aim) * 480,
        damage: damageOf(this.spec, this.kind),
        faction: 'player',
        radius: 12,
        life: 2.2,
        color: '#9b59b6',
      }),
    );
  }

  special(_p: Player, aim: number, _proj: Projectile[], _hits: HitArea[]) {
    if (this.specialTimer > 0) return;
    this.specialTimer = this.spec.specialCooldown;
    const tx = _p.cx + Math.cos(aim) * 240;
    const ty = _p.cy + Math.sin(aim) * 240 * (state.plane === ViewPlane.Vertical ? 0.5 : 1);
    emitSwing('staff', tx, ty, aim, 1.6, 480);
    this.zones.push({ x: tx, y: ty, life: 1.4, tickT: 0 });
  }

  tickZones(dt: number, hits: HitArea[]) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life -= dt;
      z.tickT -= dt;
      if (z.tickT <= 0) {
        z.tickT = 0.15;
        hits.push(
          new HitArea({
            x: z.x,
            y: z.y,
            radius: 120 * stats.attackRange,
            damage: damageOf(this.spec, this.kind, 0.55),
            faction: 'player',
            life: 0.12,
            color: 'rgba(155,89,182,0.42)',
          }),
        );
      }
      if (z.life <= 0) this.zones.splice(i, 1);
    }
  }

  drawZones(ctx: CanvasRenderingContext2D) {
    for (const z of this.zones) {
      ctx.save();
      ctx.globalAlpha = clamp(z.life / 1.4, 0, 1) * 0.4;
      ctx.fillStyle = '#9b59b6';
      ctx.beginPath();
      ctx.arc(z.x, z.y, 120 * stats.attackRange, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

export class Chakram implements Weapon {
  id = 'chakram';
  name = '回旋墨刃';
  kind: WeaponKind = 'ranged';
  spec: WeaponSpec = { baseDamage: 5, primaryCooldown: 0.7, specialCooldown: 5.0, reach: 420 };
  description = '投掷后返回，往返各造成伤害';
  specialName = '悬停切割';
  specialDesc = '将回旋刃悬停 1.2s，每 0.15s 切割一次';
  primaryTimer = 0;
  specialTimer = 0;

  primary(p: Player, aim: number, _proj: Projectile[], hits: HitArea[]) {
    if (this.primaryTimer > 0) return;
    this.primaryTimer = primaryInterval(this.spec);
    const dmg = damageOf(this.spec, this.kind);
    const steps = 4;
    emitSwing('chakram', p.cx + Math.cos(aim) * 80, p.cy + Math.sin(aim) * 80, aim, 1.0, 360);
    for (let i = 1; i <= steps; i++) {
      const dist = (this.spec.reach / steps) * i;
      hits.push(
        new HitArea({
          x: p.cx + Math.cos(aim) * dist,
          y: p.cy + Math.sin(aim) * dist,
          radius: 36 * stats.attackRange,
          damage: dmg * 0.6,
          faction: 'player',
          life: 0.18 + i * 0.04,
          color: 'rgba(52,152,219,0.45)',
        }),
      );
    }
  }

  special(p: Player, aim: number, _proj: Projectile[], hits: HitArea[]) {
    if (this.specialTimer > 0) return;
    this.specialTimer = this.spec.specialCooldown;
    const hx = p.cx + Math.cos(aim) * 240;
    const hy = p.cy + Math.sin(aim) * 240;
    const dmg = damageOf(this.spec, this.kind, 0.6);
    emitSwing('chakram', hx, hy, aim, 1.6, 600);
    for (let i = 0; i < 8; i++) {
      hits.push(
        new HitArea({
          x: hx,
          y: hy,
          radius: 90 * stats.attackRange,
          damage: dmg,
          faction: 'player',
          life: 0.15,
          color: 'rgba(52,152,219,0.4)',
        }),
      );
    }
  }
}

export class Bell implements Weapon {
  id = 'bell';
  name = '镇魂圣铃';
  kind: WeaponKind = 'spell';
  spec: WeaponSpec = { baseDamage: 5, primaryCooldown: 0.55, specialCooldown: 5.0, reach: 130 };
  description = '玩家中心环形音波';
  specialName = '圆环震荡';
  specialDesc = '以自身为中心释放扩张冲击波，半径从 30 扩张至 600，命中所有目标';
  primaryTimer = 0;
  specialTimer = 0;

  primary(p: Player, _aim: number, _proj: Projectile[], hits: HitArea[]) {
    if (this.primaryTimer > 0) return;
    this.primaryTimer = primaryInterval(this.spec);
    emitSwing('bell', p.cx, p.cy, 0, 1.0, 260);
    hits.push(
      new HitArea({
        x: p.cx,
        y: p.cy,
        radius: this.spec.reach * stats.attackRange,
        damage: damageOf(this.spec, this.kind) * state.bellMul,
        faction: 'player',
        life: 0.22,
        color: 'rgba(155,89,182,0.4)',
      }),
    );
  }

  special(p: Player, _aim: number, _proj: Projectile[], hits: HitArea[]) {
    if (this.specialTimer > 0) return;
    this.specialTimer = this.spec.specialCooldown;
    emitSwing('bell', p.cx, p.cy, 0, 2.4, 520);
    hits.push(
      new HitArea({
        x: p.cx,
        y: p.cy,
        radius: 30,
        damage: damageOf(this.spec, this.kind, 2.4) * state.bellMul,
        faction: 'player',
        life: 0.5,
        color: 'rgba(241,196,15,0.6)',
        expanding: 750,
        knockback: 320,
      }),
    );
  }
}

export const WEAPON_FACTORY: { [id: string]: () => Weapon } = {
  sword: () => new Sword(),
  spear: () => new Spear(),
  bow: () => new Bow(),
  staff: () => new Staff(),
  chakram: () => new Chakram(),
  bell: () => new Bell(),
};

export function makeAllWeapons(): Weapon[] {
  return Object.values(WEAPON_FACTORY).map((f) => f());
}

export function tickWeapon(w: Weapon, dt: number, hits: HitArea[]) {
  if (w.primaryTimer > 0) w.primaryTimer -= dt;
  if (w.specialTimer > 0) w.specialTimer -= dt;
  if (w instanceof Staff) w.tickZones(dt, hits);
}

export function gainOnHit(stigma: number) {
  if (!state.stigmaActive) gainStigma(stigma);
}
