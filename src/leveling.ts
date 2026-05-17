import { shuffle } from './math';
import { state, stats, type LevelUpOffer } from './state';

const ALL_OFFERS: LevelUpOffer[] = [
  {
    id: 'dmg',
    label: '+15% 伤害',
    desc: '所有伤害乘 1.15',
    group: 'combat',
    apply: () => {
      stats.damage *= 1.15;
    },
  },
  {
    id: 'melee',
    label: '+2 近战伤害',
    desc: '近战武器加成',
    group: 'combat',
    apply: () => {
      stats.meleeDamage += 2;
    },
  },
  {
    id: 'ranged',
    label: '+2 远程伤害',
    desc: '远程武器加成',
    group: 'combat',
    apply: () => {
      stats.rangedDamage += 2;
    },
  },
  {
    id: 'aspd',
    label: '+15% 攻速',
    desc: '攻击间隔缩短',
    group: 'combat',
    apply: () => {
      stats.attackSpeed *= 1.15;
    },
  },
  {
    id: 'crit',
    label: '+8% 暴击率',
    desc: '暴击 ×2 伤害',
    group: 'combat',
    apply: () => {
      stats.critChance += 0.08;
    },
  },
  {
    id: 'critmul',
    label: '+0.3 暴击倍率',
    desc: '暴击倍数提升',
    group: 'combat',
    apply: () => {
      stats.critMul += 0.3;
    },
  },
  {
    id: 'range',
    label: '+15% 攻击范围',
    desc: '近战/AOE 半径放大',
    group: 'combat',
    apply: () => {
      stats.attackRange *= 1.15;
    },
  },
  {
    id: 'armor',
    label: '+1 护甲',
    desc: '受到伤害 ×0.9',
    group: 'survive',
    apply: () => {
      stats.armor += 1;
    },
  },
  {
    id: 'maxhp',
    label: '+2 血量上限',
    desc: '同时回满',
    group: 'survive',
    apply: () => {
      stats.maxHp += 2;
    },
  },
  {
    id: 'regen',
    label: '+0.4/秒 回血',
    desc: '持续回复生命',
    group: 'survive',
    apply: () => {
      stats.regen += 0.4;
    },
  },
  {
    id: 'speed',
    label: '+10% 移动速度',
    desc: '走位更快',
    group: 'survive',
    apply: () => {
      stats.moveSpeed *= 1.1;
    },
  },
  {
    id: 'dodge',
    label: '+5% 闪避',
    desc: '完全闪过攻击',
    group: 'survive',
    apply: () => {
      stats.dodge = Math.min(0.6, stats.dodge + 0.05);
    },
  },
  {
    id: 'dash_cd',
    label: '-20% 冲刺冷却',
    desc: '更频繁的无敌帧',
    group: 'survive',
    apply: () => {
      stats.dashCdMul *= 0.8;
    },
  },
  {
    id: 'stigma',
    label: '+20% 圣痕获取',
    desc: '展开更频繁',
    group: 'fold',
    apply: () => {
      stats.stigmaGain *= 1.2;
    },
  },
  {
    id: 'money',
    label: '+20% 货币',
    desc: '掉落更丰厚',
    group: 'econ',
    apply: () => {
      stats.moneyMul *= 1.2;
    },
  },
  {
    id: 'xp',
    label: '+15% 经验',
    desc: '升级更快',
    group: 'econ',
    apply: () => {
      stats.xpMul *= 1.15;
    },
  },
];

export function rollLevelUpOffers(n = 3): LevelUpOffer[] {
  return shuffle(ALL_OFFERS).slice(0, n);
}

export function gainXp(amount: number): boolean {
  state.xp += amount * stats.xpMul;
  let leveled = false;
  while (state.xp >= state.xpForNext) {
    state.xp -= state.xpForNext;
    state.level += 1;
    // Steeper curve so mid-late levels can't snowball — pairs with enemy
    // area scaling so each region demands ~5-8 kills per level instead of 2-3.
    state.xpForNext = Math.floor(state.xpForNext * 1.45 + 5);
    leveled = true;
  }
  return leveled;
}
