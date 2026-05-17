import { shopArt } from './assets';
import { Effect } from './effect';
import { endFrame, initInput, onKey } from './input';
import { aabb } from './math';
import { rollLevelUpOffers, gainXp } from './leveling';
import { Player, FLOOR_OFFSET } from './player';
import { EnemyProjectile, HitArea, Projectile } from './projectile';
import { buildRoom, rollNextDoors, type Room } from './room';
import {
  AREA_NAMES,
  gainStigma,
  resetRun,
  state,
  stats,
  wipeSave,
  type ItemDef,
} from './state';
import { buildShopInventory } from './shop';
import { buildTreasureOptions } from './treasure';
import * as ui from './ui';
import { RoomType, ViewPlane } from './types';
import { bindWeaponFxSink, makeAllWeapons, Staff, type Weapon } from './weapon';

/** Per-area BG asset paths. Loaded as plain URLs; the actual <img> swap is via DOM. */
const AREA_BACKGROUNDS = [
  { vertical: '/assets/backgrounds/bg-01-grey-city.png', horizontal: '/assets/backgrounds/bg-03-noir-city.png' },
  { vertical: '/assets/backgrounds/bg-02-sunset-city.png', horizontal: '/assets/backgrounds/bg-03-noir-city.png' },
  { vertical: '/assets/backgrounds/bg-01-grey-city.png', horizontal: '/assets/backgrounds/bg-03-noir-city.png' },
  { vertical: '/assets/backgrounds/bg-04-cathedral-vertical.png', horizontal: '/assets/backgrounds/bg-04-cathedral-noir.png' },
];

const SHOP_BACKGROUND = {
  vertical: '/assets/backgrounds/bg-05-shop-night.png',
  horizontal: '/assets/backgrounds/bg-05-shop-night.png',
};

let lastAreaIndex = -1;
/** Tracks whether DOM bg is currently in shop mode so we revert on leave. */
let bgInShopMode = false;

function applyAreaBackground(idx: number) {
  if (idx === lastAreaIndex && !bgInShopMode) return;
  lastAreaIndex = idx;
  bgInShopMode = false;
  const pair = AREA_BACKGROUNDS[idx] ?? AREA_BACKGROUNDS[0];
  swapBackgrounds(pair.vertical, pair.horizontal);
}

function applyShopBackground() {
  bgInShopMode = true;
  swapBackgrounds(SHOP_BACKGROUND.vertical, SHOP_BACKGROUND.horizontal);
}

function swapBackgrounds(vertical: string, horizontal: string) {
  const v = document.querySelector<HTMLImageElement>('#bg-vertical img');
  const h = document.querySelector<HTMLImageElement>('#bg-horizontal img');
  if (v && v.src !== location.origin + vertical) v.src = vertical;
  if (h && h.src !== location.origin + horizontal) h.src = horizontal;
}

interface Refs {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

const projectiles: Projectile[] = [];
const enemyProjectiles: EnemyProjectile[] = [];
const bossProjectiles: Projectile[] = [];
const hits: HitArea[] = [];
const effects: Effect[] = [];

let player!: Player;
let room!: Room;
let refs!: Refs;
let lastTime = 0;
let pendingLevelUps = 0;

let weapons: Weapon[] = makeAllWeapons();
let weaponIdx = 0;

export function startGame(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  refs = { canvas, ctx };
  initInput(canvas);
  bindWeaponFxSink(effects);

  ui.setHandlers({
    onResume: togglePause,
    onQuit: () => {
      togglePause();
      killPlayer();
    },
  });

  onKey((k) => {
    if (state.gameOver) return;
    if (state.pendingChoice) {
      // Shop has up to 6 slots; other menus 3.
      const maxSlot = state.pendingChoice.kind === 'shop' ? 6 : 3;
      const n = Number(k);
      if (!isNaN(n) && n >= 1 && n <= maxSlot) handleChoice(n - 1);
      // Esc in shop = leave shop.
      if (k === 'escape' && state.pendingChoice.kind === 'shop') {
        state.pendingChoice = null;
        ui.hideShop();
        showDoors();
      }
      return;
    }
    if (k === 'escape') togglePause();
    if (state.paused) return;
    if (k === 'e') togglePlane();
    if (k === 'r') cycleWeapon();
  });

  player = new Player(canvas.width, canvas.height);
  player.setWeapon(weapons[weaponIdx]);
  startRun();
  requestAnimationFrame((ts) => {
    lastTime = ts;
    loop(ts);
  });
}

function startRun() {
  applyAreaBackground(state.areaIndex);
  room = buildRoom(RoomType.Monster, refs.canvas.width, refs.canvas.height, state.areaIndex);
  ui.showBanner(`${AREA_NAMES[state.areaIndex]} — 第 ${state.roomsClearedThisArea + 1} 房`);
}

function loop(ts: number) {
  const dt = Math.min(0.05, (ts - lastTime) / 1000);
  lastTime = ts;
  if (!state.paused && !state.gameOver && !state.pendingChoice) update(dt);
  draw();
  ui.reportCurHp(player.hp);
  ui.updateHud(player.hp, player.weapon);
  updateStageMotion();
  endFrame();
  requestAnimationFrame(loop);
}

function update(dt: number) {
  const obstacleRects = room.obstacles.map((o) => o.rect);
  player.update(dt, refs.canvas.width, refs.canvas.height, obstacleRects, projectiles, hits);

  // Stigma timer + auto collapse handled separately when triggered by takeDamage.
  if (state.stigmaActive) {
    state.stigmaDurationTimer -= dt;
    if (state.stigmaDurationTimer <= 0) collapsePlane(false);
  }
  // Detect collapse-on-hit (player.takeDamage doesn't have scene refs).
  if (state.stigmaActive && player.iFrames > 0 && player.flashTimer > 0 && state.stigmaDurationTimer > 0) {
    // Player got hit during stigma; collapse.
    collapsePlane(false);
  }

  // Enemies.
  const spawnCtx = {
    player,
    effects,
    enemyProjectiles,
    bossProjectiles,
    canvasW: refs.canvas.width,
    canvasH: refs.canvas.height,
  };
  for (let i = room.enemies.length - 1; i >= 0; i--) {
    const e = room.enemies[i];
    e.update(dt, spawnCtx);
    if ('attackTimer' in e && (e as any).attackTimer > 0) continue;
    // Snake doesn't do contact damage in original logic.
    if (e.kind === 'snake') continue;
    if (aabb(e.rect, player.rect)) {
      player.takeDamage(e.contactDamage);
      const dx = Math.sign(player.cx - e.cx) || 1;
      player.vx = dx * 320;
      player.vy = -180;
    }
  }

  // Player projectiles.
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.update(dt);
    let dead = p.life <= 0;
    if (!dead && state.plane === ViewPlane.Horizontal) {
      for (const obs of room.obstacles) {
        if (aabb(p.rect, obs.rect)) {
          dead = true;
          break;
        }
      }
    }
    if (!dead && p.faction === 'player') {
      for (let j = room.enemies.length - 1; j >= 0; j--) {
        const e = room.enemies[j];
        if (aabb(p.rect, e.rect)) {
          e.takeDamage(p.damage);
          gainStigma(5);
          if (p.pierce <= 0) dead = true;
          else p.pierce -= 1;
          checkKill(j);
          break;
        }
      }
    }
    if (dead) projectiles.splice(i, 1);
  }

  // Boss radial projectiles.
  for (let i = bossProjectiles.length - 1; i >= 0; i--) {
    const p = bossProjectiles[i];
    p.update(dt);
    if (p.life <= 0) {
      bossProjectiles.splice(i, 1);
      continue;
    }
    if (aabb(p.rect, player.rect)) {
      player.takeDamage(p.damage);
      bossProjectiles.splice(i, 1);
    }
  }

  // Enemy projectiles.
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const ep = enemyProjectiles[i];
    ep.update(dt);
    if (aabb(ep.rect, player.rect)) {
      player.takeDamage(ep.damage);
      effects.push(new Effect('poison', ep.x, ep.y, 0.45, 0.9, 1));
      enemyProjectiles.splice(i, 1);
      continue;
    }
    if (
      ep.life <= 0 ||
      ep.x < -80 ||
      ep.x > refs.canvas.width + 80 ||
      ep.y < -80 ||
      ep.y > refs.canvas.height + 80
    ) {
      enemyProjectiles.splice(i, 1);
    }
  }

  // Hit areas (sword, bell, special skills).
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    h.update(dt);
    if (h.faction === 'player') {
      for (let j = room.enemies.length - 1; j >= 0; j--) {
        const e = room.enemies[j];
        if (h.hitSet.has(e)) continue;
        const dx = e.cx - h.x;
        const dy = e.cy - h.y;
        if (dx * dx + dy * dy <= h.radius * h.radius) {
          e.takeDamage(h.damage);
          h.hitSet.add(e);
          gainStigma(4);
          if (h.knockback > 0) {
            const len = Math.hypot(dx, dy) || 1;
            e.vx = (dx / len) * h.knockback;
            e.vy = (dy / len) * h.knockback;
          }
          checkKill(j);
        }
      }
    }
    if (h.life <= 0) hits.splice(i, 1);
  }

  // Effects.
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].update(dt);
    if (effects[i].life <= 0) effects.splice(i, 1);
  }

  // Death.
  if (player.hp <= 0) {
    killPlayer();
    return;
  }

  if (!room.cleared && room.enemies.length === 0) onRoomCleared();
}

function checkKill(idx: number) {
  const e = room.enemies[idx];
  if (!e || e.hp > 0) return;
  state.money += Math.round(e.rewardMoney * stats.moneyMul);
  const leveled = gainXp(e.rewardXp);
  if (leveled) pendingLevelUps += 1;
  gainStigma(8);
  if (e.isBoss) state.bossKilled = true;
  room.enemies.splice(idx, 1);
}

function onRoomCleared() {
  room.cleared = true;
  if (room.type === RoomType.Chest) {
    state.money += 15;
    ui.showBanner('+15 货币');
  }
  if (pendingLevelUps > 0) {
    queueLevelUp();
    return;
  }
  postCleanupTransition();
}

function postCleanupTransition() {
  if (room.type === RoomType.Boss) {
    state.areaIndex += 1;
    state.roomsClearedThisArea = 0;
    state.bossKilled = false;
    if (state.areaIndex >= AREA_NAMES.length) {
      ui.showBanner('通关！替换封印达成', 4000);
      state.areaIndex = 0;
    }
    applyAreaBackground(state.areaIndex);
    ui.showBanner(`进入 ${AREA_NAMES[state.areaIndex]}`, 2500);
    showDoors();
    return;
  }
  state.roomsClearedThisArea += 1;
  if (room.type === RoomType.Treasure) {
    const opts = buildTreasureOptions({
      applyOnPick: applyItem,
      healPlayer: (n) => {
        player.hp = Math.min(stats.maxHp, player.hp + n);
      },
      hurtPlayer: (n) => {
        player.hp = Math.max(1, player.hp - n);
      },
      curHp: () => player.hp,
    });
    state.pendingChoice = { kind: 'treasure', options: opts };
    ui.showTreasure(opts, handleTreasurePick);
    return;
  }
  if (room.type === RoomType.Shop) {
    openShop();
    return;
  }
  showDoors();
}

function openShop() {
  const entries = buildShopInventory({
    applyOnPick: applyItem,
    healPlayer: (n) => {
      player.hp = Math.min(stats.maxHp, player.hp + n);
    },
    curHp: () => player.hp,
  });
  state.pendingChoice = { kind: 'shop', entries };
  ui.showShop(entries, handleShopBuy, () => {
    state.pendingChoice = null;
    ui.hideShop();
    showDoors();
  });
}

function handleShopBuy(i: number) {
  const c = state.pendingChoice;
  if (!c || c.kind !== 'shop') return;
  const entry = c.entries[i];
  if (!entry || entry.sold || state.money < entry.price) return;
  state.money -= entry.price;
  entry.buy();
  entry.sold = true;
  // If it was a player-stat upgrade that affects maxHp, top off HP.
  if (entry.id === 'charm:maxhp') player.hp = stats.maxHp;
  ui.refreshShop(c.entries);
}

function handleTreasurePick(i: number) {
  const c = state.pendingChoice;
  if (!c || c.kind !== 'treasure') return;
  const opt = c.options[i];
  if (!opt || !opt.enabled) return;
  const result = opt.resolve();
  if (result === 'done') {
    ui.showBanner(opt.label, 1400);
    state.pendingChoice = null;
    ui.hideChoice();
    showDoors();
  } else {
    state.pendingChoice = { kind: 'item-pick', items: result.items };
    ui.showItemPick(result.items, (idx) => {
      const def = result.items[idx];
      applyItem(def);
      state.pendingChoice = null;
      ui.hideChoice();
      showDoors();
    });
  }
}

function applyItem(item: ItemDef) {
  item.apply();
  state.ownedItems.push(item.id);
  state.ownedItemNames.push(item.name);
  if (item.id === 'shadow_shard') player.hp = stats.maxHp;
}

function queueLevelUp() {
  const offers = rollLevelUpOffers();
  state.pendingChoice = { kind: 'levelup', offers };
  ui.showLevelUp(offers, (i) => {
    offers[i].apply();
    if (offers[i].id === 'maxhp') player.hp = stats.maxHp;
    pendingLevelUps -= 1;
    state.pendingChoice = null;
    ui.hideChoice();
    if (pendingLevelUps > 0) queueLevelUp();
    else postCleanupTransition();
  });
}

function showDoors() {
  const doors = rollNextDoors();
  state.pendingChoice = { kind: 'door', doors };
  ui.showDoorChoice(doors, (i) => enterRoom(doors[i].type));
}

function enterRoom(type: RoomType) {
  state.pendingChoice = null;
  ui.hideChoice();
  room = buildRoom(type, refs.canvas.width, refs.canvas.height, state.areaIndex);
  projectiles.length = 0;
  enemyProjectiles.length = 0;
  bossProjectiles.length = 0;
  hits.length = 0;
  effects.length = 0;
  // Spawn at the map center — horizontal axis always centered; vertical depends
  // on the current plane (stand on the floor in 纵 mode, dead-center in 横 mode).
  player.x = refs.canvas.width / 2 - player.width / 2;
  player.y =
    state.plane === ViewPlane.Horizontal
      ? refs.canvas.height / 2 - player.height / 2
      : refs.canvas.height - FLOOR_OFFSET - player.height;
  player.vx = 0;
  player.vy = 0;
  if (type === RoomType.Shop) applyShopBackground();
  else if (bgInShopMode) applyAreaBackground(state.areaIndex);
  const label =
    type === RoomType.Boss
      ? `Boss — ${AREA_NAMES[state.areaIndex]} 守门者`
      : type === RoomType.Shop
        ? `余墨堂 · 用金币换符箓与药水`
        : `${AREA_NAMES[state.areaIndex]} — 第 ${state.roomsClearedThisArea + 1} 房`;
  ui.showBanner(label);
}

function handleChoice(i: number) {
  const c = state.pendingChoice;
  if (!c) return;
  if (c.kind === 'door' && c.doors[i]) {
    enterRoom(c.doors[i].type);
  } else if (c.kind === 'levelup' && c.offers[i]) {
    c.offers[i].apply();
    if (c.offers[i].id === 'maxhp') player.hp = stats.maxHp;
    pendingLevelUps -= 1;
    state.pendingChoice = null;
    ui.hideChoice();
    if (pendingLevelUps > 0) queueLevelUp();
    else postCleanupTransition();
  } else if (c.kind === 'treasure') {
    handleTreasurePick(i);
  } else if (c.kind === 'shop') {
    handleShopBuy(i);
  } else if (c.kind === 'item-pick' && c.items[i]) {
    applyItem(c.items[i]);
    state.pendingChoice = null;
    ui.hideChoice();
    showDoors();
  }
}

function togglePlane() {
  const stage = document.getElementById('stage');
  const bgV = document.getElementById('bg-vertical');
  const bgH = document.getElementById('bg-horizontal');
  if (state.plane === ViewPlane.Vertical) {
    if (state.stigmaHeat < state.maxStigmaHeat) return;
    state.plane = ViewPlane.Horizontal;
    state.stigmaActive = true;
    state.stigmaDurationTimer = state.maxStigmaDuration;
    state.stigmaHeat = 0;
    state.resurrectChance = Math.max(0.05, state.resurrectChance - 0.01);
    bgV?.classList.remove('is-active');
    bgH?.classList.add('is-active');
    if (stage) stage.dataset.current = 'noir';
    effects.push(Effect.foldOpen(refs.canvas.width / 2, refs.canvas.height / 2));
    ui.showBanner('妖纹展开！', 1200);
  } else {
    collapsePlane(true);
  }
}

function collapsePlane(refundHeat: boolean) {
  if (state.plane !== ViewPlane.Horizontal) return;
  const stage = document.getElementById('stage');
  const bgV = document.getElementById('bg-vertical');
  const bgH = document.getElementById('bg-horizontal');
  const remaining = state.stigmaDurationTimer / state.maxStigmaDuration;
  state.plane = ViewPlane.Vertical;
  state.stigmaActive = false;
  bgH?.classList.remove('is-active');
  bgV?.classList.add('is-active');
  if (stage) stage.dataset.current = 'memory';
  effects.push(Effect.foldClose(refs.canvas.width / 2, refs.canvas.height / 2));
  if (refundHeat && remaining > 0) {
    state.stigmaHeat = remaining * state.maxStigmaHeat * state.foldSheathRefund;
  }
  state.stigmaDurationTimer = 0;
}

function cycleWeapon() {
  weaponIdx = (weaponIdx + 1) % weapons.length;
  player.setWeapon(weapons[weaponIdx]);
  ui.showBanner(`武器：${weapons[weaponIdx].name}`, 1200);
}

function togglePause() {
  if (state.gameOver) return;
  state.paused = !state.paused;
  if (state.paused) ui.showPause();
  else ui.hidePause();
}

function killPlayer() {
  if (state.gameOver) return;
  state.gameOver = true;
  ui.showResurrectRoll(
    (roll) => (roll < state.resurrectChance ? 'resurrect' : 'gameover'),
    () => onResurrect(),
    () => onGameOver(),
  );
}

function onResurrect() {
  // Restore HP to full and continue in the same room.
  state.gameOver = false;
  player.hp = stats.maxHp;
  player.iFrames = 1.0;
  player.flashTimer = 0.3;
  // Push the player away from any immediate enemy contact for a moment.
  player.x = Math.min(refs.canvas.width - 100, Math.max(60, player.x));
  player.y = refs.canvas.height - FLOOR_OFFSET - 200;
  player.vx = 0;
  player.vy = 0;
  // Small resurrection cost: -2% future chance (so it can't be infinite).
  state.resurrectChance = Math.max(0.05, state.resurrectChance - 0.02);
  ui.showBanner('原地重生！', 1600);
}

function onGameOver() {
  // No save wipe — just reset the run + stats to baseline.
  wipeSave();
  resetRun();
  weapons = makeAllWeapons();
  weaponIdx = 0;
  player = new Player(refs.canvas.width, refs.canvas.height);
  player.setWeapon(weapons[weaponIdx]);
  projectiles.length = 0;
  enemyProjectiles.length = 0;
  bossProjectiles.length = 0;
  hits.length = 0;
  effects.length = 0;
  pendingLevelUps = 0;
  document.getElementById('bg-horizontal')?.classList.remove('is-active');
  document.getElementById('bg-vertical')?.classList.add('is-active');
  const stage = document.getElementById('stage');
  if (stage) stage.dataset.current = 'memory';
  lastAreaIndex = -1; // force BG re-apply
  startRun();
}

/** Render shop-room decor: top banner image + animated shopkeeper sprite. */
function drawShopDecor(ctx: CanvasRenderingContext2D) {
  const canvasW = refs.canvas.width;
  const canvasH = refs.canvas.height;
  // Banner across the top center.
  if (shopArt.banner.isReady()) {
    const bw = Math.min(640, canvasW * 0.5);
    const bh = bw * (220 / 640);
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(shopArt.banner.image, canvasW / 2 - bw / 2, 40, bw, bh);
    ctx.restore();
  }
  // Shopkeeper centered, slightly above the floor — animated idle cycle (row 0).
  const t = performance.now() / 1000;
  const frame = Math.floor(t * 4) % 4; // 4 idle frames at 4 fps
  const w = 220;
  const h = 220;
  const x = canvasW / 2 - w / 2;
  const y = canvasH - FLOOR_OFFSET - h - 10;
  shopArt.shopkeeper.drawFrame(ctx, frame, x, y, w, h);
}

function updateStageMotion() {
  const stage = document.getElementById('stage');
  if (!stage) return;
  const panX = (player.cx / Math.max(1, refs.canvas.width) - 0.5) * -30;
  const panY =
    state.plane === ViewPlane.Horizontal ? (player.cy / Math.max(1, refs.canvas.height) - 0.5) * -20 : -4;
  stage.style.setProperty('--pan-x', `${panX.toFixed(2)}px`);
  stage.style.setProperty('--pan-y', `${panY.toFixed(2)}px`);
}

function draw() {
  const { ctx, canvas } = refs;
  ctx.save();
  if (player && player.shake > 0) ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ground line for vertical plane.
  if (state.plane === ViewPlane.Vertical) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, canvas.height - FLOOR_OFFSET, canvas.width, FLOOR_OFFSET);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - FLOOR_OFFSET);
    ctx.lineTo(canvas.width, canvas.height - FLOOR_OFFSET);
    ctx.stroke();
  }

  room.obstacles.forEach((o) => o.draw(ctx));
  if (room.type === RoomType.Shop) drawShopDecor(ctx);
  effects.filter((e) => e.kind === 'crabGuard').forEach((e) => e.draw(ctx));
  enemyProjectiles.forEach((p) => p.draw(ctx));
  bossProjectiles.forEach((p) => p.draw(ctx));
  hits.forEach((h) => h.draw(ctx));
  room.enemies.forEach((e) => e.draw(ctx));
  player.draw(ctx);
  // Player weapon zones (Staff drops AOE circles)
  if (player.weapon instanceof Staff) player.weapon.drawZones(ctx);
  projectiles.forEach((p) => p.draw(ctx));
  effects
    .filter((e) => e.kind !== 'crabGuard' && e.kind !== 'foldOpen' && e.kind !== 'foldClose')
    .forEach((e) => e.draw(ctx));

  if (state.stigmaActive) {
    ctx.strokeStyle = 'rgba(52,152,219,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }
  }

  // Damage flash overlay.
  if (player.iFrames > 0.4) {
    ctx.fillStyle = `rgba(231,76,60,${Math.max(0, player.iFrames - 0.4) * 0.6})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // Full-screen plane transition (drawn last, above everything).
  effects.filter((e) => e.kind === 'foldOpen' || e.kind === 'foldClose').forEach((e) => e.draw(ctx));
  ctx.restore();
}
