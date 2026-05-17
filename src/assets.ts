import { SpriteSheet, loadImage } from './spritesheet';

const sheet = (path: string, cols: number, rows: number) => new SpriteSheet(`/assets/${path}`, cols, rows);
const image = (path: string) => loadImage(`/assets/${path}`);

/**
 * Central registry for sprite sheets and standalone images. Art model swaps PNGs
 * under public/assets/** and updates this file's paths; no game logic needs to change.
 *
 * Frame layouts come from public/assets/generated-art-manifest.json.
 */
export const sprites = {
  player: sheet('sprites/generated/player-noir-spritesheet.png', 4, 2),
  crab: sheet('sprites/generated/crab-yokai-spritesheet.png', 4, 2),
  claw: sheet('sprites/generated/claw-yokai-spritesheet.png', 4, 2),
  snake: sheet('sprites/generated/snake-yokai-spritesheet.png', 4, 2),
  effects: sheet('effects/generated/yokai-attack-effects-spritesheet.png', 4, 3),
};

export const bossSprites = {
  stagKing: sheet('sprites/generated/stagking-boss-spritesheet.png', 4, 2),
  chimeKeeper: sheet('sprites/generated/chimekeeper-boss-spritesheet.png', 4, 2),
  mourner: sheet('sprites/generated/mourner-boss-spritesheet.png', 4, 2),
  cathedra: sheet('sprites/generated/cathedra-boss-spritesheet.png', 4, 2),
};

export const weaponEffectSheets = {
  sword: sheet('effects/generated/weapon-sword-spritesheet.png', 4, 2),
  spear: sheet('effects/generated/weapon-spear-spritesheet.png', 4, 2),
  bow: sheet('effects/generated/weapon-bow-spritesheet.png', 4, 2),
  staff: sheet('effects/generated/weapon-staff-spritesheet.png', 4, 2),
  chakram: sheet('effects/generated/weapon-chakram-spritesheet.png', 4, 2),
  bell: sheet('effects/generated/weapon-bell-spritesheet.png', 4, 2),
};

export const foldEffects = {
  open: sheet('effects/fold-open-spritesheet.png', 4, 2),
  close: sheet('effects/fold-close-spritesheet.png', 4, 2),
};

/** Standalone obstacle / prop images. */
export const obstacleArt = {
  torii: image('obstacles/ruined-torii-shrine.png'),
  stump: image('obstacles/forest-stump.png'),
  stumpAlt: image('obstacles/forest-stump-2.png'),
  stumpSmall: image('obstacles/forest-stump-3.png'),
  floaterSlab: image('obstacles/clocktower-slab.png'),
  floaterPillar: image('obstacles/clocktower-pillar.png'),
  tombstone: image('obstacles/graveyard-stone.png'),
  tombstoneAlt: image('obstacles/graveyard-stone-2.png'),
  tombstoneSmall: image('obstacles/graveyard-stone-3.png'),
  chain: image('obstacles/cathedral-chain.png'),
};

export const backgroundArt = {
  memoryCity: image('backgrounds/bg-01-grey-city.png'),
  sunsetCity: image('backgrounds/bg-02-sunset-city.png'),
  noirCity: image('backgrounds/bg-03-noir-city.png'),
  cathedralVertical: image('backgrounds/bg-04-cathedral-vertical.png'),
  cathedralNoir: image('backgrounds/bg-04-cathedral-noir.png'),
  shopNight: image('backgrounds/bg-05-shop-night.png'),
};

/** Shop room decor: NPC sprite sheet (4×2 = idle/emote) + banner backdrop. */
export const shopArt = {
  shopkeeper: sheet('shop/shopkeeper-spritesheet.png', 4, 2),
  banner: image('shop/shop-banner.png'),
};

/** Resurrection-altar art + outcome FX sheets (each 4 cols × 1 row). */
export const resurrectArt = {
  altar: image('hud/resurrect-altar.png'),
  success: sheet('effects/resurrect-success-spritesheet.png', 4, 1),
  fail: sheet('effects/resurrect-fail-spritesheet.png', 4, 1),
  anchorFractured: image('hud/anchor-fractured.png'),
};

/** Shop货品图标 — 药水和符箓的专属图，替换早期临时复用的 items/ 图。 */
export const shopIcons = {
  bloodPotion: '/assets/potions/blood-potion.png',
  ninetailPill: '/assets/potions/ninetail-pill.png',
  buddhaBone: '/assets/charms/buddha-bone.png',
  windTalisman: '/assets/charms/wind-talisman.png',
  ironTalisman: '/assets/charms/iron-talisman.png',
  cinnabarTalisman: '/assets/charms/cinnabar-talisman.png',
  cloudTalisman: '/assets/charms/cloud-talisman.png',
  fortuneTalisman: '/assets/charms/fortune-talisman.png',
  ashTalisman: '/assets/charms/ash-talisman.png',
  longarmTalisman: '/assets/charms/longarm-talisman.png',
};

export const weaponIcons = {
  sword: image('weapons/sword.png'),
  spear: image('weapons/spear.png'),
  bow: image('weapons/bow.png'),
  staff: image('weapons/staff.png'),
  chakram: image('weapons/chakram.png'),
  bell: image('weapons/bell.png'),
};

export const itemIcons = {
  heavyArmor: image('items/heavy_armor.png'),
  swordScroll: image('items/sword_scroll.png'),
  farString: image('items/far_string.png'),
  burningNail: image('items/burning_nail.png'),
  brokenSigil: image('items/broken_sigil.png'),
  shadowShard: image('items/shadow_shard.png'),
  foldSheath: image('items/fold_sheath.png'),
  ashBell: image('items/ash_bell.png'),
  cursedPact: image('items/cursed_pact.png'),
  critTag: image('items/crit_tag.png'),
  shoes: image('items/shoes.png'),
  extraDash: image('items/extra_dash.png'),
  wideArm: image('items/wide_arm.png'),
  magnet: image('items/magnet.png'),
};

export const hudIcons = {
  heart: image('hud/heart.png'),
  xp: image('hud/xp.png'),
  area: image('hud/area.png'),
  boss: image('hud/boss.png'),
  money: image('hud/money.png'),
  risk: image('hud/risk.png'),
};

export const stigmaSnakeArt = {
  base: image('hud/stigma-snake-base.png'),
  mask: image('hud/stigma-snake-mask.png'),
  head: image('hud/stigma-snake-head.png'),
};

export const cardArt = {
  combat: image('cards/levelup-combat.png'),
  survive: image('cards/levelup-survive.png'),
  fold: image('cards/levelup-fold.png'),
  econ: image('cards/levelup-econ.png'),
};

export const treasureIcons = {
  relic: image('treasure/relic.png'),
  altarAnchor: image('treasure/altar_anchor.png'),
  fleshPact: image('treasure/flesh_pact.png'),
  stigmaOffering: image('treasure/stigma_offering.png'),
  burnPyre: image('treasure/burn_pyre.png'),
  curseBloom: image('treasure/curse_bloom.png'),
  bloodTrial: image('treasure/blood_trial.png'),
};
