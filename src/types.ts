export const ViewPlane = {
  Vertical: 0,
  Horizontal: 1,
} as const;
export type ViewPlane = (typeof ViewPlane)[keyof typeof ViewPlane];

export const RoomType = {
  Monster: 'monster',
  Treasure: 'treasure',
  Chest: 'chest',
  Boss: 'boss',
  Shop: 'shop',
} as const;
export type RoomType = (typeof RoomType)[keyof typeof RoomType];

export const ObstacleKind = {
  Torii: 'torii',
  Stump: 'stump',
  Floater: 'floater',
  Tombstone: 'tombstone',
  Chain: 'chain',
} as const;
export type ObstacleKind = (typeof ObstacleKind)[keyof typeof ObstacleKind];

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type Faction = 'player' | 'enemy';

export interface DamageSource {
  amount: number;
  faction: Faction;
  knockback?: number;
}
