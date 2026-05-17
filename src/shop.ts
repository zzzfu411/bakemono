import { shopIcons } from './assets';
import { ALL_ITEMS, rollItemOffers } from './items';
import { shuffle } from './math';
import { state, stats, type ItemDef, type ShopEntry } from './state';

/**
 * Shop generates 6 slots per visit. Always:
 *   - 1× HP potion (cheap heal)
 *   - 1× resurrection charm (玲珑佛骨)
 *   - 2× random items (priced by rarity)
 *   - 2× random utility charms (atk speed / armor / crit / pickup / etc.)
 *
 * Items already owned are excluded. Already-sold entries grey out in UI.
 */

const RARITY_PRICE: Record<ItemDef['rarity'], number> = {
  common: 10,
  rare: 18,
  epic: 32,
  cursed: 22,
};

function entryFromItem(it: ItemDef, applyOnPick: (i: ItemDef) => void): ShopEntry {
  return {
    id: `item:${it.id}`,
    name: it.name,
    desc: it.desc,
    price: RARITY_PRICE[it.rarity],
    kind: 'item',
    sold: false,
    iconUrl: `/assets/items/${it.id}.png`,
    buy: () => {
      applyOnPick(it);
    },
  };
}

function makeCharmPool(): ShopEntry[] {
  const pool: ShopEntry[] = [];
  pool.push({
    id: 'charm:atkspd',
    name: '迅风符',
    desc: '攻击速度 +8%',
    price: 14,
    kind: 'charm',
    sold: false,
    iconUrl: shopIcons.windTalisman,
    buy: () => {
      stats.attackSpeed *= 1.08;
    },
  });
  pool.push({
    id: 'charm:armor',
    name: '玄铁符',
    desc: '护甲 +1',
    price: 12,
    kind: 'charm',
    sold: false,
    iconUrl: shopIcons.ironTalisman,
    buy: () => {
      stats.armor += 1;
    },
  });
  pool.push({
    id: 'charm:crit',
    name: '朱砂符',
    desc: '暴击率 +5%',
    price: 16,
    kind: 'charm',
    sold: false,
    iconUrl: shopIcons.cinnabarTalisman,
    buy: () => {
      stats.critChance += 0.05;
    },
  });
  pool.push({
    id: 'charm:speed',
    name: '云息符',
    desc: '移动速度 +12%',
    price: 10,
    kind: 'charm',
    sold: false,
    iconUrl: shopIcons.cloudTalisman,
    buy: () => {
      stats.moveSpeed *= 1.12;
    },
  });
  pool.push({
    id: 'charm:money',
    name: '招财符',
    desc: '货币加成 +15%、拾取范围 +30',
    price: 14,
    kind: 'charm',
    sold: false,
    iconUrl: shopIcons.fortuneTalisman,
    buy: () => {
      stats.moneyMul *= 1.15;
      stats.pickupRange += 30;
    },
  });
  pool.push({
    id: 'charm:stigma',
    name: '焚墨符',
    desc: '圣痕获取 +20%',
    price: 14,
    kind: 'charm',
    sold: false,
    iconUrl: shopIcons.ashTalisman,
    buy: () => {
      stats.stigmaGain *= 1.2;
    },
  });
  pool.push({
    id: 'charm:range',
    name: '长臂符',
    desc: '攻击范围 +15%',
    price: 14,
    kind: 'charm',
    sold: false,
    iconUrl: shopIcons.longarmTalisman,
    buy: () => {
      stats.attackRange *= 1.15;
    },
  });
  return pool;
}

function makePotionSlot(curHpRef: { hp: number }, heal: (n: number) => void): ShopEntry {
  return {
    id: 'potion:hp',
    name: '血墨药水',
    desc: '立刻恢复 5 点血量',
    price: 8,
    kind: 'potion',
    sold: false,
    iconUrl: shopIcons.bloodPotion,
    buy: () => {
      heal(5);
      void curHpRef;
    },
  };
}

function makeResurrectCharm(): ShopEntry {
  return {
    id: 'charm:resurrect',
    name: '玲珑佛骨',
    desc: '原地重生概率 +5%',
    price: 18,
    kind: 'anchor',
    sold: false,
    iconUrl: shopIcons.buddhaBone,
    buy: () => {
      state.resurrectChance = Math.min(0.99, state.resurrectChance + 0.05);
    },
  };
}

function makeMaxHpCharm(): ShopEntry {
  return {
    id: 'charm:maxhp',
    name: '九尾药丸',
    desc: '血量上限 +1 并回满',
    price: 20,
    kind: 'potion',
    sold: false,
    iconUrl: shopIcons.ninetailPill,
    buy: () => {
      stats.maxHp += 1;
    },
  };
}

export interface ShopRefs {
  applyOnPick: (item: ItemDef) => void;
  healPlayer: (n: number) => void;
  curHp: () => number;
}

export function buildShopInventory(refs: ShopRefs): ShopEntry[] {
  const entries: ShopEntry[] = [];
  // Always-on slots.
  entries.push(makePotionSlot({ hp: refs.curHp() }, refs.healPlayer));
  entries.push(makeResurrectCharm());
  entries.push(makeMaxHpCharm());

  // 2 random items (from un-owned pool).
  const offered = rollItemOffers(2);
  for (const it of offered) entries.push(entryFromItem(it, refs.applyOnPick));
  // Pad with another random un-owned item if we got fewer than 2 (small pool).
  if (offered.length < 2) {
    const remaining = ALL_ITEMS.filter((i) => !state.ownedItems.includes(i.id) && !offered.includes(i));
    if (remaining.length > 0) entries.push(entryFromItem(remaining[0], refs.applyOnPick));
  }

  // 2 random utility charms.
  const charms = shuffle(makeCharmPool()).slice(0, 2);
  for (const c of charms) entries.push(c);

  return entries;
}
