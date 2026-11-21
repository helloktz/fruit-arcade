// Clockwise from the upper-left corner of the Ruten cabinet.
export const symbolIds = [
  "APPLE",
  "ORANGE",
  "CHERRY",
  "BELL",
  "WATERMELON",
  "DOUBLE_STAR",
  "SEVEN",
  "BAR",
  "PLUM",
] as const;
export type SymbolId = (typeof symbolIds)[number];
type Tile = SymbolId | "BAR50" | "BAR25" | "CHANCE" | "FATE" | "TRAIN" | "ALL";
export const tiles: Tile[] = [
  "ORANGE",
  "BELL",
  "CHERRY",
  "BAR50",
  "BAR",
  "BAR25",
  "APPLE",
  "CHERRY",
  "PLUM",
  "WATERMELON",
  "CHERRY",
  "CHANCE",
  "APPLE",
  "CHERRY",
  "ORANGE",
  "BELL",
  "CHERRY",
  "TRAIN",
  "ALL",
  "SEVEN",
  "APPLE",
  "CHERRY",
  "PLUM",
  "DOUBLE_STAR",
  "CHERRY",
  "FATE",
  "APPLE",
  "CHERRY",
];
export const keyOrder = [0, 4, 5, 6, 7, 3, 8, 1, 2];
export const odds = [5, 10, 2, 20, 20, 30, 40, 100, 15];
export const wheel = tiles.map((tile) =>
  tile === "BAR25" || tile === "BAR50"
    ? symbolIds.indexOf("BAR")
    : symbolIds.findIndex((id) => id === tile),
);
export const lampOdds = tiles.map((tile, i) =>
  tile === "BAR25" ? 25 : tile === "BAR50" ? 50 : (odds[wheel[i]] ?? 0),
);
export const weights = tiles.map((tile, i) => {
  if (tile === "ALL") return 2;
  if (tile === "TRAIN") return 30;
  if (tile === "FATE" || tile === "CHANCE") return 55;
  return Math.round(
    1200 / (lampOdds[i] * tiles.filter((t) => t === tile).length),
  );
});
export const lampAward = (bets: number[], position: number) =>
  (bets[wheel[position]] ?? 0) * lampOdds[position];
