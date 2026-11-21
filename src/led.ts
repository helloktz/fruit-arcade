// Seven polygonal segments behind a smoked acrylic window.
const masks = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
const segments = [
  [4, 1, 17, 1, 19, 3, 16, 5, 5, 5, 2, 3],
  [18, 5, 20, 3, 20, 15, 18, 17, 16, 15, 16, 7],
  [18, 19, 20, 17, 20, 29, 18, 31, 16, 29, 16, 21],
  [5, 29, 16, 29, 18, 32, 16, 33, 4, 33, 2, 31],
  [1, 19, 3, 17, 5, 20, 5, 28, 2, 30, 1, 28],
  [1, 5, 3, 4, 5, 7, 5, 14, 3, 17, 1, 15],
  [5, 15, 16, 15, 18, 17, 16, 19, 5, 19, 3, 17],
];
export function drawDigits(
  canvas: HTMLCanvasElement,
  value: number,
  places = 6,
) {
  const digits = String(value).padStart(places, " ");
  if (canvas.dataset.value === digits) return;
  canvas.dataset.value = digits;
  canvas.width = digits.length * 52;
  canvas.height = 76;
  const g = canvas.getContext("2d")!;
  g.scale(2, 2);
  [...digits].forEach((digit, index) => {
    g.save();
    g.translate(index * 26 + 2, 2);
    g.transform(1, 0, -0.055, 1, 0, 0);
    segments.forEach((points, bit) => {
      const on = digit !== " " && masks[Number(digit)] & (1 << bit);
      g.fillStyle = on ? "#ff5044" : "#431612";
      g.shadowColor = "#ff2715";
      g.shadowBlur = on ? 5 : 0;
      g.beginPath();
      for (let i = 0; i < points.length; i += 2) {
        if (i === 0) g.moveTo(points[i], points[i + 1]);
        else g.lineTo(points[i], points[i + 1]);
      }
      g.closePath();
      g.fill();
    });
    g.restore();
  });
}
