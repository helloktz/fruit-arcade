import { validateSave } from "./storage";
import { blank, config as c, credits, sum, validBet } from "./config";
import {
  gambleValue,
  pick,
  roll,
  secure,
  type Outcome,
  type RNG,
} from "./rules";
import { type Phase, transition } from "./stateMachine";
export type Tx = {
  id: string;
  round: string;
  type: string;
  delta: number;
  balance: number;
  pool: number;
  time: number;
};
export class Engine {
  phase: Phase = "BETTING";
  balance: number = c.initial;
  bets = blank();
  last = blank();
  pending = 0;
  attempts = 0;
  digit = 0;
  round: Outcome | null = null;
  history: Outcome[] = [];
  ledger: Tx[] = [];
  rounds = 0;
  won = 0;
  spent = 0;
  hits = 0;
  cursor = 0;
  position = 0;
  log: string[] = [];
  auto = 0;
  constructor(
    public rng: RNG = secure,
    private notify: () => void = () => {},
  ) {}
  get animating() {
    return ["SPINNING", "BONUS", "REEL_BONUS"].includes(this.phase);
  }
  get stake() {
    return sum(this.bets);
  }
  get available() {
    return this.phase === "BETTING" ? this.balance - this.stake : this.balance;
  }
  private move(to: Phase) {
    transition(this.phase, to);
    this.log = [...this.log.slice(-99), this.phase + " → " + to];
    this.phase = to;
  }
  private record(
    type: string,
    delta: number,
    pool: number,
    id: string = crypto.randomUUID(),
  ) {
    const balance = credits(this.balance + delta);
    credits(pool);
    this.ledger.push({
      id,
      round: this.round?.id ?? "",
      type,
      delta,
      balance,
      pool,
      time: Date.now(),
    });
    this.ledger = this.ledger.slice(-500);
    this.balance = balance;
    this.pending = pool;
  }
  set(b: number[]) {
    if (this.phase !== "BETTING" || !validBet(b) || sum(b) > this.balance)
      return false;
    this.bets = [...b];
    this.notify();
    return true;
  }
  start() {
    if (this.phase !== "BETTING" || !this.stake) return false;
    const out = roll(this.bets, crypto.randomUUID(), this.rng);
    credits(this.balance - this.stake + Math.max(out.total, c.cap));
    credits(this.spent + this.stake);
    credits(this.won + Math.max(out.total, c.cap));
    this.round = out;
    this.cursor = 0;
    this.attempts = 0;
    this.digit = 0;
    this.last = [...this.bets];
    this.rounds = credits(this.rounds + 1);
    this.spent += this.stake;
    this.record("BET", -this.stake, 0);
    this.move("SPINNING");
    if (this.auto) this.auto--;
    this.notify();
    return true;
  }
  advance() {
    if (!this.round || !this.animating) return false;
    const event = this.round.events[this.cursor++];
    this.record(
      event.type === "BASE" ? "PAYOUT" : "BONUS",
      0,
      this.pending + event.amount,
      event.id,
    );
    const next = this.round.events[this.cursor];
    if (next) this.move(next.type === "REELS" ? "REEL_BONUS" : "BONUS");
    else {
      this.position = this.round.position;
      this.history = [this.round, ...this.history].slice(0, 100);
      if (this.pending) {
        this.hits++;
        this.move("PAYOUT");
      } else this.finish();
    }
    this.notify();
    return true;
  }
  private finish() {
    this.bets = sum(this.last) <= this.balance ? [...this.last] : blank();
    if (!sum(this.bets)) this.auto = 0;
    this.move(this.balance ? "BETTING" : "GAME_OVER");
  }
  collect() {
    if (this.phase !== "PAYOUT" && this.phase !== "GAMBLE") return false;
    const amount = this.pending;
    this.record("COLLECT", amount, 0);
    this.won = credits(this.won + amount);
    this.finish();
    this.notify();
    return true;
  }
  gamble() {
    if (
      this.phase !== "PAYOUT" ||
      this.attempts >= c.gambleLimit ||
      this.pending >= c.cap
    )
      return false;
    this.move("GAMBLE");
    this.notify();
    return true;
  }
  guess(big: boolean) {
    if (this.phase !== "GAMBLE" || !this.round) return false;
    this.digit = 1 + pick(c.digits, this.rng);
    this.attempts++;
    this.record(
      "GAMBLE",
      0,
      gambleValue(this.pending, this.round.total, this.digit, big),
    );
    if (this.pending) this.move("PAYOUT");
    else this.finish();
    this.notify();
    return true;
  }
  automate(n: number) {
    if (
      ![0, 10, 50, 100].includes(n) ||
      (n && (!this.stake || this.phase !== "BETTING"))
    )
      return false;
    this.auto = n;
    this.notify();
    return true;
  }
  save() {
    const { rng, notify, auto, log, ...data } = this;
    return JSON.stringify({ v: 3, ...data });
  }
  static load(raw: string | null, rng: RNG = secure, notify = () => {}) {
    const e = new Engine(rng, notify);
    if (!raw) return e;
    try {
      const d = validateSave(raw);
      for (const key of Object.keys(e) as (keyof Engine)[])
        if (
          !["rng", "notify", "auto", "log"].includes(key) &&
          Object.hasOwn(d, key)
        )
          Object.assign(e, { [key]: d[key] });
      while (e.advance()) {}
      return e;
    } catch {
      return new Engine(rng, notify);
    }
  }
}
