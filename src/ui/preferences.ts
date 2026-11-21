import { messages } from "../locales";
import { Sound } from "../audio";
import { $ } from "./dom";
export const audio = new Sound();
export const opts = {
  speed: 1,
  volume: 0.5,
  music: 0.3,
  mute: false,
  simpleAnimation: false,
  quality: true,
  keys: true,
  count: 10,
};
try {
  const d = JSON.parse(localStorage.getItem("fruit.settings") ?? "{}");
  // The legacy `simple` value could have been saved from the system preference.
  for (const k of ["mute", "simpleAnimation", "quality", "keys"] as const)
    if (typeof d[k] === "boolean") opts[k] = d[k];
  for (const k of ["speed", "volume", "music", "count"] as const)
    if (
      (k === "speed"
        ? [0.5, 1, 2]
        : k === "count"
          ? [10, 50, 100]
          : [0, 0.25, 0.5, 0.75, 1, 0.3]
      ).includes(d[k])
    )
      opts[k] = d[k];
} catch {}
export function settings() {
  audio.muted = opts.mute;
  audio.volume = opts.volume;
  audio.music = opts.music;
  try {
    localStorage.setItem("fruit.settings", JSON.stringify(opts));
  } catch {}
  $("sound").textContent = opts.mute
    ? messages.settings.mute
    : messages.settings.soundOn;
}
