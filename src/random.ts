import {GameError} from "./errors";
import { sum } from "./config";
export type RNG = () => number;
export const secure: RNG = () => crypto.getRandomValues(new Uint32Array(1))[0];
export function seeded(seed: number): RNG {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let z = Math.imul(seed ^ (seed >>> 15), seed | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return (z ^ (z >>> 14)) >>> 0;
  };
}
export function pick(w: number[], rng: RNG) {
  const n = sum(w);
  if (
    !w.every((x) => Number.isSafeInteger(x) && x >= 0) ||
    n < 1 ||
    n > 2 ** 32
  )
    throw new GameError("invalidWeights");
  const limit = Math.floor(2 ** 32 / n) * n;
  let x;
  do {
    x = rng();
  } while (x >= limit);
  let k = x % n;
  for (let i = 0; i < w.length; i++) {
    k -= w[i];
    if (k < 0) return i;
  }
  throw new GameError("drawFailed");
}
export const uniform = (n: number, r: RNG) => pick(Array(n).fill(1), r);
