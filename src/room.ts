import {
  CathedraBoss,
  ChimeKeeperBoss,
  ClawYokai,
  CrabYokai,
  Enemy,
  MournerBoss,
  SnakeYokai,
  StagKingBoss,
} from './enemy';
import { generateObstacles, generateTreasureRoom } from './obstacle-layouts';
import { Obstacle } from './obstacle';
import { pick, randInt } from './math';
import { bossRoomChance, enemyScaling, state, type Door, type EnemyScale } from './state';
import { FLOOR_OFFSET } from './player';
import { RoomType } from './types';

/** Apply area × level scaling to a freshly-spawned enemy. */
function scaleEnemy(e: Enemy, scale: EnemyScale) {
  e.hp = Math.max(1, Math.round(e.hp * scale.hpMul));
  e.maxHp = e.hp;
  e.contactDamage = Math.max(1, Math.round(e.contactDamage * scale.dmgMul));
  e.speed *= scale.speedMul;
  e.rewardMoney = Math.max(1, Math.round(e.rewardMoney * scale.rewardMul));
  e.rewardXp = Math.max(1, Math.round(e.rewardXp * scale.rewardMul));
}

export interface Room {
  type: RoomType;
  obstacles: Obstacle[];
  enemies: Enemy[];
  cleared: boolean;
  reward?: string;
}

export function buildRoom(type: RoomType, canvasW: number, canvasH: number, areaIndex: number): Room {
  if (type === RoomType.Treasure) {
    // cleared: false so the next update tick fires onRoomCleared() and opens
    // the treasure menu — otherwise the player is stranded in an empty room.
    return {
      type,
      obstacles: generateTreasureRoom(canvasW, canvasH),
      enemies: [],
      cleared: false,
      reward: '宝藏：可执行多项操作',
    };
  }

  if (type === RoomType.Shop) {
    return {
      type,
      obstacles: generateTreasureRoom(canvasW, canvasH),
      enemies: [],
      cleared: false,
      reward: '商店：用金币购买',
    };
  }

  const obstacles = generateObstacles(areaIndex, type === RoomType.Boss, canvasW, canvasH);

  if (type === RoomType.Boss) {
    const bx = canvasW / 2 - 70;
    const by = canvasH - FLOOR_OFFSET - 220;
    let boss: Enemy;
    switch (areaIndex) {
      case 1:
        boss = new ChimeKeeperBoss(bx, by);
        break;
      case 2:
        boss = new MournerBoss(bx, by);
        break;
      case 3:
        boss = new CathedraBoss(bx, by);
        break;
      default:
        boss = new StagKingBoss(bx, by);
    }
    scaleEnemy(boss, enemyScaling(areaIndex, state.level, true));
    return {
      type,
      obstacles,
      enemies: [boss],
      cleared: false,
      reward: 'Boss 奖励 + 进入下一区域',
    };
  }
  if (type === RoomType.Chest) {
    return {
      type,
      obstacles,
      enemies: spawnChestGuards(canvasW, canvasH, areaIndex),
      cleared: false,
      reward: '货币 +15',
    };
  }
  return {
    type,
    obstacles,
    enemies: spawnMonsterPack(canvasW, canvasH, areaIndex),
    cleared: false,
    reward: '货币 + 经验',
  };
}

function spawnMonsterPack(w: number, h: number, areaIndex: number): Enemy[] {
  const list: Enemy[] = [];
  // Slightly larger packs in deeper areas (3/4/5/6).
  const baseCount = 3 + Math.min(3, areaIndex);
  // Weighted pool — snake is now ~50% (2/4 slots) for stronger ranged pressure.
  const kinds: Array<'crab' | 'claw' | 'snake'> = ['claw', 'crab', 'snake', 'snake'];
  for (let i = 0; i < baseCount; i++) {
    const kind = pick(kinds);
    const ex = i % 2 === 0 ? randInt(80, 280) : randInt(w - 280, w - 140);
    const ey = h - FLOOR_OFFSET - randInt(70, 90);
    list.push(spawn(kind, ex, ey));
  }
  if (Math.random() < 0.5 + 0.1 * areaIndex) list.push(new CrabYokai(w / 2 - 38, h - FLOOR_OFFSET - 60));
  // Guaranteed extra snake from area 1 onward; ~70% chance in area 0.
  if (areaIndex >= 1 || Math.random() < 0.7) {
    list.push(new SnakeYokai(w - 200, h - FLOOR_OFFSET - 100));
  }
  // Bonus second snake at deeper areas to keep pressure scaling.
  if (areaIndex >= 2 && Math.random() < 0.5) {
    list.push(new SnakeYokai(randInt(200, w - 200), h - FLOOR_OFFSET - 110));
  }
  const scale = enemyScaling(areaIndex, state.level);
  for (const e of list) scaleEnemy(e, scale);
  return list;
}

function spawnChestGuards(w: number, h: number, areaIndex: number): Enemy[] {
  const list: Enemy[] = [
    new CrabYokai(w / 2 - 38, h - FLOOR_OFFSET - 60),
    new ClawYokai(180, h - FLOOR_OFFSET - 70),
    new ClawYokai(w - 220, h - FLOOR_OFFSET - 70),
  ];
  // Chest guards are tougher — they're a paywall for the +15 bonus.
  const scale = enemyScaling(areaIndex, state.level);
  const guardBuff: EnemyScale = {
    hpMul: scale.hpMul * 1.2,
    dmgMul: scale.dmgMul,
    speedMul: scale.speedMul,
    rewardMul: scale.rewardMul,
  };
  for (const e of list) scaleEnemy(e, guardBuff);
  return list;
}

function spawn(kind: 'crab' | 'claw' | 'snake', x: number, y: number): Enemy {
  if (kind === 'crab') return new CrabYokai(x, y);
  if (kind === 'claw') return new ClawYokai(x, y);
  return new SnakeYokai(x, y);
}

export function rollNextDoors(): Door[] {
  const total = state.roomsClearedThisArea + 1;
  const bossChance = bossRoomChance(total);
  const forceBoss = total >= 9;

  const slots = forceBoss ? 1 : randInt(2, 3);
  const doors: Door[] = [];
  for (let i = 0; i < slots; i++) doors.push(rollDoor());
  if (!doors.some((d) => d.type === RoomType.Boss) && Math.random() < bossChance) {
    doors[0] = { type: RoomType.Boss, reward: 'Boss 战' };
  }
  if (forceBoss) doors[0] = { type: RoomType.Boss, reward: '强制 Boss 战（区域坍塌前）' };
  return doors;
}

function rollDoor(): Door {
  const r = Math.random();
  if (r < 0.45) return { type: RoomType.Monster, reward: '货币 + 经验' };
  if (r < 0.7) return { type: RoomType.Treasure, reward: '宝藏：多项可选操作' };
  if (r < 0.85) return { type: RoomType.Shop, reward: '商店：金币购买' };
  return { type: RoomType.Chest, reward: '货币 +15' };
}
