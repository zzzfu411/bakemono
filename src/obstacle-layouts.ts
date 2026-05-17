import { randInt } from './math';
import { Obstacle } from './obstacle';
import { ObstacleKind } from './types';
import { FLOOR_OFFSET } from './player';

/**
 * Per-area random obstacle layouts. Each generator returns a list of physics
 * obstacles intended to serve double duty:
 *   - In vertical (横版) mode: tops act as jump platforms.
 *   - In horizontal (展开 俯视) mode: rectangles act as walls / cover.
 *
 * The layouts are tuned so展开 unlocks different routing — for example,
 * vertical-only stacks become wide cover walls when seen top-down.
 */

export type ObstacleGenerator = (canvasW: number, canvasH: number) => Obstacle[];

const BOSS_LAYOUT: ObstacleGenerator = (w, h) => [
  new Obstacle(180, h - 220, 110, 170, ObstacleKind.Stump),
  new Obstacle(w - 290, h - 220, 110, 170, ObstacleKind.Stump),
];

/** 巨木薄林：torii pillars + low stumps that double as platforms or cover. */
const FOREST: ObstacleGenerator = (w, h) => {
  const list: Obstacle[] = [];
  const platforms = randInt(2, 3);
  for (let i = 0; i < platforms; i++) {
    const px = 180 + i * ((w - 380) / Math.max(1, platforms - 1)) + randInt(-30, 30);
    const py = h - FLOOR_OFFSET - randInt(140, 240);
    list.push(new Obstacle(px, py, randInt(110, 170), randInt(140, 220), ObstacleKind.Torii));
  }
  const stumps = randInt(1, 2);
  for (let i = 0; i < stumps; i++) {
    const px = randInt(120, w - 200);
    list.push(new Obstacle(px, h - FLOOR_OFFSET - 80, randInt(80, 140), 80, ObstacleKind.Stump));
  }
  return list;
};

/** 失重钟楼：floating slabs at multiple heights. Horizontal: cover; vertical: platforms. */
const CLOCKTOWER: ObstacleGenerator = (w, h) => {
  const list: Obstacle[] = [];
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const py = h - FLOOR_OFFSET - 130 - r * 140;
    const slabs = randInt(2, 3);
    for (let i = 0; i < slabs; i++) {
      const px = 100 + (i + 0.4) * ((w - 220) / slabs) + randInt(-40, 40);
      list.push(new Obstacle(px, py, randInt(140, 200), 22, ObstacleKind.Floater));
    }
  }
  return list;
};

/** 灰海墓原：tombstone clusters of varying heights — many small things to weave through. */
const GRAVEYARD: ObstacleGenerator = (w, h) => {
  const list: Obstacle[] = [];
  const groups = randInt(3, 5);
  for (let g = 0; g < groups; g++) {
    const baseX = 120 + g * ((w - 240) / groups);
    const count = randInt(2, 4);
    for (let i = 0; i < count; i++) {
      const hh = randInt(60, 120);
      list.push(new Obstacle(baseX + i * randInt(30, 50), h - FLOOR_OFFSET - hh, randInt(34, 50), hh, ObstacleKind.Tombstone));
    }
  }
  return list;
};

/** 教会圣城：narrow chain walls + tall judgment pillars. */
const CHURCH: ObstacleGenerator = (w, h) => {
  const list: Obstacle[] = [];
  // Two tall pillars frame the room.
  list.push(new Obstacle(160, h - FLOOR_OFFSET - 320, 80, 320, ObstacleKind.Floater));
  list.push(new Obstacle(w - 240, h - FLOOR_OFFSET - 320, 80, 320, ObstacleKind.Floater));
  // 2-3 long horizontal chains as low cover.
  const chains = randInt(2, 3);
  for (let i = 0; i < chains; i++) {
    const py = h - FLOOR_OFFSET - 60 - i * 110 - randInt(-20, 20);
    const px = randInt(280, 380);
    list.push(new Obstacle(px, py, w - px * 2, 18, ObstacleKind.Chain));
  }
  return list;
};

const AREA_GENERATORS: ObstacleGenerator[] = [FOREST, CLOCKTOWER, GRAVEYARD, CHURCH];

export function generateObstacles(areaIndex: number, isBoss: boolean, canvasW: number, canvasH: number): Obstacle[] {
  if (isBoss) return BOSS_LAYOUT(canvasW, canvasH);
  const gen = AREA_GENERATORS[areaIndex] ?? FOREST;
  return gen(canvasW, canvasH);
}

export function generateTreasureRoom(canvasW: number, canvasH: number): Obstacle[] {
  // Treasure rooms: keep open, place 1-2 decorative pillars far from center.
  void canvasW;
  return [new Obstacle(120, canvasH - 250, 80, 200, ObstacleKind.Torii)];
}
