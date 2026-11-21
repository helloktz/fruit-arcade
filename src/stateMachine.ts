import {GameError} from "./errors";
export type Phase =
  | "BETTING"
  | "SPINNING"
  | "BONUS"
  | "REEL_BONUS"
  | "PAYOUT"
  | "GAMBLE"
  | "GAME_OVER";
const transitions: Record<Phase, Phase[]> = {
  BETTING: ["SPINNING"],
  SPINNING: ["BONUS", "REEL_BONUS", "PAYOUT", "BETTING", "GAME_OVER"],
  BONUS: ["BONUS", "PAYOUT", "BETTING", "GAME_OVER"],
  REEL_BONUS: ["BONUS", "PAYOUT", "BETTING", "GAME_OVER"],
  PAYOUT: ["GAMBLE", "BETTING", "GAME_OVER"],
  GAMBLE: ["PAYOUT", "BETTING", "GAME_OVER"],
  GAME_OVER: [],
};

export function transition(from: Phase, to: Phase) {
  if (!transitions[from].includes(to)) throw new GameError("illegalTransition");
  return to;
}
