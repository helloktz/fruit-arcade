import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const library = fileURLToPath(new URL("./", import.meta.url));
const art = fileURLToPath(new URL("../../public/art/symbols/", import.meta.url));
const output = join(library, "quality-review");
const layout = JSON.parse(await readFile(join(library, "layout.json"), "utf8"));
const url = process.argv[2] ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL });
const lampId = (index) => `L${String(index + 1).padStart(2, "0")}`;
const assetId = (source) => new URL(source).pathname.split("/").pop().replace(/\.svg$/, "");
const positionOf = (i) => {
  if (i < 9) return [i, 0];
  if (i < 15) return [8, i - 8];
  if (i < 23) return [22 - i, 6];
  return [0, 28 - i];
};
const data = (type, buffer) => `data:image/${type};base64,${buffer.toString("base64")}`;

async function open(viewport, draws = []) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error));
  await page.addInitScript((draws) => {
    const context = CanvasRenderingContext2D.prototype;
    const drawImage = context.drawImage;
    const clearRect = context.clearRect;
    const strokeRect = context.strokeRect;
    const random = crypto.getRandomValues.bind(crypto);
    window.drawn = { lamps: {}, reels: {}, sharpReels: new Set(), lit: 0 };
    if (draws.length) {
      crypto.getRandomValues = (target) => {
        if (draws.length && target instanceof Uint32Array && target.length === 1) {
          target[0] = draws.shift();
          return target;
        }
        return random(target);
      };
    }
    context.drawImage = function (image, ...args) {
      const [x, y, w, h] = args;
      if (this.canvas.id === "board" && image instanceof HTMLImageElement) {
        if (w === 94 && h === 75) window.drawn.lamps[`${(x - 3) / 100},${(y - 2) / 80}`] = image.src;
        if (w === 78 && h === 56) {
          (window.drawn.reels[x] ??= new Set()).add(image.src);
          if (this.filter === "none") window.drawn.sharpReels.add(x);
        }
      }
      return drawImage.call(this, image, ...args);
    };
    context.clearRect = function (...args) {
      if (this.canvas.id === "board") window.drawn.lit = 0;
      return clearRect.apply(this, args);
    };
    context.strokeRect = function (...args) {
      if (this.canvas.id === "board" && args[2] === 92 && args[3] === 72) window.drawn.lit++;
      return strokeRect.apply(this, args);
    };
  }, draws);
  await page.goto(url);
  await page.waitForFunction(() => Object.keys(window.drawn.lamps).length === 28);
  const metrics = await page.evaluate(async () => {
    await document.fonts.ready;
    const keys = Array.from(document.querySelectorAll("#fruits button"));
    await Promise.all(keys.map((key) => key.querySelector("img").decode()));
    return {
      lamps: window.drawn.lamps,
      keySources: keys.map((key) => key.querySelector("img").src),
      odds: keys.map((key) => key.querySelector(".mult").textContent),
    };
  });
  assert.deepEqual(layout.lamps.map((_, i) => assetId(metrics.lamps[positionOf(i)])), layout.lamps);
  assert.deepEqual(metrics.keySources.map(assetId), layout.keys);
  assert.deepEqual(metrics.odds.map((label) => Number(label.replace(/^\D+/, ""))), [5, 20, 30, 40, 100, 20, 15, 10, 2]);
  return { page, errors };
}

async function boardCells(page) {
  const board = await page.locator("#board").boundingBox();
  const width = board.width / 9;
  const height = board.height / 7;
  const image = data("png", await page.locator("#board").screenshot());
  return { width, height, image };
}

function nativeCell({ width, height, image }, index) {
  const [x, y] = positionOf(index);
  const left = Math.round(x * width);
  const top = Math.round(y * height);
  const right = Math.round((x + 1) * width);
  const bottom = Math.round((y + 1) * height);
  return `<span class="cell" style="width:${right - left}px;height:${bottom - top}px;background-image:url('${image}');background-position:${-left}px ${-top}px"></span>`;
}

async function gallery(desktop, mobile) {
  const sheet = await browser.newPage({ viewport: { width: 780, height: 760 } });
  const picks = [...new Set(layout.lamps)].map((id) => [id, layout.lamps.lastIndexOf(id)]);
  const rows = await Promise.all(picks.map(async ([id, index]) => {
    const file = `${lampId(index)}-${id}.png`;
    const [photo, ruten, svg] = await Promise.all([
      readFile(join(library, "photo", "lamps", file)),
      readFile(join(library, "ruten", "lamps", file)),
      readFile(join(art, `${id}.svg`)),
    ]);
    return `<div class="row"><strong>${lampId(index)}<br>${layout.labels[id]}</strong>
      <img class="reference" src="${data("png", photo)}"><img class="reference" src="${data("png", ruten)}">
      ${nativeCell(desktop, index)}${nativeCell(mobile, index)}
      <img class="large" src="${data("svg+xml", svg)}"></div>`;
  }));
  const columnLabels = `格位<span>實機照</span><span>露天照</span><span>桌面原尺寸</span><span>手機原尺寸</span><span>SVG 直接渲染</span>`;
  for (let group = 0; group < 3; group++) {
    await sheet.setContent(`<!doctype html><meta charset="utf-8"><style>
      body{font:14px system-ui,sans-serif;background:#eaf0f0;color:#172833;margin:18px}
      .row,header{display:grid;grid-template-columns:82px 115px 115px 108px 108px 146px;
        align-items:center;justify-items:center;gap:8px;border-bottom:1px solid #bdd0d4}
      .row{height:122px}.row strong{text-align:center}header{height:46px;font-weight:700}
      .cell{display:block;overflow:hidden}.reference{width:92px;height:92px;object-fit:contain;image-rendering:pixelated}
      .large{width:130px;height:108px;background:linear-gradient(#f7faf4,#c2dbe6)}
    </style><header>${columnLabels}</header>${rows.slice(group * 5, group * 5 + 5).join("")}`);
    await sheet.evaluate(() => Promise.all(Array.from(document.images, (image) => image.decode())));
    await sheet.screenshot({ path: join(output, `symbols-${group + 1}.png`) });
  }
  await sheet.close();
}

async function watermelon(desktop, mobile) {
  const sheet = await browser.newPage({ viewport: { width: 760, height: 600 } });
  const index = layout.lamps.indexOf("watermelon");
  const svg = await readFile(join(art, "watermelon.svg"));
  const crop = (name) => readFile(join(library, "ruten", name));
  const [lamp, key] = await Promise.all([
    crop("lamps/L10-watermelon.png"), crop("key-symbols/K02-watermelon.png"),
  ]);
  const geometry = await sheet.evaluate((source) => {
    const svg = new DOMParser().parseFromString(source, "image/svg+xml").documentElement;
    const halves = Array.from(svg.children).filter((node) => node.getAttribute("href") === "#half");
    const flesh = svg.querySelector("#half ellipse[fill='url(#cut-colour)']");
    return {
      offsets: halves.map((half) => [Number(half.getAttribute("x")), Number(half.getAttribute("y")), half.getAttribute("transform")]),
      mirrored: !!svg.querySelector("use[href='#upper-stripes'][transform='translate(0 80) scale(1 -1)']"),
      bands: svg.querySelector("#upper-stripes").getAttribute("d").match(/\bM/g).length * 2,
      face: ["rx", "ry"].map((radius) => 2 * Number(flesh.getAttribute(radius))),
    };
  }, svg.toString("utf8"));
  assert.deepEqual(geometry, { offsets: [[43, 1.4, null], [4, 1.4, null]], mirrored: true, bands: 4, face: [14.4, 31] });
  await sheet.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{background:#eaf0f0;color:#162e3b;font:15px system-ui,sans-serif;margin:24px}
    main{display:grid;grid-template-columns:215px 1fr;gap:25px}figure{margin:0 0 12px}
    img{display:block;margin:8px 0}.reference{width:136px;image-rendering:pixelated}
    .large{width:100%;background:linear-gradient(#f7faf4,#c2dbe6)}
    .native{display:flex;gap:20px;align-items:start}.cell{display:block;margin-top:8px}
  </style><h2>西瓜 · 最終 SVG</h2><main><div>
    <figure>露天燈位 L10 · 48 × 48 px<img class="reference" src="${data("png", lamp)}"></figure>
    <figure>露天押注 K02 · 45 × 32 px<img class="reference" src="${data("png", key)}"></figure>
    <div class="native"><figure>桌面原尺寸${nativeCell(desktop, index)}</figure><figure>手機原尺寸${nativeCell(mobile, index)}</figure></div>
    </div><figure>SVG 直接渲染<img class="large" src="${data("svg+xml", svg)}"></figure></main>`);
  await sheet.evaluate(() => Promise.all(Array.from(document.images, (image) => image.decode())));
  await sheet.screenshot({ path: join(output, "watermelon-final.png") });
  await sheet.close();
}

async function reward(draws, mode, file) {
  const { page, errors } = await open({ width: 1280, height: 900 }, draws);
  await page.locator('[data-i="0"]').click();
  await page.locator("#start").click();
  await page.locator("#start").click();
  if (mode === "REELS") {
    await page.waitForFunction(() => window.drawn.sharpReels.size === 3);
    const reels = await page.evaluate(() => Object.values(window.drawn.reels).map((set) => [...set]));
    assert.ok(reels.every((column) => column.length > 1 && column.every((src) => layout.keys.includes(assetId(src)))));
  } else {
    await page.waitForFunction(() => document.querySelector("#state").textContent.includes("特殊獎勵"));
    if (mode === "TRAIN") {
      await page.waitForFunction(() => window.drawn.lit >= 3);
    } else {
      await page.waitForFunction(() => document.querySelector("#state").textContent.includes("等待領取"));
      assert.equal(await page.evaluate(() => window.drawn.lit), 28);
    }
  }
  await page.locator(".housing").screenshot({ path: join(output, file) });
  assert.deepEqual(errors, []);
  await page.close();
}

try {
  await mkdir(output, { recursive: true });
  const desktop = await open({ width: 1280, height: 900 });
  const mobile = await open({ width: 390, height: 844 });
  const desktopCells = await boardCells(desktop.page);
  const mobileCells = await boardCells(mobile.page);
  console.log(`Cells in CSS px: ${desktopCells.width.toFixed(1)} × ${desktopCells.height.toFixed(1)} / ${mobileCells.width.toFixed(1)} × ${mobileCells.height.toFixed(1)}`);
  await gallery(desktopCells, mobileCells);
  await watermelon(desktopCells, mobileCells);
  for (const [name, { page, errors }] of [["desktop", desktop], ["mobile", mobile]]) {
    await page.locator("main").screenshot({ path: join(output, `${name}.png`) });
    assert.deepEqual(errors, []);
    await page.close();
  }
  // Fixed outcomes supplied to this browser context only.
  await reward([3093350482, 166052715, 1959330548, 321813351, 3277083196], "REELS", "reels.png");
  await reward([3598250134, 1343044616], "TRAIN", "train.png");
  await reward([4281398064], "GRAND_SLAM", "grand-slam.png");
  console.log("Verified 28 lamp positions, nine keys and multipliers, three reel columns, and reward captures.");
} finally {
  await browser.close();
}
