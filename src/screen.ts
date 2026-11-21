import { timing } from "./timing";
import { messages, format } from "./locales";
import { wheel, config } from "./config";
import { sprites, lampSprites } from "./symbolSprites";
import type { Engine } from "./engine";
import { litPosition, type SpinPath } from "./wheelMotion";
const cells = [
  ...Array.from({ length: 9 }, (_, i) => [i, 0]),
  ...Array.from({ length: 6 }, (_, i) => [8, i + 1]),
  ...Array.from({ length: 8 }, (_, i) => [7 - i, 6]),
  ...Array.from({ length: 5 }, (_, i) => [0, 5 - i]),
];
export function render(
  canvas: HTMLCanvasElement,
  e: Engine,
  t: number,
  quality: boolean,
  path: SpinPath | null,
) {
  const ratio = quality ? devicePixelRatio : 1,
    w = canvas.clientWidth,
    h = canvas.clientHeight;
  if (
    canvas.width !== Math.round(w * ratio) ||
    canvas.height !== Math.round(h * ratio)
  ) {
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
  }
  const g = canvas.getContext("2d")!;
  g.setTransform(canvas.width / 700, 0, 0, canvas.height / 560, 0, 0);
  function box(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    a: string,
    b: string,
  ) {
    const grad = g.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, a);
    grad.addColorStop(1, b);
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
  }
  function label(
    s: string,
    x: number,
    y: number,
    size: number,
    color: string,
    font = "Arial Black",
  ) {
    g.fillStyle = color;
    g.font = "bold " + size + 'px "' + font + '",sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(s, x, y);
  }
  g.clearRect(0, 0, 700, 560);
  const out = e.round,
    event = out?.events[e.cursor],
    spin = e.phase === "SPINNING",
    bonus = e.phase === "BONUS",
    reels = e.phase === "REEL_BONUS";
  const whistling =
    bonus &&
    event?.type === "TRAIN" &&
    e.cursor === 1 &&
    t < timing.trainDeparture / (timing.trainDeparture + timing.trainStep);
  const active = whistling
    ? out!.position
    : spin && path
      ? litPosition(path, t)
      : bonus && event
        ? event.type === "MARY" && t < 0.84
          ? (event.positions[0] + Math.floor((1 - t / 0.84) * wheel.length)) %
            wheel.length
          : event.positions[0]
        : (out?.position ?? 0);
  const lit = bonus
    ? out!.events
        .slice(1, whistling ? e.cursor : e.cursor + 1)
        .flatMap((a) => a.positions)
    : [];
  g.save();
  g.scale(7 / 9, 1);
  cells.forEach(([x, y], i) => {
    const on =
        i === active ||
        lit.includes(i) ||
        (e.phase === "PAYOUT" && out?.mode === "GRAND_SLAM"),
      left = x * 100,
      top = y * 80;
    box(left, top, 100, 80, 1, "#274860", "#11223c");
    box(
      left + 2,
      top + 2,
      96,
      76,
      2,
      on ? "#fffcbc" : "#f7faf4",
      on ? "#ffc647" : "#c2dbe6",
    );
    if (lampSprites[i].naturalWidth)
      g.drawImage(lampSprites[i], left + 3, top + 2, 94, 75);

    if (on) {
      g.save();
      g.shadowBlur = quality ? 12 : 0;
      g.shadowColor = "#fff751";
      g.strokeStyle = "#fff785";
      g.lineWidth = 4;
      g.strokeRect(left + 4, top + 4, 92, 72);
      g.restore();
    }
  });
  g.restore();
  if (reels) {
    g.save();
    g.translate(-179, 71);
    g.scale(1.05, 1.05);
    for (let j = 0; j < 3; j++) {
      const x = 275 + j * 151,
        y = 79;
      box(x - 3, y - 3, 149, 159, 7, "#160e0a", "#ac7950");
      g.save();
      g.beginPath();
      g.roundRect(x, y, 143, 153, 5);
      g.clip();
      const grad = g.createLinearGradient(0, y, 0, y + 153);
      for (const [s, c] of [
        [0, "#4f708d"],
        [0.2, "#c3dbe5"],
        [0.48, "#f7fbf5"],
        [0.75, "#d4e5e8"],
        [1, "#617c94"],
      ] as const)
        grad.addColorStop(s, c);
      g.fillStyle = grad;
      g.fillRect(x, y, 143, 153);
      const strip = config.strips[j],
        stop = (spin ? undefined : out?.stops[j]) ?? [6, 2, 4][j];
      const progress = Math.min(
          1,
          t / (timing.reelFirstStop + j * timing.reelStopOffset),
        ),
        offset = reels ? (1 - progress) ** 2 * (16 + j * 5) : 0;
      if (quality && reels && progress < 0.6) g.filter = "blur(1.3px)";
      const shake =
        reels && progress > 0.93
          ? Math.sin(progress * 90) * (1 - progress) * 28
          : 0;
      for (let k = -2; k <= 2; k++) {
        const index =
            (stop + k + Math.floor(offset) + strip.length * 3) % strip.length,
          s = strip[index],
          cy = y + 76 + (k - (offset % 1)) * 51 + shake;
        if (sprites[s].naturalWidth)
          g.drawImage(sprites[s], x + 33, cy - 27, 78, 56);
      }
      g.restore();
    }
    g.fillStyle = "#b832283d";
    g.fillRect(267, 154, 465, 2);
    label("▶", 263, 156, 16, "#f4ac53");
    label("◀", 737, 156, 16, "#f4ac53");
    g.restore();
  }
  if (bonus || e.phase === "PAYOUT") {
    const title = bonus
      ? event!.type === "GRAND_SLAM"
        ? messages.cabinet.grand
        : messages.modes[event!.type]
      : format(messages.cabinet.win, { amount: e.pending });
    box(215, 327, 270, 49, 8, "#922c24", "#51191b");
    label(title, 350, 352, 25, "#ffe19a");
    if (quality)
      for (let i = 0; i < 22; i++) {
        const x = 116 + ((i * 79 + t * 48) % 468),
          y = 92 + ((i * 43 + t * 65) % 365);
        label("✦", x, y, 6 + (i % 5), "#ffd66b");
      }
  }
  return active;
}
