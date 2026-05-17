import { foldEffects, sprites, weaponEffectSheets } from './assets';
import { clamp } from './math';

export type EffectKind =
  | 'crabGuard'
  | 'clawSlash'
  | 'poison'
  | 'foldOpen'
  | 'foldClose'
  | 'sparks'
  | 'weaponSwing';

export type WeaponEffectId = keyof typeof weaponEffectSheets;

export class Effect {
  kind: EffectKind;
  x: number;
  y: number;
  life: number;
  duration: number;
  scale: number;
  facing: number;
  /** Weapon id for 'weaponSwing' kind. */
  weaponId: WeaponEffectId | null = null;
  /** Optional rotation in radians for weapon FX. */
  rotation = 0;

  constructor(kind: EffectKind, x: number, y: number, duration: number, scale: number, facing: number) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.life = duration;
    this.duration = duration;
    this.scale = scale;
    this.facing = facing;
  }

  static weaponSwing(weaponId: WeaponEffectId, x: number, y: number, rotation: number, scale = 1, durationMs = 280) {
    const e = new Effect('weaponSwing', x, y, durationMs / 1000, scale, rotation >= -Math.PI / 2 && rotation <= Math.PI / 2 ? 1 : -1);
    e.weaponId = weaponId;
    e.rotation = rotation;
    return e;
  }

  static foldOpen(centerX: number, centerY: number) {
    return new Effect('foldOpen', centerX, centerY, 0.85, 1, 1);
  }
  static foldClose(centerX: number, centerY: number) {
    return new Effect('foldClose', centerX, centerY, 0.7, 1, 1);
  }

  update(dt: number) {
    this.life -= dt;
  }

  draw(target: CanvasRenderingContext2D) {
    if (this.kind === 'weaponSwing' && this.weaponId) {
      this.drawWeaponSwing(target);
      return;
    }
    if (this.kind === 'foldOpen' || this.kind === 'foldClose') {
      this.drawFold(target);
      return;
    }

    const row = this.kind === 'crabGuard' ? 0 : this.kind === 'clawSlash' ? 1 : 2;
    const progress = clamp(1 - this.life / this.duration, 0, 0.999);
    const frame = row * 4 + Math.floor(progress * 4);
    const width = (this.kind === 'poison' ? 120 : 142) * this.scale;
    const height = (this.kind === 'poison' ? 110 : 132) * this.scale;
    const alpha = clamp(this.life / this.duration + 0.25, 0, 1);
    const drew = sprites.effects.drawFrame(
      target,
      frame,
      this.x - width / 2,
      this.y - height / 2,
      width,
      height,
      this.facing < 0,
      alpha,
    );
    if (!drew) {
      target.save();
      target.globalAlpha = alpha * 0.6;
      target.fillStyle = this.kind === 'poison' ? '#93f241' : this.kind === 'clawSlash' ? '#f5f5f5' : '#f1c40f';
      target.beginPath();
      target.arc(this.x, this.y, Math.max(width, height) / 3, 0, Math.PI * 2);
      target.fill();
      target.restore();
    }
  }

  private drawWeaponSwing(target: CanvasRenderingContext2D) {
    const sheet = weaponEffectSheets[this.weaponId!];
    const progress = clamp(1 - this.life / this.duration, 0, 0.999);
    // 4 cols × 2 rows = 8 frames; play through all 8.
    const frame = Math.floor(progress * 8);
    const size = 220 * this.scale;
    const alpha = clamp(this.life / this.duration + 0.2, 0, 1);
    target.save();
    target.translate(this.x, this.y);
    target.rotate(this.rotation);
    const drew = sheet.drawFrame(target, frame, -size / 2, -size / 2, size, size, false, alpha);
    target.restore();
    if (!drew) {
      // No fallback — weapon effects are decorative.
    }
  }

  private drawFold(target: CanvasRenderingContext2D) {
    const sheet = this.kind === 'foldOpen' ? foldEffects.open : foldEffects.close;
    const progress = clamp(1 - this.life / this.duration, 0, 0.999);
    const frame = Math.floor(progress * 8);
    // Full-screen — use ctx canvas dimensions.
    const w = target.canvas.width;
    const h = target.canvas.height;
    const drew = sheet.drawFrame(target, frame, 0, 0, w, h, false, 1);
    if (!drew) {
      // Fallback radial wipe.
      target.save();
      const r = (this.kind === 'foldOpen' ? progress : 1 - progress) * Math.hypot(w, h);
      const grad = target.createRadialGradient(this.x, this.y, r * 0.7, this.x, this.y, r);
      grad.addColorStop(0, 'rgba(231,76,60,0)');
      grad.addColorStop(1, 'rgba(15,9,8,0.85)');
      target.fillStyle = grad;
      target.fillRect(0, 0, w, h);
      target.restore();
    }
  }
}
