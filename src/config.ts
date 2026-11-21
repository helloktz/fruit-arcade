import { GameError } from "./errors";

import { symbolIds, tiles } from "./panel";
export { symbolIds, odds, wheel, weights } from "./panel";
export const config = {
  min: 1,

  max: 100,

  initial: 10000,

  mary: 3,

  grand: 2,

  nine: 9,

  three: [0, 3, 6],

  four: [1, 4, 7, 10],

  free: [1, 2, 3, 6, tiles.length],

  gambleLimit: 5,

  cap: 1000000,

  digits: Array(13).fill(1) as number[],

  reelOdds: [3, 5, 8, 12, 20, 35, 75, 100, 18],

  strips: [
    [0, 1, 2, 3, 4, 5, 6, 7, 8],

    [2, 4, 6, 0, 3, 5, 7, 1, 8],

    [5, 2, 7, 1, 6, 0, 4, 3, 8],
  ],

  modes: {
    BASE: 0,

    REELS: 100,

    MARY: 5,

    FREE_LIGHT: 60,

    THREE_HAPPINESS: 20,

    FOUR_HAPPINESS: 15,

    NINE_LIGHTS: 10,

    TRAIN: 0,
    GRAND_SLAM: 0,
  },
};

export type Mode = keyof typeof config.modes;

export const modes = Object.keys(config.modes) as Mode[];

export const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

export const safe = (x: number) => Number.isSafeInteger(x) && x >= 0;

export function credits(x: number) {
  if (!safe(x)) throw new GameError("creditRange");

  return x;
}

export const blank = () => Array<number>(symbolIds.length).fill(0);

export function validBet(a: unknown): a is number[] {
  return (
    Array.isArray(a) &&
    a.length === symbolIds.length &&
    a.every((x) => safe(x) && (x === 0 || x >= config.min) && x <= config.max)
  );
}
