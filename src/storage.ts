import { GameError } from "./errors";
import { migrateV1 } from "./migrations/v1";
import { wheel, config, validBet, sum, safe, modes } from "./config";
import type { Outcome } from "./rules";
import type { Tx } from "./engine";
export const saveKey = "fruit.arcade.v1";
export function validateSave(raw: string) {
  const d = JSON.parse(raw);
  migrateV1(d);
  if (d.v === 2) {
    const upgrade = (b: number[]) =>
      Array.isArray(b) && b.length === 8 ? [...b, 0] : b;
    const relocate = (p: number) =>
      safe(p) && p < 24 ? wheel.indexOf(p % 8) : p;
    d.bets = upgrade(d.bets);
    d.last = upgrade(d.last);
    d.position = relocate(d.position);
    for (const round of [d.round, ...d.history]) {
      if (!round) continue;
      round.position = relocate(round.position);
      round.bets = upgrade(round.bets);
      for (const event of round.events)
        event.positions = event.positions.map(relocate);
    }
    d.v = 3;
  }
  if (
    d.v !== 3 ||
    ![
      "BETTING",
      "SPINNING",
      "BONUS",
      "REEL_BONUS",
      "PAYOUT",
      "GAMBLE",
      "GAME_OVER",
    ].includes(d.phase) ||
    !validBet(d.bets) ||
    !validBet(d.last) ||
    ![
      "balance",
      "pending",
      "attempts",
      "digit",
      "rounds",
      "won",
      "spent",
      "hits",
      "cursor",
      "position",
    ].every((k) => safe(d[k])) ||
    d.attempts > 5 ||
    d.digit > 13 ||
    d.position >= wheel.length ||
    (d.phase === "BETTING" && sum(d.bets) > d.balance)
  )
    throw new GameError("invalidSave");
  function outcome(o: Outcome) {
    return (
      o &&
      validBet(o.bets) &&
      typeof o.id === "string" &&
      modes.includes(o.mode) &&
      safe(o.position) &&
      o.position < wheel.length &&
      Array.isArray(o.stops) &&
      o.stops.length === (o.mode === "REELS" ? 3 : 0) &&
      o.stops.every((i, reel) => safe(i) && i < config.strips[reel].length) &&
      Array.isArray(o.events) &&
      o.events.length > 0 &&
      o.events.length <= wheel.length + 1 &&
      o.events.every(
        (a, i) =>
          a.id === o.id + "-" + i &&
          modes.includes(a.type) &&
          safe(a.amount) &&
          Array.isArray(a.positions) &&
          a.positions.every((p) => safe(p) && p < wheel.length),
      ) &&
      safe(o.total) &&
      o.total === sum(o.events.map((a) => a.amount))
    );
  }
  if (
    !Array.isArray(d.history) ||
    d.history.length > 100 ||
    !d.history.every(outcome) ||
    (d.round !== null && !outcome(d.round)) ||
    !Array.isArray(d.ledger) ||
    d.ledger.length > 500
  )
    throw new GameError("invalidSave");
  const seen = new Set();
  if (
    !d.ledger.every(
      (t: Tx, i: number) =>
        typeof t.id === "string" &&
        !seen.has(t.id) &&
        seen.add(t.id) &&
        typeof t.round === "string" &&
        ["BET", "PAYOUT", "BONUS", "COLLECT", "GAMBLE"].includes(t.type) &&
        safe(t.time) &&
        Number.isSafeInteger(t.delta) &&
        safe(t.balance) &&
        safe(t.pool) &&
        (!i || d.ledger[i - 1].balance + t.delta === t.balance),
    )
  )
    throw new GameError("invalidSave");
  const tail = d.ledger.at(-1);
  if (tail && (tail.balance !== d.balance || tail.pool !== d.pending))
    throw new GameError("invalidSave");
  if (
    ["BONUS", "REEL_BONUS", "SPINNING"].includes(d.phase) &&
    (!d.round ||
      d.cursor >= d.round.events.length ||
      sum(
        d.round.events
          .slice(0, d.cursor)
          .map((v: { amount: number }) => v.amount),
      ) !== d.pending)
  )
    throw new GameError("invalidSave");
  if (["GAMBLE", "PAYOUT"].includes(d.phase) && (!d.pending || !d.round))
    throw new GameError("invalidSave");
  if (
    d.balance !== config.initial - d.spent + d.won ||
    d.hits > d.rounds ||
    d.history.length > d.rounds ||
    (!tail && d.rounds > 0)
  )
    throw new GameError("invalidLedger");
  if (["BETTING", "GAME_OVER"].includes(d.phase) && d.pending !== 0)
    throw new GameError("idlePool");
  return d;
}
