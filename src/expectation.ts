import { config, odds, sum, weights, wheel, type Mode } from "./config";
import { tiles, lampOdds, lampAward } from "./panel";
import { reelAward } from "./rules";

export function theory(bets: number[]): number {
  const stake = sum(bets);
  if (!stake) return 0;
  const payouts = wheel.map((_, i) => lampAward(bets, i));
  const weightsByLamp = weights;
  const base =
    sum(payouts.map((amount, i) => amount * weightsByLamp[i])) /
    sum(weightsByLamp);
  const lampMean = sum(payouts) / wheel.length;
  const mary = (config.mary * stake * sum(lampOdds)) / wheel.length;
  let reels = 0;
  const [left, middle, right] = config.strips;
  for (const a of left.keys())
    for (const b of middle.keys())
      for (const c of right.keys()) {
        const result = reelAward([a, b, c], stake);
        reels += result.amount + (result.mary ? mary : 0);
      }
  const conditional: Record<Mode, number> = {
    BASE: 0,
    REELS: reels / (left.length * middle.length * right.length),
    MARY: mary,
    FREE_LIGHT: (lampMean * sum(config.free)) / config.free.length,
    THREE_HAPPINESS: sum(config.three.map((i) => payouts[i])),
    FOUR_HAPPINESS: sum(config.four.map((i) => payouts[i])),
    NINE_LIGHTS: lampMean * config.nine,
    TRAIN:
      sum(
        [2, 3, 4, 5, 6].map((n) =>
          sum(
            Array.from(
              { length: n },
              (_, i) =>
                payouts[(tiles.indexOf("TRAIN") + i + 1) % wheel.length],
            ),
          ),
        ),
      ) / 5,
    GRAND_SLAM: sum(bets.map((bet, s) => bet * odds[s])) * config.grand,
  };
  const extra =
    Object.entries(config.modes).reduce(
      (total, [mode, weight]) => total + conditional[mode as Mode] * weight,
      0,
    ) / sum(Object.values(config.modes));
  const bonus =
    sum(
      tiles.map(
        (tile, i) =>
          weights[i] *
          (tile === "TRAIN"
            ? conditional.TRAIN
            : tile === "ALL"
              ? conditional.GRAND_SLAM
              : tile === "FATE" || tile === "CHANCE"
                ? extra
                : 0),
      ),
    ) / sum(weights);
  return (base + bonus) / stake;
}
