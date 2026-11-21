import { planSpin, litPosition } from "../src/wheelMotion";
import { theory } from "../src/expectation";
import { describe, it, expect } from "vitest";
import { Engine } from "../src/engine";
import {
  config as c,
  blank,
  credits,
  modes,
  odds,
  sum,
  weights,
  wheel,
  type Mode,
} from "../src/config";
import { roll, pick, seeded, reelAward } from "../src/rules";
import { simulate } from "../src/analysis";
import { tiles, lampOdds } from "../src/panel";
const bets = Array(9).fill(1);
function game() {
  const e = new Engine(() => 0);
  e.set(bets);
  return e;
}
function win() {
  const e = game();
  e.start();
  e.advance();
  return e;
}
function forced(mode: Mode, rest: number[] = []) {
  const q = [
    sum(
      weights.slice(
        0,
        tiles.indexOf(
          mode === "GRAND_SLAM" ? "ALL" : mode === "TRAIN" ? "TRAIN" : "CHANCE",
        ),
      ),
    ),
    ...(["GRAND_SLAM", "TRAIN"].includes(mode)
      ? []
      : [sum(Object.values(c.modes).slice(0, modes.indexOf(mode)))]),
    ...rest,
  ];
  return roll(bets, "r", () => q.shift() ?? 0);
}
describe("投注与状态", () => {
  it.each([-1, 0.5, 101, NaN, Infinity])("拒绝 %s", (n) => {
    const e = game();
    expect(e.set([n, ...bets.slice(1)])).toBe(false);
  });
  it("押注范围与可用分", () => {
    const e = game();
    expect(e.set(Array(9).fill(100))).toBe(true);
    e.balance = 10;
    expect(e.set(Array(9).fill(2))).toBe(false);
  });
  it("无注不可开局", () => expect(new Engine().start()).toBe(false));
  it("锁定与幂等结算", () => {
    const e = game();
    e.start();
    expect(e.balance).toBe(9991);
    expect(e.start()).toBe(false);
    expect(e.set(blank())).toBe(false);
    expect(e.collect()).toBe(false);
    expect(e.guess(true)).toBe(false);
    e.advance();
    expect(e.pending).toBe(10);
    expect(e.advance()).toBe(false);
    e.collect();
    expect(e.collect()).toBe(false);
    expect(e.balance).toBe(10001);
  });
  it("未命中", () => {
    const e = game();
    e.set([1, 0, 0, 0, 0, 0, 0, 0, 0]);
    e.start();
    e.advance();
    expect(e.pending).toBe(0);
    expect(e.phase).toBe("BETTING");
  });
  it("顶部三格 BAR 共用下注并独立派彩", () => {
    for (let i = 0; i < 3; i++) {
      const q = [sum(weights.slice(0, 3 + i)), 0];
      const o = roll(bets, "r", () => q.shift() ?? 0);
      expect(o.position).toBe(3 + i);
      expect(o.total).toBe([50, 100, 25][i]);
    }
  });
  it("安全整数", () => {
    expect(() => credits(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    const e = game();
    e.balance = Number.MAX_SAFE_INTEGER;
    expect(() => e.start()).toThrow();
    expect(e.phase).toBe("BETTING");
  });
  it("自动次数与停止", () => {
    const e = game();
    expect(e.automate(10)).toBe(true);
    e.start();
    expect(e.auto).toBe(9);
    e.automate(0);
    expect(e.auto).toBe(0);
  });
});
describe("奖励系统", () => {
  it.each([
    ["THREE_HAPPINESS", 3],
    ["FOUR_HAPPINESS", 4],
    ["NINE_LIGHTS", 9],
    ["GRAND_SLAM", 28],
    ["TRAIN", 2],
    ["MARY", 3],
    ["FREE_LIGHT", 1],
  ] as const)("%s 顺序与总奖", (m, n) => {
    const o = forced(m),
      extra = o.events.slice(1);
    expect(extra).toHaveLength(n);
    expect(new Set(o.events.map((e) => e.id)).size).toBe(n + 1);
    if (m !== "MARY")
      expect(new Set(extra.flatMap((e) => e.positions)).size).toBe(n);
    const amount =
      m === "GRAND_SLAM"
        ? sum(odds) * 2
        : m === "MARY"
          ? 3 * bets.length * lampOdds[0]
          : sum(extra.map((e) => lampOdds[e.positions[0]]));
    expect(o.total).toBe(amount);
  });
  it.each(c.free.map((n, i) => [i, n]))("送灯方案 %i", (i, n) =>
    expect(forced("FREE_LIGHT", [i]).events.length).toBe(n + 1),
  );
  it.each(odds.map((_, i) => i))("三同组合 %i", (s) =>
    expect(
      reelAward(
        c.strips.map((strip) => strip.indexOf(s)),
        8,
      ).amount,
    ).toBe(c.reelOdds[s] * 8),
  );
  it("混合转轮联动小玛莉", () =>
    expect(
      forced(
        "REELS",
        c.strips.map((strip, i) => strip.indexOf(i)),
      ).events.map((x) => x.type),
    ).toEqual(["BASE", "REELS", "MARY", "MARY", "MARY"]));
  it.each([
    [1, false, 20],
    [13, true, 20],
    [8, false, 0],
    [7, true, 10],
  ] as const)("猜大小 %i", (n, b, amount) => {
    const e = win();
    e.rng = () => n - 1;
    e.gamble();
    expect(e.start()).toBe(false);
    e.guess(b);
    expect(e.pending).toBe(amount);
    expect(e.guess(b)).toBe(false);
  });
  it("最多五次", () => {
    const e = win();
    for (let i = 0; i < 5; i++) {
      e.gamble();
      e.guess(false);
    }
    expect(e.gamble()).toBe(false);
    expect(e.pending).toBe(320);
  });
});
describe("持久化与概率", () => {
  it("中断后恢复一次", () => {
    const e = game();
    e.start();
    const a = Engine.load(e.save());
    expect(a.pending).toBe(10);
    const b = Engine.load(a.save());
    b.collect();
    expect(Engine.load(b.save()).balance).toBe(10001);
  });
  it.each(["{", "{}", JSON.stringify({ v: 1, bets: "bad" })])(
    "损坏恢复",
    (raw) => expect(Engine.load(raw).balance).toBe(c.initial),
  );
  it.each([[NaN], [Infinity], [-1], [0], []].map((w) => [w]))("无效权重", (w) =>
    expect(() => pick(w, () => 0)).toThrow(),
  );
  it("拒绝抽样与零权重", () => {
    const q = [0xffffffff, 1];
    expect(pick([0, 1, 2], () => q.shift()!)).toBe(2);
  });
  it("固定种子抽样分布", () => {
    const r = seeded(17);
    let hits = 0;
    for (let i = 0; i < 50000; i++) hits += pick([3, 1], r);
    expect(Math.abs(hits / 50000 - 0.25)).toBeLessThan(0.012);
  });
  it("解析 RTP 与模拟一致", () =>
    expect(Math.abs(simulate(100000, bets).rtp - theory(bets))).toBeLessThan(
      0.035,
    ));
});

it("迁移 v1 中文模式，保留历史和未完成的奖励队列", () => {
  const game = new Engine(() => 0);
  game.set(bets);
  game.start();
  game.advance();
  game.collect();
  const sequence = [sum(weights.slice(0, tiles.indexOf("ALL")))];
  game.rng = () => sequence.shift() ?? 0;
  game.start();
  game.advance();
  const snapshot = JSON.parse(game.save());
  snapshot.v = 1;
  snapshot.round.mode = "大满贯";
  for (const event of snapshot.round.events)
    event.type = event.type === "BASE" ? "普通" : "大满贯";
  snapshot.history[0].mode = "普通";
  snapshot.history[0].events[0].type = "普通";
  const restored = Engine.load(JSON.stringify(snapshot));
  expect(restored.history.map((round) => round.mode)).toEqual([
    "GRAND_SLAM",
    "BASE",
  ]);
  expect(restored.pending).toBe(snapshot.round.total);
  expect(restored.balance).toBe(game.balance);
  expect(JSON.parse(restored.save()).v).toBe(3);
  expect(Engine.load(restored.save()).pending).toBe(restored.pending);
});

describe("cabinet wheel motion", () => {
  it("reaches every drawn target in either direction without skipping a lamp", () => {
    for (const variation of ["00", "03", "04", "07"])
      for (let target = 0; target < wheel.length; target++) {
        const path = planSpin(17, target, variation);
        expect(path.positions[0]).toBe(17);
        expect(litPosition(path, 1)).toBe(target);
        for (let i = 1; i < path.positions.length; i++) {
          expect(
            (path.positions[i] - path.positions[i - 1] + wheel.length) %
              wheel.length,
          ).toBe(parseInt(variation, 16) & 4 ? wheel.length - 1 : 1);
          expect(
            litPosition(path, (path.arrivals[i] + 1) / path.duration),
          ).toBe(path.positions[i]);
        }
      }
  });
  it("uses independent lap variation and increasing dwell before the final hold", () => {
    const short = planSpin(0, 0, "00"),
      long = planSpin(0, 0, "03");
    expect(short.positions.length - 1).toBe(56);
    expect(long.positions.length - 1).toBe(140);
    const dwell = short.arrivals.slice(1).map((t, i) => t - short.arrivals[i]);
    expect(dwell[0]).toBeGreaterThan(dwell[5]);
    expect(dwell[15]).toBe(dwell[20]);
    expect(dwell.at(-1)!).toBeGreaterThan(dwell.at(-2)!);
    expect(short.duration - short.arrivals.at(-1)!).toBe(180);
  });
});
