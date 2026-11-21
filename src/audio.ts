import { timing } from "./timing";
export class Sound {
  ctx?: AudioContext;
  waves = new Map<string, PeriodicWave>();
  muted = false;
  volume = 0.45;
  music = 0.25;
  next = 0;
  unlock() {
    this.ctx ??= new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }
  whistle() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    for (const delay of [0, timing.whistleGapSeconds]) {
      const start = ctx.currentTime + delay;
      const end = start + timing.whistleSeconds;
      const voice = ctx.createOscillator(),
        gain = ctx.createGain();
      voice.type = "triangle";
      voice.frequency.setValueAtTime(770, start);
      voice.frequency.linearRampToValueAtTime(1050, start + 0.07);
      voice.frequency.linearRampToValueAtTime(890, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.1, start + 0.03);
      gain.gain.linearRampToValueAtTime(0.0001, end);
      voice.connect(gain).connect(ctx.destination);
      voice.start(start);
      voice.stop(end);
    }
  }
  play(notes: number[], music = false) {
    const c = this.ctx;
    if (!c || this.muted) return;
    const now = c.currentTime;
    if (notes.length === 1 && now < this.next) return;
    this.next = now + 0.025;
    notes.forEach((hz, i) => {
      const o = c.createOscillator(),
        g = c.createGain(),
        start = now + i * timing.noteSeconds;
      let wave = this.waves.get("arcade");
      if (!wave) {
        wave = c.createPeriodicWave(
          new Float32Array(4),
          new Float32Array([0, 1, 0.25, 0.12]),
        );
        this.waves.set("arcade", wave);
      }
      o.setPeriodicWave(wave);
      o.frequency.value = hz;
      g.gain.setValueAtTime(
        Math.max(0.0001, (music ? this.music : this.volume) * 0.13),
        start,
      );
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
      o.connect(g).connect(c.destination);
      o.start(start);
      o.stop(start + 0.14);
    });
  }
}
