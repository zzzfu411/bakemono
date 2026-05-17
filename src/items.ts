import { state, stats, type ItemDef } from './state';

export const ALL_ITEMS: ItemDef[] = [
  {
    id: 'heavy_armor',
    name: '重甲',
    desc: '护甲 +2',
    rarity: 'common',
    tags: ['survive'],
    apply: () => {
      stats.armor += 2;
    },
  },
  {
    id: 'sword_scroll',
    name: '剑术残页',
    desc: '近战伤害 +3',
    rarity: 'common',
    tags: ['melee'],
    apply: () => {
      stats.meleeDamage += 3;
    },
  },
  {
    id: 'far_string',
    name: '远弦',
    desc: '远程伤害 +3',
    rarity: 'common',
    tags: ['ranged'],
    apply: () => {
      stats.rangedDamage += 3;
    },
  },
  {
    id: 'burning_nail',
    name: '灼热骨钉',
    desc: '圣痕获取 +25%',
    rarity: 'rare',
    tags: ['fold'],
    apply: () => {
      stats.stigmaGain *= 1.25;
    },
  },
  {
    id: 'broken_sigil',
    name: '破碎圣徽',
    desc: '原地重生概率 +3%',
    rarity: 'rare',
    tags: ['anchor'],
    apply: () => {
      state.resurrectChance = Math.min(0.99, state.resurrectChance + 0.03);
    },
  },
  {
    id: 'shadow_shard',
    name: '影身残片',
    desc: '血量上限 +2，回满',
    rarity: 'common',
    tags: ['survive'],
    apply: () => {
      stats.maxHp += 2;
    },
  },
  {
    id: 'fold_sheath',
    name: '折页刀鞘',
    desc: '主动结束展开返还 100% 热度',
    rarity: 'rare',
    tags: ['fold'],
    apply: () => {
      state.foldSheathRefund = 1.0;
    },
  },
  {
    id: 'ash_bell',
    name: '灰铃碎片',
    desc: '法术 / 圣铃伤害 +25%',
    rarity: 'rare',
    tags: ['spell'],
    apply: () => {
      state.bellMul *= 1.25;
    },
  },
  {
    id: 'cursed_pact',
    name: '裂痕之力',
    desc: '伤害 +25%，原地重生 -3%',
    rarity: 'cursed',
    tags: ['offense'],
    apply: () => {
      stats.damage *= 1.25;
      state.resurrectChance = Math.max(0.05, state.resurrectChance - 0.03);
    },
  },
  {
    id: 'crit_tag',
    name: '言灵铭札',
    desc: '暴击率 +10%',
    rarity: 'rare',
    tags: ['offense'],
    apply: () => {
      stats.critChance += 0.1;
    },
  },
  {
    id: 'shoes',
    name: '云隐草鞋',
    desc: '移动 +15%，闪避 +5%',
    rarity: 'common',
    tags: ['survive'],
    apply: () => {
      stats.moveSpeed *= 1.15;
      stats.dodge += 0.05;
    },
  },
  {
    id: 'extra_dash',
    name: '风牢符',
    desc: '冲刺次数 +1',
    rarity: 'epic',
    tags: ['survive'],
    apply: () => {
      stats.dashCharges += 1;
    },
  },
  {
    id: 'wide_arm',
    name: '长臂咒',
    desc: '攻击范围 +20%',
    rarity: 'rare',
    tags: ['offense'],
    apply: () => {
      stats.attackRange *= 1.2;
    },
  },
  {
    id: 'magnet',
    name: '余墨磁石',
    desc: '拾取范围 +60，货币 +15%',
    rarity: 'common',
    tags: ['econ'],
    apply: () => {
      stats.pickupRange += 60;
      stats.moneyMul *= 1.15;
    },
  },
];

export function rollItemOffers(n = 3): ItemDef[] {
  const pool = ALL_ITEMS.filter((i) => !state.ownedItems.includes(i.id));
  const copy = pool.slice();
  const result: ItemDef[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}
