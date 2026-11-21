import { theory } from "./expectation";
import { sum } from "./config";
import { roll, seeded } from "./rules";
export function simulate(n: number, b: number[], seed = 123) {
  const rng = seeded(seed),
    modes: Record<string, number> = {},
    distribution: Record<string, number> = {},
    droughts: Record<number, number> = {};
  let returned = 0,
    hits = 0,
    max = 0,
    miss = 0;
  for (let i = 0; i < n; i++) {
    const o = roll(b, String(i), rng);
    for (const m of new Set(o.events.map((e) => e.type)))
      modes[m] = (modes[m] ?? 0) + 1;
    returned += o.total;
    max = Math.max(max, o.total);
    const k =
      o.total === 0
        ? "0"
        : o.total < sum(b)
          ? "<1×"
          : o.total < 10 * sum(b)
            ? "1–10×"
            : "≥10×";
    distribution[k] = (distribution[k] ?? 0) + 1;
    if (o.total) {
      hits++;
      if (miss) droughts[miss] = (droughts[miss] ?? 0) + 1;
      miss = 0;
    } else miss++;
  }
  if (miss) droughts[miss] = (droughts[miss] ?? 0) + 1;
  return {
    n,
    stake: n * sum(b),
    returned,
    rtp: returned / (n * sum(b)),
    theory: theory(b),
    hitRate: hits / n,
    max,
    netPerRound: returned / n - sum(b),
    modes,
    distribution,
    droughts,
  };
}
