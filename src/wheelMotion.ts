import { wheel } from "./panel";
import { timing } from "./timing";
export interface SpinPath {
  positions: number[];
  arrivals: number[];
  duration: number;
}
// Cosmetic variation comes from independent random bits of the existing round UUID.
export function planSpin(
  origin: number,
  target: number,
  roundId: string,
): SpinPath {
  const variation = parseInt(roundId.slice(0, 2), 16) || 0;
  const direction = variation & 4 ? -1 : 1;
  const laps = timing.minimumLaps + (variation % timing.lapVariants);
  const count = wheel.length;
  const steps =
    laps * count + (((target - origin) * direction + count) % count);
  const positions = [origin],
    arrivals = [0];
  for (let i = 1; i <= steps; i++) {
    const accelerate = Math.max(0, 1 - (i - 1) / timing.accelerationSteps);
    const brake = Math.max(0, 1 - (steps - i) / timing.brakingSteps);
    const dwell = timing.cruise + timing.accelerationExtra * accelerate ** 2 + timing.brakingExtra * brake ** 2;
    arrivals.push(arrivals[i - 1] + dwell);
    positions.push((positions[i - 1] + direction + count) % count);
  }
  return { positions, arrivals, duration: arrivals[steps] + timing.stopHold };
}
export function litPosition(path: SpinPath, progress: number) {
  const time = progress * path.duration;
  let low = 0,
    high = path.arrivals.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (path.arrivals[middle] <= time) low = middle;
    else high = middle - 1;
  }
  return path.positions[low];
}
