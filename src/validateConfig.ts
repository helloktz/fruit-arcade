import { GameError } from "./errors";
import { config, odds, weights, wheel, validBet, blank, safe } from "./config";
export function validateConfig() {
  const positive = (value: number) => safe(value) && value > 0;
  const validSymbol = (s: number) => safe(s) && s < odds.length;
  const validWeights = (values: number[]) =>
    values.every(safe) &&
    values.some(positive) &&
    values.reduce((a, b) => a + b, 0) <= 2 ** 32;
  const fixedGroups = [config.three, config.four];
  if (
    !validBet(blank()) ||
    !positive(config.initial) ||
    !positive(config.min) ||
    !positive(config.max) ||
    config.min > config.max ||
    odds.length !== 9 ||
    !odds.every(positive) ||
    weights.length !== wheel.length ||
    !validWeights(weights) ||
    wheel.length !== 28 ||
    !wheel.every((s) => s === -1 || validSymbol(s)) ||
    !validWeights(weights) ||
    !validWeights(Object.values(config.modes)) ||
    config.digits.length !== 13 ||
    !validWeights(config.digits) ||
    config.strips.length !== 3 ||
    !config.strips.every(
      (strip) => strip.length > 0 && strip.every(validSymbol),
    ) ||
    config.reelOdds.length !== odds.length ||
    !config.reelOdds.every(positive) ||
    config.three.length !== 3 ||
    config.four.length !== 4 ||
    !fixedGroups.every(
      (group) =>
        new Set(group).size === group.length &&
        group.every((i) => safe(i) && i < wheel.length),
    ) ||
    !config.free.length ||
    ![...config.free, config.nine].every(
      (n) => positive(n) && n <= wheel.length,
    ) ||
    ![config.mary, config.grand, config.gambleLimit, config.cap].every(positive)
  )
    throw new GameError("invalidConfig");
}
