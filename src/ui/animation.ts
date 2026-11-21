import { timing } from "../timing";
import type { Mode } from "../config";
import type { Phase } from "../stateMachine";
import { opts, audio } from "./preferences";

const melodies: Partial<Record<Mode, number[]>> = {
  REELS: [196, 220, 247],
  MARY: [523, 659, 784, 659, 880],
  FREE_LIGHT: [587, 784],
  THREE_HAPPINESS: [392, 494, 587],
  FOUR_HAPPINESS: [349, 440, 523, 698],
  NINE_LIGHTS: [330, 392, 494, 587, 740],
  GRAND_SLAM: [392, 523, 659, 784, 1046, 1318],
};
export class StagePlayer {
  private frame = 0;
  cancel() {
    cancelAnimationFrame(this.frame);
  }
  play(
    phase: Phase,
    mode: Mode,
    spinDuration: number,
    first: boolean,
    last: boolean,
    draw: (t: number) => void,
    done: () => void,
  ) {
    this.cancel();
    const duration = opts.simpleAnimation
      ? timing.reduced
      : phase === "SPINNING"
        ? spinDuration
        : phase === "REEL_BONUS"
          ? timing.reel
          : mode === "MARY"
            ? timing.mary
            : mode === "TRAIN"
              ? timing.trainStep + (first ? timing.trainDeparture : 0)
              : mode === "GRAND_SLAM"
                ? timing.allStep + (last ? timing.allHold : 0)
                : timing.lamp;
    const melody = melodies[mode];
    if (first && melody) audio.play(melody, true);
    if (first && mode === "TRAIN") audio.whistle();
    const begin = performance.now();
    let stopped = 0,
      lastMotor = 0;
    const tick = (now: number) => {
      const t = Math.min(1, ((now - begin) * opts.speed) / duration);
      if (phase === "REEL_BONUS") {
        if (
          t >= timing.reelFirstStop + stopped * timing.reelStopOffset &&
          stopped < 3
        ) {
          stopped++;
          audio.play([180, 100]);
        } else if (now - lastMotor > timing.reelMotor) {
          audio.play([90 + 30 * (1 - t)]);
          lastMotor = now;
        }
      }
      draw(t);
      if (t < 1) this.frame = requestAnimationFrame(tick);
      else done();
    };
    this.frame = requestAnimationFrame(tick);
  }
}
