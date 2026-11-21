import { tiles } from "../panel";
import { messages, format } from "../locales";
import { theory } from "../expectation";
import { saveKey } from "../storage";
import { config as c, symbolIds, modes, odds, sum } from "../config";
import { seeded, gambleValue } from "../rules";
import type { Engine } from "../engine";
import { rules } from "../locales/rules";
import { $ } from "./dom";
import { opts, settings, audio } from "./preferences";
export function bindPanels(
  e: Engine,
  paint: () => void,
  resume: () => void,
  pause: () => void,
) {
  const dialog = document.querySelector("dialog")!,
    article = document.querySelector("article")!;
  let seedLabel = "Web Crypto";
  function click(id: string, fn: () => void) {
    $(id).onclick = () => {
      audio.unlock();
      pause();
      fn();
    };
  }
  function open(title: string, body: string) {
    article.innerHTML = "<h2>" + title + "</h2>" + body;
    dialog.showModal();
  }
  dialog.onclose = resume;
  click("rules", () => {
    const b = e.stake ? e.bets : Array(symbolIds.length).fill(1);
    const expected =
      sum(
        c.digits.map(
          (weight, i) =>
            weight * gambleValue(e.pending, e.round?.total ?? 0, i + 1, true),
        ),
      ) / sum(c.digits);
    const summary = format(messages.rules.expectation, {
      strategy: e.stake ? messages.rules.strategy : messages.rules.equal,
      rtp: (theory(b) * 100).toFixed(3),
      expected: expected.toFixed(2),
    });
    open(
      messages.rules.title,
      [
        ...rules.trim().split(/\r?\n/).slice(1).filter(Boolean),
        messages.rules.odds +
          "<br>" +
          symbolIds
            .map(
              (id, i) =>
                messages.symbols[id] + " " + odds[i] + " / " + c.reelOdds[i],
            )
            .join("　"),
        messages.rules.weights +
          "<br>" +
          modes
            .filter((m) => c.modes[m] > 0)
            .map((m) => messages.modes[m] + " " + c.modes[m])
            .join("　"),
        summary,
      ]
        .map((line) => "<p>" + line + "</p>")
        .join(""),
    );
  });
  click("history", () => {
    const summary = format(messages.history.summary, {
      rounds: e.rounds,
      hits: e.hits,
      spent: e.spent,
    });
    const rows = e.history
      .map(
        (r, i) =>
          `<p>#${e.rounds - i}　${messages.symbols[tiles[r.position]]}　${messages.modes[r.mode]}　+${r.total}</p>`,
      )
      .join("");
    const ledger = e.ledger
      .slice()
      .reverse()
      .map((tx) =>
        format(messages.history.transaction, {
          type: messages.transactions[
            tx.type as keyof typeof messages.transactions
          ],
          delta: tx.delta,
          balance: tx.balance,
          pending: tx.pool,
        }),
      )
      .join("\n");
    open(
      messages.history.title,
      `<p>${summary}</p>${rows || messages.history.empty}<details><summary>${messages.history.ledger}</summary><pre>${ledger}</pre></details>`,
    );
  });
  click("settings", () => {
    const select = (
      k: "speed" | "volume" | "music" | "count",
      label: string,
      values: number[],
    ) =>
      "<label>" +
      label +
      '<select id="' +
      k +
      '">' +
      values
        .map(
          (v) =>
            "<option " +
            (opts[k] === v ? "selected" : "") +
            ">" +
            v +
            "</option>",
        )
        .join("") +
      "</select></label>";
    open(
      messages.settings.title,
      select("speed", messages.settings.speed, [0.5, 1, 2]) +
        select("count", messages.settings.count, [10, 50, 100]) +
        select("volume", messages.settings.volume, [0, 0.25, 0.5, 0.75, 1]) +
        select("music", messages.settings.music, [0, 0.25, 0.3, 0.5, 0.75, 1]) +
        (
          [
            ["simpleAnimation", messages.settings.simple],
            ["quality", messages.settings.quality],
            ["keys", messages.settings.keys],
            ["mute", messages.settings.mute],
          ] as const
        )
          .map(
            ([k, n]) =>
              "<label>" +
              n +
              '<input id="' +
              k +
              '" type="checkbox" ' +
              (opts[k] ? "checked" : "") +
              "></label>",
          )
          .join("") +
        `<button id="full">${messages.settings.full}</button>` +
        (e.phase === "GAME_OVER"
          ? `<button id="reset">${messages.settings.reset}</button>`
          : "") +
        (import.meta.env.DEV
          ? `<details><summary>${messages.settings.debug}</summary><pre id="debug"></pre><label>${messages.settings.seed}<input id="seed" type="number"></label><button id="useSeed">${messages.settings.apply}</button><select id="batch"><option>10000</option><option>100000</option><option>1000000</option></select><button id="sim">${messages.settings.simulate}</button><pre id="report"></pre></details>`
          : ""),
    );
    for (const k of ["speed", "volume", "music", "count"] as const)
      $(k).onchange = () => {
        opts[k] = Number($<HTMLSelectElement>(k).value);
        settings();
      };
    for (const k of ["simpleAnimation", "quality", "keys", "mute"] as const)
      $(k).onchange = () => {
        opts[k] = $<HTMLInputElement>(k).checked;
        settings();
        paint();
      };
    $("full").onclick = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        $("full").textContent = messages.settings.denied;
      }
    };
    if ($("reset"))
      $("reset").onclick = () => {
        localStorage.removeItem(saveKey);
        location.reload();
      };
    if (import.meta.env.DEV) {
      $("debug").textContent = JSON.stringify(
        {
          seed: seedLabel,
          state: e.phase,
          bets: e.bets,
          outcome: e.round,
          log: e.log,
          history: e.history,
        },
        null,
        2,
      );
      $("useSeed").onclick = () => {
        const input = $<HTMLInputElement>("seed");
        if (input.value && Number.isSafeInteger(input.valueAsNumber)) {
          e.rng = seeded(input.valueAsNumber);
          seedLabel = input.value;
          $("useSeed").textContent = format(messages.settings.applied, {
            seed: seedLabel,
          });
        }
      };
      $("sim").onclick = async () => {
        const { simulate } = await import("../analysis");
        $("report").textContent = JSON.stringify(
          simulate(
            Number($<HTMLSelectElement>("batch").value),
            e.stake ? e.bets : Array(symbolIds.length).fill(1),
          ),
          null,
          2,
        );
      };
    }
  });
}
