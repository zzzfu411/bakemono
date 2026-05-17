import { resurrectArt } from './assets';
import { ALL_ITEMS } from './items';
import {
  AREA_NAMES,
  STAT_LABELS,
  bossRoomChance,
  state,
  stats,
  type Door,
  type ItemDef,
  type LevelUpOffer,
  type ShopEntry,
  type TreasureOption,
  type PlayerStats,
} from './state';
import { RoomType, ViewPlane } from './types';
import type { Weapon } from './weapon';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
  hp: $('ui-hp'),
  hpMax: $('ui-hp-max'),
  risk: $('ui-risk'),
  money: $('ui-money'),
  mode: $('ui-mode'),
  stigma: $('ui-stigma'),
  stigmaMask: document.getElementById('ui-stigma-mask') as HTMLElement | null,
  stigmaHead: document.getElementById('ui-stigma-head') as HTMLElement | null,
  weaponIcon: document.getElementById('ui-weapon-icon') as HTMLImageElement | null,
  weaponName: $('ui-weapon-name'),
  weaponKind: $('ui-weapon-kind'),
  weaponDps: $('ui-weapon-dps'),
  weaponDpsPrimary: $('ui-weapon-dps-primary'),
  weaponSpecial: $('ui-weapon-special'),
  weaponSpecialName: $('ui-weapon-special-name'),
  qcd: $('ui-qcd'),
  xp: $('ui-xp'),
  level: $('ui-level'),
  area: $('ui-area'),
  room: $('ui-room'),
  bossPct: $('ui-bosspct'),

  choice: $('choice-screen'),
  choiceTitle: $('choice-title'),
  choiceList: $('choice-list'),

  pauseScreen: $('pause-screen'),
  pauseStats: $('pause-stats'),
  pauseItems: $('pause-items'),

  death: $('death-screen'),
  deathDice: $('death-dice-result'),
  btnRestart: $('btn-restart'),
  btnWipe: $('btn-wipe'),

  banner: $('banner'),
};

export function setHandlers(handlers: {
  onResume: () => void;
  onQuit: () => void;
}) {
  $('btn-resume').onclick = handlers.onResume;
  $('btn-quit').onclick = handlers.onQuit;
}

let lastWeaponId = '';

export function updateHud(hp: number, weapon: Weapon) {
  els.hp.textContent = Math.ceil(hp).toString();
  els.hpMax.textContent = stats.maxHp.toString();
  els.money.textContent = state.money.toString();
  els.risk.textContent = (state.resurrectChance * 100).toFixed(0);

  // Swap anchor icon to its fractured variant when resurrection odds are dire.
  const riskIcon = document.getElementById('ui-risk-icon') as HTMLImageElement | null;
  if (riskIcon) {
    const targetSrc = state.resurrectChance < 0.3 ? '/assets/hud/anchor-fractured.png' : '/assets/hud/anchor.png';
    if (!riskIcon.src.endsWith(targetSrc)) riskIcon.src = targetSrc;
  }

  if (els.weaponIcon && weapon.id !== lastWeaponId) {
    els.weaponIcon.src = `/assets/weapons/${weapon.id}.png`;
    lastWeaponId = weapon.id;
  }

  els.weaponName.textContent = weapon.name;
  els.weaponKind.textContent = weapon.kind === 'melee' ? '近战' : weapon.kind === 'ranged' ? '远程' : '法术';
  const flat = weapon.kind === 'melee' ? stats.meleeDamage : stats.rangedDamage;
  const baseHit = (weapon.spec.baseDamage + flat) * stats.damage;
  const interval = weapon.spec.primaryCooldown / Math.max(0.3, stats.attackSpeed);
  const crit = 1 + stats.critChance * (stats.critMul - 1);
  const dps = (baseHit * crit) / interval;
  els.weaponDpsPrimary.textContent = `${baseHit.toFixed(1)} / ${interval.toFixed(2)}s`;
  els.weaponDps.textContent = dps.toFixed(1);
  els.weaponSpecial.textContent = weapon.specialDesc;
  els.weaponSpecialName.textContent = `Q · ${weapon.specialName}`;
  els.qcd.style.width = `${
    weapon.spec.specialCooldown > 0
      ? Math.max(0, 1 - weapon.specialTimer / weapon.spec.specialCooldown) * 100
      : 100
  }%`;

  els.level.textContent = state.level.toString();
  els.xp.style.width = `${(state.xp / state.xpForNext) * 100}%`;

  els.area.textContent = AREA_NAMES[state.areaIndex % AREA_NAMES.length] ?? '未知区域';
  els.room.textContent = `房间 ${state.roomsClearedThisArea + 1} / 10`;
  els.bossPct.textContent = `${Math.round(bossRoomChance(state.roomsClearedThisArea + 1) * 100)}%`;

  const pct = state.stigmaActive
    ? (state.stigmaDurationTimer / state.maxStigmaDuration) * 100
    : state.stigmaHeat;
  els.stigma.style.width = `${pct}%`;
  if (els.stigmaMask) els.stigmaMask.style.width = `${pct}%`;
  if (els.stigmaHead) els.stigmaHead.style.left = `calc(${pct}% - 24px)`;
  // Tint snake red while展开 active (countdown mode).
  if (els.stigmaMask) els.stigmaMask.classList.toggle('is-active', state.stigmaActive);

  els.mode.textContent = state.plane === ViewPlane.Vertical ? '纵平面（横版动作）' : '横平面（妖纹展开）';
  els.mode.classList.toggle('mode-horizontal', state.plane === ViewPlane.Horizontal);
}

export function showDoorChoice(doors: Door[], pick: (idx: number) => void) {
  els.choiceTitle.textContent = '选择下一个房间';
  els.choiceList.innerHTML = '';
  doors.forEach((d, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-card door';
    btn.innerHTML = `
      <div class="choice-card-title">${roomLabel(d.type)}</div>
      <div class="choice-card-desc">${d.reward}</div>
      <div class="choice-card-hint">按 ${i + 1}</div>`;
    btn.onclick = () => pick(i);
    els.choiceList.appendChild(btn);
  });
  els.choice.classList.remove('hidden');
}

export function showLevelUp(offers: LevelUpOffer[], pick: (idx: number) => void) {
  els.choiceTitle.textContent = '升级！三选一';
  els.choiceList.innerHTML = '';
  offers.forEach((o, i) => {
    const btn = document.createElement('button');
    btn.className = `choice-card levelup ${o.group}`;
    btn.style.backgroundImage = `linear-gradient(180deg, rgba(20,18,16,0.55), rgba(20,18,16,0.86)), url(/assets/cards/levelup-${o.group}.png)`;
    btn.innerHTML = `
      <div class="choice-card-tag">${groupLabel(o.group)}</div>
      <div class="choice-card-title">${o.label}</div>
      <div class="choice-card-desc">${o.desc}</div>
      <div class="choice-card-hint">按 ${i + 1}</div>`;
    btn.onclick = () => pick(i);
    els.choiceList.appendChild(btn);
  });
  els.choice.classList.remove('hidden');
}

export function showTreasure(options: TreasureOption[], pick: (idx: number) => void) {
  els.choiceTitle.textContent = '宝藏间 — 选择一项操作';
  els.choiceList.innerHTML = '';
  options.forEach((o, i) => {
    const btn = document.createElement('button');
    btn.className = `choice-card treasure ${o.enabled ? '' : 'disabled'}`;
    btn.disabled = !o.enabled;
    btn.innerHTML = `
      <img class="choice-card-icon" src="/assets/treasure/${o.id}.png" alt="" onerror="this.style.display='none'" />
      <div class="choice-card-title">${o.label}</div>
      <div class="choice-card-desc">${o.desc}</div>
      <div class="choice-card-hint">${o.enabled ? `按 ${i + 1}` : o.disabledReason ?? '不可用'}</div>`;
    btn.onclick = () => o.enabled && pick(i);
    els.choiceList.appendChild(btn);
  });
  els.choice.classList.remove('hidden');
}

export function showItemPick(items: ItemDef[], pick: (idx: number) => void) {
  els.choiceTitle.textContent = '拿走一件道具';
  els.choiceList.innerHTML = '';
  items.forEach((it, i) => {
    const btn = document.createElement('button');
    btn.className = `choice-card item rarity-${it.rarity}`;
    btn.innerHTML = `
      <img class="choice-card-icon" src="/assets/items/${it.id}.png" alt="" onerror="this.style.display='none'" />
      <div class="choice-card-tag">${rarityLabel(it.rarity)}</div>
      <div class="choice-card-title">${it.name}</div>
      <div class="choice-card-desc">${it.desc}</div>
      <div class="choice-card-hint">按 ${i + 1}</div>`;
    btn.onclick = () => pick(i);
    els.choiceList.appendChild(btn);
  });
  els.choice.classList.remove('hidden');
}

export function hideChoice() {
  els.choice.classList.add('hidden');
}

const shopEl = document.getElementById('shop-screen') as HTMLElement;
const shopGrid = document.getElementById('shop-grid') as HTMLElement;
const shopMoney = document.getElementById('shop-money') as HTMLElement;
const shopLeave = document.getElementById('shop-leave') as HTMLButtonElement;

let shopOnBuy: ((i: number) => void) | null = null;

export function showShop(entries: ShopEntry[], onBuy: (i: number) => void, onLeave: () => void) {
  shopOnBuy = onBuy;
  shopLeave.onclick = () => {
    shopOnBuy = null;
    onLeave();
  };
  refreshShop(entries);
  shopEl.classList.remove('hidden');
}

export function refreshShop(entries: ShopEntry[]) {
  shopMoney.textContent = state.money.toString();
  shopGrid.innerHTML = '';
  entries.forEach((e, idx) => {
    const afford = state.money >= e.price && !e.sold;
    const btn = document.createElement('button');
    btn.className = `shop-card kind-${e.kind} ${e.sold ? 'sold' : afford ? 'afford' : 'no-money'}`;
    btn.disabled = e.sold;
    btn.innerHTML = `
      <img class="shop-card-icon" src="${e.iconUrl}" alt="" onerror="this.style.display='none'" />
      <div class="shop-card-title">${e.name}</div>
      <div class="shop-card-desc">${e.desc}</div>
      <div class="shop-card-price">
        <img class="shop-coin" src="/assets/hud/coin.png" alt="" />
        <b>${e.price}</b>
        ${e.sold ? '<span class="sold-tag">已售罄</span>' : afford ? `<span class="key-tag">按 ${idx + 1}</span>` : '<span class="no-money-tag">货币不足</span>'}
      </div>`;
    btn.onclick = () => {
      if (e.sold || !afford) return;
      shopOnBuy?.(idx);
    };
    shopGrid.appendChild(btn);
  });
}

export function hideShop() {
  shopEl.classList.add('hidden');
  shopOnBuy = null;
}

export function showPause() {
  els.pauseScreen.classList.remove('hidden');
  renderStatsPanel();
  renderInventory();
}

export function hidePause() {
  els.pauseScreen.classList.add('hidden');
}

function renderStatsPanel() {
  const groups: Record<string, { label: string; value: string }[]> = {
    combat: [],
    survive: [],
    fold: [],
    econ: [],
  };
  for (const k of Object.keys(STAT_LABELS) as (keyof PlayerStats)[]) {
    const meta = STAT_LABELS[k];
    groups[meta.group].push({ label: meta.label, value: meta.fmt(stats[k] as number) });
  }
  const sections = [
    { id: 'combat', title: '战斗' },
    { id: 'survive', title: '生存' },
    { id: 'fold', title: '折维' },
    { id: 'econ', title: '经济' },
  ];
  const html = sections
    .map(
      (sec) => `
      <div class="stat-group">
        <h3>${sec.title}</h3>
        <table>${groups[sec.id]
          .map((row) => `<tr><td>${row.label}</td><td>${row.value}</td></tr>`)
          .join('')}</table>
      </div>`,
    )
    .join('');
  els.pauseStats.innerHTML = `
    <div class="stat-summary">血量 ${Math.ceil((state as any)._curHp ?? 0)} / ${stats.maxHp} ·
      Lv ${state.level} · 货币 ${state.money} · 原地重生 ${(state.resurrectChance * 100).toFixed(0)}%</div>
    <div class="stat-grid">${html}</div>`;
}

function renderInventory() {
  if (state.ownedItems.length === 0) {
    els.pauseItems.innerHTML = '<div class="inv-empty">尚未携带道具</div>';
    return;
  }
  els.pauseItems.innerHTML = state.ownedItems
    .map((id) => {
      const def = ALL_ITEMS.find((i) => i.id === id);
      if (!def) return '';
      return `<div class="inv-item rarity-${def.rarity}">
        <img class="inv-item-icon" src="/assets/items/${def.id}.png" alt="" onerror="this.style.display='none'" />
        <div class="inv-item-text"><b>${def.name}</b><span>${def.desc}</span></div>
      </div>`;
    })
    .join('');
}

export function showBanner(text: string, durationMs = 1800) {
  els.banner.textContent = text;
  els.banner.classList.remove('hidden');
  els.banner.classList.remove('fade-out');
  void els.banner.offsetWidth;
  setTimeout(() => els.banner.classList.add('fade-out'), durationMs - 400);
  setTimeout(() => els.banner.classList.add('hidden'), durationMs);
}

/**
 * Player HP hit 0 — roll for in-place resurrection. The dice rolls visually,
 * then auto-resolves: success → onResurrect (continue same room with full HP),
 * failure → onGameOver (reset run + stats). No button click required.
 */
export function showResurrectRoll(
  judge: (roll: number) => 'resurrect' | 'gameover',
  onResurrect: () => void,
  onGameOver: () => void,
) {
  els.death.classList.remove('hidden');
  // Hide legacy buttons — modal auto-resolves now.
  els.btnRestart.classList.add('hidden');
  els.btnWipe.classList.add('hidden');
  $('death-title').textContent = '原地重生判定';
  $('death-subtitle').textContent = '坐标锚正在缝合你的影身轮廓...';
  const rolling = setInterval(() => {
    const r = Math.random();
    els.deathDice.textContent = `${(r * 100).toFixed(2)}%`;
    els.deathDice.style.color = r < state.resurrectChance ? '#2ecc71' : '#e74c3c';
  }, 50);
  setTimeout(() => {
    clearInterval(rolling);
    const finalRoll = Math.random();
    const outcome = judge(finalRoll);
    els.deathDice.textContent = `判定 ${(finalRoll * 100).toFixed(2)}% （重生线 ${(
      state.resurrectChance * 100
    ).toFixed(0)}%）`;
    if (outcome === 'resurrect') {
      els.deathDice.style.color = '#2ecc71';
      els.deathDice.textContent += ' — 原地重生';
      playResurrectFx('success');
    } else {
      els.deathDice.style.color = '#e74c3c';
      els.deathDice.textContent += ' — 复生失败';
      playResurrectFx('fail');
    }
    setTimeout(() => {
      hideDeath();
      if (outcome === 'resurrect') onResurrect();
      else onGameOver();
    }, 1400);
  }, 1500);
}

/** Play the 4-frame success/fail spritesheet on the canvas overlay above the altar. */
function playResurrectFx(kind: 'success' | 'fail') {
  const cv = document.getElementById('resurrect-fx') as HTMLCanvasElement | null;
  if (!cv) return;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const sheet = kind === 'success' ? resurrectArt.success : resurrectArt.fail;
  cv.classList.add('playing');
  let frame = 0;
  const totalFrames = 4;
  ctx.clearRect(0, 0, cv.width, cv.height);
  const tick = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    sheet.drawFrame(ctx, frame, 0, 0, cv.width, cv.height);
    frame += 1;
    if (frame < totalFrames) {
      window.setTimeout(tick, 110);
    } else {
      // Hold final frame briefly then fade out via class removal on hideDeath.
      window.setTimeout(() => ctx.clearRect(0, 0, cv.width, cv.height), 600);
    }
  };
  tick();
}

export function hideDeath() {
  els.death.classList.add('hidden');
  const cv = document.getElementById('resurrect-fx') as HTMLCanvasElement | null;
  cv?.classList.remove('playing');
  if (cv) cv.getContext('2d')?.clearRect(0, 0, cv.width, cv.height);
}

function roomLabel(t: RoomType): string {
  switch (t) {
    case RoomType.Monster:
      return '怪物间';
    case RoomType.Treasure:
      return '宝藏间';
    case RoomType.Chest:
      return '宝箱间';
    case RoomType.Shop:
      return '商店 · 余墨堂';
    case RoomType.Boss:
      return 'Boss 间 ☠';
    default:
      return '未知';
  }
}

function rarityLabel(r: 'common' | 'rare' | 'epic' | 'cursed'): string {
  return r === 'common' ? '普通' : r === 'rare' ? '稀有' : r === 'epic' ? '史诗' : '诅咒';
}

function groupLabel(g: 'combat' | 'survive' | 'fold' | 'econ'): string {
  return g === 'combat' ? '战斗' : g === 'survive' ? '生存' : g === 'fold' ? '折维' : '经济';
}

/** Allow game.ts to publish current HP into the pause panel summary. */
export function reportCurHp(hp: number) {
  (state as any)._curHp = hp;
}
