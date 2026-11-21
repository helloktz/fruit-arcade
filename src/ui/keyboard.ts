import type { Engine } from "../engine";
import { opts } from "./preferences";
import { $ } from "./dom";
export function bindKeyboard(e: Engine, select: (i: number) => void) {
  document.onkeydown = (ev) => {
    if (
      ev.repeat ||
      ev.ctrlKey ||
      ev.metaKey ||
      ev.altKey ||
      document.querySelector("dialog")!.open ||
      !opts.keys ||
      /INPUT|SELECT|TEXTAREA/.test((ev.target as HTMLElement).tagName)
    )
      return;
    const id: Record<string, string> = {
      " ": "start",
      Enter: e.phase === "PAYOUT" || e.phase === "GAMBLE" ? "collect" : "start",
      Backspace: "clear",
      r: "repeat",
      a: "auto",
      m: "sound",
      ArrowUp: "plus",
      ArrowDown: "minus",
    };
    if (/^[1-9]$/.test(ev.key) && e.phase === "BETTING") {
      select(Number(ev.key) - 1);
    } else if (
      id[ev.key] &&
      !(e.animating && [" ", "Enter"].includes(ev.key))
    ) {
      ev.preventDefault();
      $(id[ev.key]).click();
    }
  };
}
