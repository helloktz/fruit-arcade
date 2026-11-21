import { drawDigits } from "../led";
import { messages, format, number } from "../locales";
import { config as c, symbolIds, odds } from "../config";
import { keyOrder } from "../panel";
import { sprites } from "../symbolSprites";
import type { Engine } from "../engine";
import { $ } from "./dom";
const names = symbolIds.map((id) => messages.symbols[id]);
export function buildDashboard() {
  $("fruits").innerHTML = keyOrder
    .map(
      (i) =>
        '<button data-i="' +
        i +
        '"><span class="mult">×' +
        odds[i] +
        '</span><img class="fruit-icon" alt="" src="' +
        sprites[i].src +
        '"><span class="fruitname">' +
        names[i] +
        '</span><span class="bet"></span></button>',
    )
    .join("");
}
export function updateDashboard(
  e: Engine,
  selected: number,
  autoCollect: boolean,
  saveError: boolean,
) {
  const ready = e.phase === "BETTING",
    pay = e.phase === "PAYOUT";
  [e.balance, e.stake, e.pending, e.won].forEach(
    (n, i) => ($("v" + i).textContent = number(n)),
  );
  drawDigits($<HTMLCanvasElement>("creditLed"), e.balance);
  drawDigits($<HTMLCanvasElement>("winLed"), e.pending);
  drawDigits($<HTMLCanvasElement>("stakeLed"), e.stake, 4);
  $("state").textContent = "● " + messages.phase[e.phase];
  $("available").textContent = format(messages.dashboard.available, {
    credits: number(e.available),
  });
  document.querySelectorAll<HTMLButtonElement>("[data-i]").forEach((b) => {
    const i = Number(b.dataset.i);
    b.disabled = !ready;
    b.classList.toggle("selected", selected === i);
    b.querySelector(".bet")!.textContent = String(e.bets[i]);
    b.setAttribute(
      "aria-label",
      format(messages.dashboard.betLabel, {
        fruit: names[i],
        amount: e.bets[i],
      }),
    );
  });
  for (const id of ["clear", "max", "repeat", "plus", "minus"])
    $(id).toggleAttribute("disabled", !ready);
  $("gamble").toggleAttribute(
    "disabled",
    !pay || e.attempts >= c.gambleLimit || e.pending >= c.cap,
  );
  $("collect").toggleAttribute("disabled", !pay && e.phase !== "GAMBLE");
  $("guess").hidden = e.phase !== "GAMBLE";
  $("start").textContent = e.animating
    ? messages.dashboard.stop
    : messages.page.start;
  $("start").toggleAttribute("disabled", !e.animating && (!ready || !e.stake));
  $("auto").textContent = autoCollect
    ? format(messages.dashboard.stopAuto, { remaining: e.auto })
    : messages.page.auto;
  $("auto").toggleAttribute("disabled", !autoCollect && (!ready || !e.stake));
  $("message").textContent = saveError
    ? messages.dashboard.saveError
    : e.animating
      ? format(messages.dashboard.progress, {
          mode: messages.modes[e.round!.events[e.cursor].type],
          step: e.cursor + 1,
          total: e.round!.events.length,
        })
      : e.phase === "GAMBLE"
        ? messages.dashboard.guess
        : pay
          ? format(messages.dashboard.win, { amount: e.pending })
          : e.phase === "GAME_OVER"
            ? messages.dashboard.over
            : e.stake
              ? messages.dashboard.ready
              : messages.dashboard.choose;
  if (e.digit && !e.animating)
    $("message").prepend(format(messages.dashboard.digit, { digit: e.digit }));
}
