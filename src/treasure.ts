import { rollItemOffers } from './items';
import { shuffle } from './math';
import { state, stats, type ItemDef, type TreasureOption } from './state';

/**
 * Treasure rooms now offer a *menu of operations* — not just "pick a relic."
 * Each room rolls 3 distinct slots from this pool so each visit feels different
 * and matches the 设定.md treasure / altar concept.
 */
export interface PlayerRefs {
  applyOnPick: (item: ItemDef) => void;
  healPlayer: (amount: number) => void;
  hurtPlayer: (amount: number) => void;
  curHp: () => number;
}

export function buildTreasureOptions(refs: PlayerRefs): TreasureOption[] {
  const all: TreasureOption[] = [
    {
      id: 'relic',
      label: '拾取道具（三选一）',
      desc: '在三件随机道具中选择一件带走',
      enabled: true,
      resolve: () => ({ kind: 'item-pick', items: rollItemOffers(3) }),
    },
    {
      id: 'altar_anchor',
      label: '灵魂锚定（献 12 货币）',
      desc: '原地重生概率 +4%',
      enabled: state.money >= 12,
      disabledReason: '货币不足 12',
      resolve: () => {
        state.money -= 12;
        state.resurrectChance = Math.min(0.99, state.resurrectChance + 0.04);
        return 'done';
      },
    },
    {
      id: 'flesh_pact',
      label: '血肉契约（献 2 血上限）',
      desc: '血量上限 -2，伤害 ×1.20，攻速 ×1.10',
      enabled: stats.maxHp > 4,
      disabledReason: '血上限不足',
      resolve: () => {
        stats.maxHp = Math.max(2, stats.maxHp - 2);
        stats.damage *= 1.2;
        stats.attackSpeed *= 1.1;
        refs.healPlayer(0);
        return 'done';
      },
    },
    {
      id: 'stigma_offering',
      label: '圣痕祭礼（献 10 货币）',
      desc: '圣痕热度立即填满，圣痕获取 ×1.15',
      enabled: state.money >= 10,
      disabledReason: '货币不足 10',
      resolve: () => {
        state.money -= 10;
        state.stigmaHeat = state.maxStigmaHeat;
        stats.stigmaGain *= 1.15;
        return 'done';
      },
    },
    {
      id: 'burn_pyre',
      label: '焚毁拒绝',
      desc: '放弃此宝藏，立即恢复 4 点生命 + 10 货币',
      enabled: true,
      resolve: () => {
        refs.healPlayer(4);
        state.money += 10;
        return 'done';
      },
    },
    {
      id: 'curse_bloom',
      label: '诅咒花开',
      desc: '随机获得一项永久增益（暴击/攻速/伤害），但原地重生 -5%',
      enabled: true,
      resolve: () => {
        state.resurrectChance = Math.max(0.05, state.resurrectChance - 0.05);
        // Random small buff
        const r = Math.random();
        if (r < 0.34) stats.critChance += 0.08;
        else if (r < 0.67) stats.attackSpeed *= 1.15;
        else stats.damage *= 1.15;
        return 'done';
      },
    },
    {
      id: 'blood_trial',
      label: '血之试炼',
      desc: '损失当前生命 30%，获得永久 +2 近战 / +2 远程',
      enabled: refs.curHp() >= 4,
      disabledReason: '当前生命过低',
      resolve: () => {
        const cur = refs.curHp();
        refs.hurtPlayer(Math.ceil(cur * 0.3));
        stats.meleeDamage += 2;
        stats.rangedDamage += 2;
        return 'done';
      },
    },
  ];
  // 3 random slots, "relic" always included.
  const relic = all.find((o) => o.id === 'relic')!;
  const others = shuffle(all.filter((o) => o.id !== 'relic')).slice(0, 2);
  return [relic, ...others];
}
