import { assetsReady } from "./symbolSprites";
import { keyOrder } from "./panel";
import { planSpin, type SpinPath } from "./wheelMotion";
import { messages, localizePage } from "./locales";
import { StagePlayer } from "./ui/animation";
import "./style.css";
import { blank, config as c } from "./config";
import { buildDashboard, updateDashboard } from "./ui/dashboard";
import { bindKeyboard } from "./ui/keyboard";
import { saveKey as key } from "./storage";
import { Engine } from "./engine";

import { render } from "./screen";
import { opts, settings, audio } from "./ui/preferences";
import { $ } from "./ui/dom";
import { bindPanels } from "./ui/panels";

const canvas = $<HTMLCanvasElement>("board"),
  dialog = document.querySelector("dialog")!;
let spinPath: SpinPath | null = null;
let selected = 0,
  progress = 1,
  autoCollect = false,
  timer = 0,
  lastLamp = -1,
  saveError = false;
let raw = null;
try {
  raw = localStorage.getItem(key);
} catch {}
const e = Engine.load(raw);
function persist() {
  try {
    localStorage.setItem(key, e.save());
  } catch {
    saveError = true;
  }
}
persist();
localizePage(document);
buildDashboard();
settings();
function paint() {
  const lamp = render(canvas, e, progress, opts.quality, spinPath);
  if (e.animating && lamp !== lastLamp) {
    audio.play([320 + lamp * 13]);
    lastLamp = lamp;
  }
}
function update() {
  updateDashboard(e, selected, autoCollect, saveError);
  paint();
}
function edit(delta: number) {
  const b = [...e.bets];
  b[selected] += delta;
  if (e.set(b)) {
    audio.play([520]);
    changed();
  }
}
function changed() {
  persist();
  update();
}
function scheduleAuto() {
  clearTimeout(timer);
  if (document.hidden || dialog.open || !autoCollect || e.animating) return;
  timer = window.setTimeout(() => {
    if (e.phase === "PAYOUT") e.collect();
    if (e.auto && e.phase === "BETTING" && e.stake) start();
    else {
      autoCollect = false;
      e.automate(0);
    }
    changed();
  }, 480);
}
const player = new StagePlayer();
function stage() {
  player.cancel();
  if (!e.animating) {
    progress = 1;
    changed();
    if (e.pending) {
      audio.play(
        e.pending >= 100
          ? [392, 494, 587, 784, 659, 587, 784, 988, 1175]
          : [523, 659, 784, 659, 1046],
        true,
      );
      if (!opts.simpleAnimation)
        document
          .querySelector(".meters")!
          .animate([{ filter: "brightness(1.7)" }, { filter: "none" }], 450);
    }
    scheduleAuto();
    return;
  }
  if (e.phase === "SPINNING")
    spinPath = planSpin(e.position, e.round!.position, e.round!.id);
  progress = 0;
  changed();
  player.play(
    e.phase,
    e.round!.events[e.cursor].type,
    spinPath?.duration ?? 0,
    e.round!.events[e.cursor - 1]?.type !== e.round!.events[e.cursor].type,
    e.cursor === e.round!.events.length - 1,
    (t) => {
      progress = t;
      paint();
    },
    () => {
      e.advance();
      stage();
    },
  );
}
function start() {
  if (e.start()) {
    audio.play([262, 392, 523]);
    stage();
  }
}
function stopAuto() {
  autoCollect = false;
  e.automate(0);
  clearTimeout(timer);
  update();
}
function click(id: string, fn: () => void) {
  $(id).onclick = () => {
    audio.unlock();
    fn();
  };
}
document.querySelectorAll<HTMLButtonElement>("[data-i]").forEach(
  (b) =>
    (b.onclick = () => {
      audio.unlock();
      selected = Number(b.dataset.i);
      edit(1);
      update();
    }),
);
click("start", () => {
  if (e.animating) {
    player.cancel();
    e.advance();
    stage();
  } else start();
});
click("plus", () => edit(1));
click("minus", () => edit(-1));
click("clear", () => {
  e.set(blank());
  changed();
});
click("repeat", () => {
  if (!e.set(e.last)) $("message").textContent = messages.dashboard.repeatError;
  else changed();
});
click("max", () => {
  const b = [...e.bets];
  b[selected] = Math.min(c.max, e.available + b[selected]);
  e.set(b);
  changed();
});
click("gamble", () => {
  stopAuto();
  e.gamble();
  changed();
});
click("collect", () => {
  e.collect();
  changed();
});
for (const [id, big] of [
  ["small", false],
  ["big", true],
] as const)
  click(id, () => {
    e.guess(big);
    audio.play(e.pending ? [523, 784] : [220, 110]);
    changed();
  });
click("auto", () => {
  if (autoCollect) stopAuto();
  else if (e.automate(opts.count)) {
    autoCollect = true;
    start();
  }
});
click("sound", () => {
  opts.mute = !opts.mute;
  settings();
});
bindPanels(e, paint, scheduleAuto, () => clearTimeout(timer));
bindKeyboard(e, (i) => {
  selected = keyOrder[i];
  update();
});
document.onvisibilitychange = () => {
  if (document.hidden) clearTimeout(timer);
  else scheduleAuto();
};
void assetsReady.then(paint);
new ResizeObserver(paint).observe(canvas);
update();
