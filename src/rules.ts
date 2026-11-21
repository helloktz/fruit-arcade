import { validateConfig } from "./validateConfig";
import { type RNG, secure, pick, uniform } from "./random";
export { type RNG, secure, seeded, pick } from "./random";
import {
  config as c,
  credits,
  modes,
  odds,
  sum,
  weights,
  wheel,
  type Mode,
} from "./config";
import { tiles, lampAward, lampOdds } from "./panel";
validateConfig();
export interface Award {
  id: string;
  type: Mode;
  positions: number[];
  amount: number;
}
export interface Outcome {
  id: string;
  bets: number[];
  position: number;
  mode: Mode;
  stops: number[];
  events: Award[];
  total: number;
}
export function reelAward(stops: number[], stake: number) {
  const symbols = stops.map((x, i) => c.strips[i][x]);
  return {
    amount: symbols.every((x) => x === symbols[0])
      ? stake * c.reelOdds[symbols[0]]
      : 0,
    mary: symbols.join() === "0,1,2",
  };
}
export function roll(b: number[], id: string, r: RNG = secure): Outcome {
  const position = pick(weights, r),
    tile = tiles[position],
    mode =
      tile === "TRAIN"
        ? "TRAIN"
        : tile === "ALL"
          ? "GRAND_SLAM"
          : tile === "FATE" || tile === "CHANCE"
            ? modes[pick(Object.values(c.modes), r)]
            : "BASE",
    events: Award[] = [],
    stops: number[] = [];
  const lamp = (p: number) => lampAward(b, p);
  function add(type: Mode, positions: number[], amount: number) {
    events.push({
      id: id + "-" + events.length,
      type,
      positions,
      amount: credits(amount),
    });
  }
  add("BASE", [position], lamp(position));
  let mary = mode === "MARY";
  if (mode === "REELS") {
    stops.push(...c.strips.map((s) => uniform(s.length, r)));
    const result = reelAward(stops, sum(b));
    add(mode, [], result.amount);
    mary = result.mary;
  }
  if (mary)
    for (let i = 0; i < c.mary; i++) {
      const p = uniform(wheel.length, r);
      add("MARY", [p], sum(b) * lampOdds[p]);
    }
  if (mode === "GRAND_SLAM")
    wheel.forEach((s, i) =>
      add(
        mode,
        [i],
        s >= 0 && wheel.indexOf(s) === i ? b[s] * odds[s] * c.grand : 0,
      ),
    );
  let positions =
    mode === "THREE_HAPPINESS"
      ? c.three
      : mode === "FOUR_HAPPINESS"
        ? c.four
        : [];
  if (mode === "FREE_LIGHT" || mode === "NINE_LIGHTS") {
    const pool = wheel.map((_, i) => i),
      count =
        mode === "FREE_LIGHT" ? c.free[uniform(c.free.length, r)] : c.nine;
    positions = Array.from(
      { length: count },
      () => pool.splice(uniform(pool.length, r), 1)[0],
    );
  }
  if (mode === "TRAIN") {
    const count = 2 + uniform(5, r);
    positions = Array.from(
      { length: count },
      (_, i) => (position + i + 1) % wheel.length,
    );
  }
  for (const p of positions) add(mode, [p], lamp(p));
  return {
    id,
    bets: [...b],
    position,
    mode,
    stops,
    events,
    total: credits(sum(events.map((e) => e.amount))),
  };
}
export function gambleValue(
  pool: number,
  base: number,
  n: number,
  big: boolean,
) {
  return n === 7
    ? pool
    : n > 7 === big
      ? Math.min(c.cap, base + c.cap, pool * 2)
      : 0;
}
