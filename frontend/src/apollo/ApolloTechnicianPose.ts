/** Absolute, elapsed-time poses: deterministic across frame rates and pause/resume.
 * Elbows own the forearm/hand/tool batch; shoulders own only the sleeve. */
export function technicianPose(role:string, phase:number, reducedMotion:boolean) {
  const motion=reducedMotion?0:1;
  const breath=Math.sin(phase*.8)*motion;
  const working=Math.sin(phase*.65)*motion;
  const doc=role==='documentation',radio=role==='communications',optics=role==='observation';
  return {
    leftArm:-.025+breath*.025,
    rightArm:(doc?-.12:radio?-.30:optics?-.38:.02)+breath*.025,
    leftElbow:-.12+working*.025,
    rightElbow:(doc?-1.05:radio?-1.30:optics?-1.25:-.18)+working*(doc?.055:.035),
    leftSpread:-.055,
    rightSpread:.045,
    headPitch:doc?.075:optics?.015:0,
  };
}
