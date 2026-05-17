import { ViewPlane, RoomType } from './types';

export interface PlayerStats {
  /** Global damage multiplier; 1.0 = 100%. */
  damage: number;
  /** Flat melee damage bonus. */
  meleeDamage: number;
  /** Flat ranged damage bonus. */
  rangedDamage: number;
  /** Attack speed multiplier; weapon cooldowns divide by this. */
  attackSpeed: number;
  /** Crit roll chance [0,1]. */
  critChance: number;
  /** Crit multiplier; default 2.0. */
  critMul: number;
  /** Each point of armor multiplies incoming damage by 0.9. */
  armor: number;
  /** Dodge chance — full miss when roll succeeds. */
  dodge: number;
  /** Max HP. */
  maxHp: number;
  /** HP regen per second. */
  regen: number;
  /** Movement speed multiplier on top of base WASD speed. */
  moveSpeed: number;
  /** Dash charges (default 2). */
  dashCharges: number;
  /** Dash cooldown multiplier (lower = faster). */
  dashCdMul: number;
  /** Stigma heat gain multiplier. */
  stigmaGain: number;
  /** Currency drop multiplier. */
  moneyMul: number;
  /** XP gain multiplier. */
  xpMul: number;
  /** Pickup magnet radius in pixels. */
  pickupRange: number;
  /** Multiplier for melee/AOE radius. */
  attackRange: number;
}

export interface LevelUpOffer {
  id: string;
  label: string;
  desc: string;
  group: 'combat' | 'survive' | 'fold' | 'econ';
  apply: () => void;
}

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  rarity: 'common' | 'rare' | 'epic' | 'cursed';
  tags?: string[];
  apply: () => void;
}

export interface Door {
  type: RoomType;
  reward: string;
}

export const AREA_NAMES = ['巨木薄林', '失重钟楼', '灰海墓原', '教会圣城'];

export interface PendingDoor {
  kind: 'door';
  doors: Door[];
}
export interface PendingLevelUp {
  kind: 'levelup';
  offers: LevelUpOffer[];
}
export interface PendingTreasure {
  kind: 'treasure';
  options: TreasureOption[];
}
export interface PendingShop {
  kind: 'shop';
  entries: ShopEntry[];
}

export interface ShopEntry {
  id: string;
  name: string;
  desc: string;
  price: number;
  /** Visual category — drives icon path + card color. */
  kind: 'item' | 'potion' | 'charm' | 'anchor';
  /** When true the entry has been bought and should grey out / not re-fire. */
  sold: boolean;
  /** Asset path for the card icon. */
  iconUrl: string;
  /** Run on click; mutates state directly. */
  buy: () => void;
}

export interface TreasureOption {
  id: string;
  label: string;
  desc: string;
  enabled: boolean;
  disabledReason?: string;
  /** Some options resolve immediately; others open a sub-pick (e.g. item three-choose-one). */
  resolve: () => 'done' | { kind: 'item-pick'; items: ItemDef[] };
}

export const state = {
  plane: ViewPlane.Vertical as ViewPlane,

  stigmaHeat: 0,
  stigmaActive: false,
  stigmaDurationTimer: 0,
  maxStigmaDuration: 20,
  maxStigmaHeat: 100,

  /** Probability of in-place resurrection when HP reaches 0. Starts low
   *  (most deaths are final) — players raise it with anchors / 玲珑佛骨 / 圣徽. */
  resurrectChance: 0.3,

  money: 0,
  xp: 0,
  level: 1,
  xpForNext: 10,

  roomIndex: 0,
  areaIndex: 0,
  roomsClearedThisArea: 0,
  bossKilled: false,

  ownedItems: [] as string[],
  ownedItemNames: [] as string[],

  pendingChoice: null as
    | PendingDoor
    | PendingLevelUp
    | PendingTreasure
    | PendingShop
    | { kind: 'item-pick'; items: ItemDef[] }
    | null,

  paused: false,
  gameOver: false,

  /** Item flags read by other systems. */
  foldSheathRefund: 0.5,
  bellMul: 1,
};

export const stats: PlayerStats = makeBaseStats();

export function makeBaseStats(): PlayerStats {
  return {
    damage: 1.0,
    meleeDamage: 5,
    rangedDamage: 5,
    attackSpeed: 1.0,
    critChance: 0.05,
    critMul: 2.0,
    armor: 0,
    dodge: 0,
    maxHp: 10,
    regen: 0,
    moveSpeed: 1.0,
    dashCharges: 2,
    dashCdMul: 1.0,
    stigmaGain: 1.0,
    moneyMul: 1.0,
    xpMul: 1.0,
    pickupRange: 70,
    attackRange: 1.0,
  };
}

export function resetStats() {
  Object.assign(stats, makeBaseStats());
}

export function resetRun() {
  state.plane = ViewPlane.Vertical;
  state.stigmaHeat = 0;
  state.stigmaActive = false;
  state.stigmaDurationTimer = 0;
  state.money = 0;
  state.xp = 0;
  state.level = 1;
  state.xpForNext = 10;
  state.roomIndex = 0;
  state.areaIndex = 0;
  state.roomsClearedThisArea = 0;
  state.bossKilled = false;
  state.ownedItems = [];
  state.ownedItemNames = [];
  state.pendingChoice = null;
  state.paused = false;
  state.gameOver = false;
  state.foldSheathRefund = 0.5;
  state.bellMul = 1;
}

export function wipeSave() {
  state.resurrectChance = 0.3;
  resetStats();
}

export function takenDamage(raw: number): number {
  return raw * Math.pow(0.9, stats.armor);
}

export function rollCrit(): number {
  return Math.random() < stats.critChance ? stats.critMul : 1;
}

export function gainStigma(amount: number) {
  state.stigmaHeat = Math.min(state.maxStigmaHeat, state.stigmaHeat + amount * stats.stigmaGain);
}

export function bossRoomChance(roomsCleared: number): number {
  if (roomsCleared < 2) return 0;
  const table: Record<number, number> = { 2: 0.08, 3: 0.12, 4: 0.16, 5: 0.2, 6: 0.25, 7: 0.3 };
  if (roomsCleared >= 8) return 1 / 3;
  return table[roomsCleared] ?? 0;
}

/**
 * Enemy growth curve. Two axes that compose multiplicatively:
 *
 *  1. AREA_SCALE — fixed per region, encodes the intended threat tier of
 *     巨木薄林 → 失重钟楼 → 灰海墓原 → 教会圣城.
 *  2. Per-level rubber-band — once the player has out-scaled the baseline (Lv>5),
 *     enemies get a small HP/dmg bump so a leveled run can't speed-clear early areas.
 *
 * Bosses share the same shape but use smaller multipliers — they already differ
 * by area via dedicated classes (StagKing/ChimeKeeper/Mourner/Cathedra), so we
 * only need light per-level scaling on top to keep late-game bosses dangerous.
 */
const AREA_SCALE = [
  { hp: 1.0, dmg: 1.0, speed: 1.0, reward: 1.0 },
  { hp: 1.35, dmg: 1.15, speed: 1.1, reward: 1.2 },
  { hp: 1.8, dmg: 1.35, speed: 1.2, reward: 1.45 },
  { hp: 2.4, dmg: 1.55, speed: 1.3, reward: 1.75 },
];

export interface EnemyScale {
  hpMul: number;
  dmgMul: number;
  speedMul: number;
  rewardMul: number;
}

export function enemyScaling(areaIndex: number, playerLevel: number, isBoss = false): EnemyScale {
  const idx = Math.max(0, Math.min(AREA_SCALE.length - 1, areaIndex));
  const area = AREA_SCALE[idx];
  const levelOver = Math.max(0, playerLevel - 5);
  if (isBoss) {
    // Bosses already encode area threat per-class. Only level-scale on top.
    const lvHp = 1 + Math.min(0.5, levelOver * 0.04);
    const lvDmg = 1 + Math.min(0.3, levelOver * 0.02);
    return { hpMul: lvHp, dmgMul: lvDmg, speedMul: 1, rewardMul: area.reward };
  }
  const lvHp = 1 + Math.min(0.75, levelOver * 0.05);
  const lvDmg = 1 + Math.min(0.45, levelOver * 0.03);
  return {
    hpMul: area.hp * lvHp,
    dmgMul: area.dmg * lvDmg,
    speedMul: area.speed,
    rewardMul: area.reward,
  };
}

export const STAT_LABELS: Record<keyof PlayerStats, { label: string; group: 'combat' | 'survive' | 'fold' | 'econ'; fmt: (v: number) => string }> = {
  damage: { label: '伤害倍率', group: 'combat', fmt: (v) => `×${v.toFixed(2)}` },
  meleeDamage: { label: '近战伤害', group: 'combat', fmt: (v) => `+${v.toFixed(0)}` },
  rangedDamage: { label: '远程伤害', group: 'combat', fmt: (v) => `+${v.toFixed(0)}` },
  attackSpeed: { label: '攻击速度', group: 'combat', fmt: (v) => `×${v.toFixed(2)}` },
  critChance: { label: '暴击率', group: 'combat', fmt: (v) => `${(v * 100).toFixed(1)}%` },
  critMul: { label: '暴击倍率', group: 'combat', fmt: (v) => `×${v.toFixed(2)}` },
  attackRange: { label: '攻击范围', group: 'combat', fmt: (v) => `×${v.toFixed(2)}` },
  armor: { label: '护甲', group: 'survive', fmt: (v) => `${v.toFixed(0)} (-${((1 - Math.pow(0.9, v)) * 100).toFixed(0)}%)` },
  dodge: { label: '闪避率', group: 'survive', fmt: (v) => `${(v * 100).toFixed(1)}%` },
  maxHp: { label: '血量上限', group: 'survive', fmt: (v) => `${v.toFixed(0)}` },
  regen: { label: '回血/秒', group: 'survive', fmt: (v) => `+${v.toFixed(1)}` },
  moveSpeed: { label: '移动速度', group: 'survive', fmt: (v) => `×${v.toFixed(2)}` },
  dashCharges: { label: '冲刺次数', group: 'survive', fmt: (v) => `${v.toFixed(0)}` },
  dashCdMul: { label: '冲刺冷却', group: 'survive', fmt: (v) => `×${v.toFixed(2)}` },
  stigmaGain: { label: '圣痕获取', group: 'fold', fmt: (v) => `×${v.toFixed(2)}` },
  pickupRange: { label: '拾取范围', group: 'econ', fmt: (v) => `${v.toFixed(0)}px` },
  moneyMul: { label: '货币加成', group: 'econ', fmt: (v) => `×${v.toFixed(2)}` },
  xpMul: { label: '经验加成', group: 'econ', fmt: (v) => `×${v.toFixed(2)}` },
};
