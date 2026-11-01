/** Seekable cinematic motion in metres/seconds. No accumulated frame state. */
export interface TravelSample { distance: number; speed: number; acceleration: number }

const smooth = (value: number, start: number, end: number): number => {
  const t = Math.max(0,Math.min(1,(value-start)/(end-start)));
  return t*t*t*(t*(t*6-15)+10);
};
const cuts = { intro: [], crew: [7,17], launch: [3,6.5,9,18] } as const;

/** A seekable curtain hides editorial lens/position cuts without flying the
 * camera through kilometres of scenery. Captions stay on top of the curtain. */
export function cinematicCurtain(mode:'intro'|'crew'|'launch',time:number,reducedMotion=false):number {
  const t=Math.max(0,time);
  let opacity=mode==='intro'?1-smooth(t,4,5.2):1-smooth(t,0,.55);
  if(mode==='intro')opacity=Math.max(opacity,smooth(t,35.4,36));
  if(mode==='crew')opacity=Math.max(opacity,smooth(t,23.4,24));
  if(mode==='launch')opacity=Math.max(opacity,smooth(t,59.4,60));
  if(!reducedMotion)for(const cut of cuts[mode])opacity=Math.max(opacity,1-smooth(Math.abs(t-cut),0,.28));
  return opacity;
}

export function sceneRevealOpacity(time:number,reducedMotion=false):number {
  return 1-smooth(time,0,reducedMotion ? .15 : .55);
}

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
