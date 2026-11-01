/** Seekable cinematic motion in metres/seconds. No accumulated frame state. */
export interface TravelSample { distance: number; speed: number; acceleration: number }

/** Raised-cosine velocity ramps give planted starts/stops without a velocity snap. */
export function cinematicTravel(time: number, distance: number, duration = 24, ramp = 2.5): TravelSample {
  const t = Math.max(0, Math.min(duration, time));
  const topSpeed = distance / (duration - ramp);
  const departure = (elapsed: number): TravelSample => ({
    distance: topSpeed * (.5 * elapsed - ramp * Math.sin(Math.PI * elapsed / ramp) / (2 * Math.PI)),
    speed: topSpeed * (.5 - .5 * Math.cos(Math.PI * elapsed / ramp)),
    acceleration: topSpeed * Math.PI * Math.sin(Math.PI * elapsed / ramp) / (2 * ramp),
  });
  if (t < ramp) return departure(t);
  if (t > duration - ramp) {
    const start = departure(duration - t);
    return { distance: distance - start.distance, speed: start.speed, acceleration: -start.acceleration };
  }
  return { distance: topSpeed * (t - ramp / 2), speed: topSpeed, acceleration: 0 };
}
