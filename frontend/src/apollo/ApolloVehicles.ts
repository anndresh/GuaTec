import * as THREE from 'three';
import { toCreasedNormals, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface VehicleRig {
  wheels: THREE.Group[];
  /** Sprung mass; road contacts and wheel odometry remain on the chassis root. */
  body: THREE.Group;
  bodyRestHeight: number;
  wheelbase: number;
  wheelRadius: number;
  headlamp: THREE.MeshStandardMaterial;
  taillamp: THREE.MeshStandardMaterial;
}

/** Deterministic odometry also supports seeking/replaying the crew cinematic. */
export function poseVehicle(root: THREE.Group, distance: number, speed: number, time: number, reducedMotion = false, acceleration = 0): void {
  const rig = root.userData.vehicleRig as VehicleRig | undefined;
  if (!rig) return;
  for (const wheel of rig.wheels) wheel.rotation.x = -distance / rig.wheelRadius;
  const rolling = Math.min(1, Math.abs(speed) / 2);
  // Sample the same shallow road profile at both axles. Sampling distance rather
  // than accumulated frame time makes a cinematic seek reproduce its suspension.
  const road = (s: number): number => Math.sin(s * 1.7) * .004 + Math.sin(s * .47) * .003;
  const front = road(distance + rig.wheelbase / 2), rear = road(distance - rig.wheelbase / 2);
  root.position.y = 0; root.rotation.x = 0; root.rotation.z = 0;
  rig.body.position.y = rig.bodyRestHeight + (reducedMotion ? 0 : (front + rear) * .5 * rolling);
  rig.body.rotation.x = reducedMotion ? 0 : THREE.MathUtils.clamp(acceleration * .008 + (front - rear) * rolling / rig.wheelbase, -.02, .02);
  rig.body.rotation.z = reducedMotion ? 0 : Math.sin(distance * .65) * .002 * rolling;
  rig.headlamp.emissiveIntensity = rolling ? .45 : .18;
  rig.taillamp.emissiveIntensity = Math.abs(speed) < .2 || acceleration < -.1 ? .55 : .18;
}

/** Merge rigid surfaces within each joint; never flatten the wheel hierarchy. */
function batchRigidParts(root: THREE.Group): void {
  const materials = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of [...root.children]) {
    if (child instanceof THREE.Group) { batchRigidParts(child); continue; }
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) continue;
    const meshes = materials.get(child.material) ?? []; meshes.push(child); materials.set(child.material, meshes);
  }
  for (const [material, meshes] of materials) {
    const geometries = meshes.map(mesh => { mesh.updateMatrix(); return (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrix); });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(geometry => geometry.dispose());
    if (!merged) continue;
    for (const mesh of meshes) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    const mesh = new THREE.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
  }
}

/**
 * Procedural, parametric road vehicles for the Kennedy support area.
 *
 * Everything that defines a vehicle's silhouette lives in `CarSpec`, so a new model is a
 * new object, not new geometry code: change a number and the hood, windshield, roof and
 * tail follow. The body is a rounded side profile extruded across the width and then
 * pinched in towards the roof ("tumblehome") and towards the nose and tail, which is what
 * stops it from reading as a stack of boxes.
 *
 * Axes: the car faces -Z, width runs along X, origin is the ground below the centre.
 * Side-profile coordinates are `s` (lengthwise, + = front) and `t` (height).
 */
export interface CarSpec {
  length: number;
  width: number;
  height: number;
  /** Distance between the axles. */
  wheelbase: number;
  wheelRadius: number;
  /** Underbody clearance. */
  clearance: number;
  /** Height of the shoulder line where the glass starts. */
  belt: number;
  /** Side-profile positions measured from the centre (+ = front). */
  windshieldBase: number;
  roofFront: number;
  roofRear: number;
  rearGlassBase: number;
  /** Thickness of the roof panel above the glass (a van has a deep one). */
  roofThickness: number;
  /** Corner rounding of the profile, metres. */
  corner: number;
  /** How much the sides lean in towards the roof, 0–0.2. */
  tumblehome: number;
  /** Extra glass pillar positions (B pillar etc.). */
  pillars: readonly number[];
  /** Solid body-colour panel from here to the tail instead of glass (cargo area of a van). */
  blindFrom?: number;
  roofRails?: boolean;
  /** Nose and tail lights as one full-width bar (modern) or separate clusters. */
  lightBar?: boolean;
}

export const CAR_SPECS = {
  suv: { length: 4.72, width: 1.93, height: 1.68, wheelbase: 2.86, wheelRadius: 0.39, clearance: 0.2, belt: 1.0, windshieldBase: 1.18, roofFront: 0.38, roofRear: -1.82, rearGlassBase: -2.12, roofThickness: 0.1, corner: 0.2, tumblehome: 0.11, pillars: [-0.1, -0.78], roofRails: true, lightBar: true },
  sedan: { length: 4.98, width: 1.95, height: 1.46, wheelbase: 2.95, wheelRadius: 0.35, clearance: 0.15, belt: 0.93, windshieldBase: 1.08, roofFront: 0.55, roofRear: -0.9, rearGlassBase: -1.35, roofThickness: 0.08, corner: 0.09, tumblehome: 0.09, pillars: [-0.12], lightBar: false },
  van: { length: 5.95, width: 2.02, height: 2.42, wheelbase: 3.65, wheelRadius: 0.4, clearance: 0.22, belt: 1.12, windshieldBase: 2.08, roofFront: 1.58, roofRear: -2.9, rearGlassBase: -2.95, roofThickness: 0.42, corner: 0.16, tumblehome: 0.05, pillars: [0.55, -0.55], blindFrom: -1.45, lightBar: false },
} as const satisfies Record<string, CarSpec>;
export type CarKind = keyof typeof CAR_SPECS;

export interface CarOptions {
  kind: CarKind;
  paint: number;
  /** Optional decal drawn on both flanks (e.g. the NASA insignia on the crew transport). */
  decal?: THREE.Texture;
  /** Generic 1960s support livery and hardware, not a claimed vehicle replica. */
  periodStyle?: boolean;
}
/** Shared, cached material factory supplied by the scene (so parts can be merged per material). */
export type MaterialFactory = (name: string, color: number, roughness?: number, metalness?: number) => THREE.MeshStandardMaterial;

type Point = readonly [number, number];

/** A closed 2D shape with rounded corners (quadratic blends clipped to half of each edge). */
function roundedShape(points: readonly Point[], radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const prev = points[(i + n - 1) % n], cur = points[i], next = points[(i + 1) % n];
    const toPrev = Math.hypot(prev[0] - cur[0], prev[1] - cur[1]), toNext = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    const kPrev = Math.min(radius / toPrev, 0.5), kNext = Math.min(radius / toNext, 0.5);
    const ax = cur[0] + (prev[0] - cur[0]) * kPrev, ay = cur[1] + (prev[1] - cur[1]) * kPrev;
    const bx = cur[0] + (next[0] - cur[0]) * kNext, by = cur[1] + (next[1] - cur[1]) * kNext;
    if (i === 0) shape.moveTo(ax, ay); else shape.lineTo(ax, ay);
    shape.quadraticCurveTo(cur[0], cur[1], bx, by);
  }
  shape.closePath();
  return shape;
}

/** Extrudes a side profile across `depth`, centred on X, with the profile's +s pointing to -Z (the front). */
function extrudeProfile(points: readonly Point[], radius: number, depth: number, bevel = 0.035, x = 0, steps = 1, shoulder = bevel): THREE.BufferGeometry {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(points, radius), { depth: Math.max(depth - shoulder * 2, 0.01), steps, bevelEnabled: true, bevelThickness: shoulder, bevelSize: bevel, bevelSegments: shoulder > bevel ? 4 : 2, curveSegments: 6 });
  geometry.translate(0, 0, -(depth - shoulder * 2) / 2);
  geometry.rotateY(Math.PI / 2);
  geometry.translate(x, 0, 0);
  return geometry;
}

type BodySection = 'body' | 'cabin' | 'roof';

/** Transverse sheet-metal crown. Edge heights stay at the authored side profile;
 * the centre rises smoothly, so the hood and roof catch a broad curved highlight. */
function sectionLift(spec: CarSpec, x: number, y: number, s: number, section: BodySection): number {
  const span = spec.height - spec.clearance;
  const tumble = spec.tumblehome * (section === 'body' ? .35 : 1);
  const end = Math.max(0, (Math.abs(s) - (spec.length / 2 - .7)) / .7);
  const halfWidth = spec.width * (section === 'body' ? .5 : section === 'cabin' ? .45 : .46) *
    (1 - tumble * Math.max(0, y - spec.clearance) / span) * (1 - .09 * end * end);
  const cross = Math.max(0, 1 - (x / halfWidth) ** 2);
  const bodyCrown = spec.height > 2 ? .045 : .065;
  const crown = section === 'body' ? bodyCrown : (spec.height > 2 ? .095 : .075);
  const heightMask = section === 'roof' ? 1 : section === 'cabin'
    ? THREE.MathUtils.lerp(bodyCrown / crown, 1, THREE.MathUtils.smoothstep(y, spec.belt + .08, spec.height - spec.roofThickness))
    : THREE.MathUtils.smoothstep(y, spec.belt - .16, spec.belt + .04);
  return crown * cross * heightMask;
}

/** Pinches the ends and roof, then crowns the subdivided transverse surfaces. */
function sculpt(geometry: THREE.BufferGeometry, spec: CarSpec, tumble: number, section?: BodySection): THREE.BufferGeometry {
  const position = geometry.getAttribute('position');
  const half = spec.length / 2, span = Math.max(spec.height - spec.clearance, 0.01);
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i), z = position.getZ(i);
    const lean = 1 - tumble * Math.max(0, y - spec.clearance) / span;
    const end = Math.max(0, (Math.abs(z) - (half - 0.7)) / 0.7);
    const nose = 1 - 0.09 * end * end;
    const x = position.getX(i) * lean * nose;
    position.setX(i, x);
    if (section) position.setY(i, y + sectionLift(spec, x, y, -z, section));
  }
  position.needsUpdate = true;
  // Smooth the rounded profile but keep the hard creases (bumper edges, window frames).
  const smooth = toCreasedNormals(geometry, 0.75);
  geometry.dispose();
  return smooth;
}

export function buildCar(spec: CarSpec, options: CarOptions, paint: MaterialFactory): THREE.Group {
  const group = new THREE.Group();
  group.userData.dynamicVehicle = true;
  const half = spec.length / 2, width = spec.width;
  const body = paint(`car-paint-${options.paint.toString(16)}`, options.paint, 0.38, 0.15);
  const glass = paint('car-glass', 0x24384a, 0.1, 0.35);
  const trim = paint('car-trim', 0x15181a, 0.55, 0.3);
  const chrome = paint('car-chrome', 0xdfe5e7, 0.28, 0.5);
  const tire = paint('car-tire', 0x16181a, 0.9, 0);
  const brake = paint('car-brake', 0x3a3f42, 0.5, 0.7);
  const headlamp = paint('car-headlamp', 0xf5f7ff, 0.2, 0.2).clone(); headlamp.emissive.setHex(0xdfe8ff); headlamp.emissiveIntensity = 0.18;
  const taillamp = paint('car-taillamp', 0xb3141b, 0.3, 0.2).clone(); taillamp.emissive.setHex(0xff1822); taillamp.emissiveIntensity = 0.55;
  const plate = paint('car-plate', 0xe9e6d8, 0.6, 0);
  const wheelGroups: THREE.Group[] = [];

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh => add(new THREE.BoxGeometry(w, h, d), material, x, y, z);
  const panel = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, radius = .035): void => {
    const geometry = new THREE.ExtrudeGeometry(roundedShape([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], radius),
      {depth: d - .012, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1, curveSegments: 3});
    geometry.translate(0, 0, -(d - .012) / 2);
    add(geometry, material, x, y, z);
  };
  const rod = (a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material): void => {
    const delta = b.clone().sub(a);
    const mesh = add(new THREE.CylinderGeometry(radius, radius, delta.length(), 6), material);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  };

  const gc = spec.clearance, belt = spec.belt, top = spec.height;
  const beltTop = belt + 0.08;
  const roofBase = top - spec.roofThickness;
  /** Profile `s` (+ = front) to world Z, and the flank's X at a given height (the body leans in towards the roof). */
  const Z = (s: number): number => -s;
  const flank = (y: number): number => (width / 2) * (1 - spec.tumblehome * 0.35 * Math.max(0, y - gc) / (top - gc));
  const fore = half + 0.045;
  const surfaceX = (y: number, s: number, glassSurface = false): number => {
    const end = Math.max(0, (Math.abs(s) - (half - .7)) / .7);
    return (glassSurface ? width * .45 : width / 2) *
      (1 - spec.tumblehome * (glassSurface ? 1 : .35) * Math.max(0, y - gc) / (top - gc)) * (1 - .09 * end * end);
  };

  // Cut the wheel openings into the shell itself. A dark disc on an unbroken
  // flank makes the wheels look glued onto a slab, particularly in side views.
  const openingRadius = spec.wheelRadius * 1.16;
  const openingAngle = Math.asin((spec.wheelRadius - gc) / openingRadius);
  const lowerEdge: Point[] = [[-half + .04, gc]];
  for (const axle of [-spec.wheelbase / 2, spec.wheelbase / 2]) {
    for (let step = 0; step <= 18; step++) {
      const angle = Math.PI + openingAngle - step / 18 * (Math.PI + 2 * openingAngle);
      lowerEdge.push([axle + Math.cos(angle) * openingRadius, spec.wheelRadius + Math.sin(angle) * openingRadius]);
    }
  }
  // Bumpers, hood, shoulder line and tail share one rounded profile.
  add(sculpt(extrudeProfile([
    ...lowerEdge, [half - 0.04, gc], [half, gc + 0.22], [half, belt - 0.16],
    [half - 0.08, belt - 0.04], [spec.windshieldBase, beltTop],
    [spec.rearGlassBase, beltTop + 0.02], [-half + 0.1, belt + 0.04], [-half, belt - 0.14], [-half, gc + 0.22],
  ], spec.corner, width, .035, 0, 6, .095), spec, spec.tumblehome * 0.35, 'body'), body);

  // Greenhouse glass, then body-colour roof panel and pillars on top of it.
  const cabin: Point[] = [[spec.windshieldBase, beltTop - 0.02], [spec.roofFront, roofBase], [spec.roofRear, roofBase], [spec.rearGlassBase, beltTop - 0.02]];
  add(sculpt(extrudeProfile(cabin, .05, width * .9, .012, 0, 6, .03), spec, spec.tumblehome, 'cabin'), glass);
  add(sculpt(extrudeProfile([[spec.roofFront + .04, top], [spec.roofRear - .02, top], [spec.roofRear, roofBase], [spec.roofFront, roofBase]], .06, width * .92, .02, 0, 8, .09), spec, spec.tumblehome, 'roof'), body);
  const pillar = (a: Point, b: Point, c: Point, d: Point): void => {
    for (const side of [-1, 1]) add(sculpt(extrudeProfile([a, b, c, d], 0.015, 0.07, 0.01, side * width * 0.455), spec, spec.tumblehome, 'cabin'), body);
  };
  pillar([spec.windshieldBase + 0.07, beltTop], [spec.windshieldBase - 0.03, beltTop], [spec.roofFront - 0.03, roofBase], [spec.roofFront + 0.07, roofBase]);
  pillar([spec.rearGlassBase - 0.1, beltTop], [spec.rearGlassBase + 0.02, beltTop], [spec.roofRear + 0.02, roofBase], [spec.roofRear - 0.1, roofBase]);
  for (const s of spec.pillars) pillar([s + 0.05, beltTop], [s - 0.05, beltTop], [s - 0.05, roofBase], [s + 0.05, roofBase]);
  if (spec.blindFrom !== undefined) {
    add(sculpt(extrudeProfile([[spec.blindFrom, beltTop - 0.02], [spec.blindFrom, top - 0.04], [spec.roofRear - 0.06, top - 0.04], [spec.rearGlassBase, beltTop - 0.02]], .04, width * .93, .02, 0, 8, .065), spec, spec.tumblehome, 'roof'), body);
  }
  // Continuous glazing surrounds follow the sculpted surface, including its
  // roof lean and end taper. These outlines give the greenhouse its own depth.
  for (const side of [-1, 1]) {
    const surround: Point[] = [
      [spec.windshieldBase, beltTop], [spec.roofFront, roofBase],
      [spec.roofRear, roofBase], [spec.rearGlassBase, beltTop], [spec.windshieldBase, beltTop],
    ];
    for (let i = 1; i < surround.length; i++) {
      const [sa, ya] = surround[i - 1], [sb, yb] = surround[i];
      const a = new THREE.Vector3(side * (surfaceX(ya, sa, true) + .012), ya, Z(sa));
      const b = new THREE.Vector3(side * (surfaceX(yb, sb, true) + .012), yb, Z(sb));
      rod(a, b, .022, chrome);
    }
    // Stamped door shut-lines close above the rocker and stop below the glass.
    const doorRear = options.kind === 'van' ? -.55 : -.72;
    const doorFront = spec.windshieldBase - .12;
    const seams: Point[] = [[doorRear, beltTop - .03], [doorRear, gc + .22],
      [doorFront - .15, gc + .22], [doorFront, beltTop - .03]];
    for (let i = 1; i < seams.length; i++) {
      const [sa, ya] = seams[i - 1], [sb, yb] = seams[i];
      rod(new THREE.Vector3(side * (surfaceX(ya, sa) + .008), ya, Z(sa)),
        new THREE.Vector3(side * (surfaceX(yb, sb) + .008), yb, Z(sb)), .009, trim);
    }
    if (options.kind !== 'van') {
      const s = spec.pillars[0];
      rod(new THREE.Vector3(side * (surfaceX(gc + .22, s) + .008), gc + .22, Z(s)),
        new THREE.Vector3(side * (surfaceX(beltTop - .03, s) + .008), beltTop - .03, Z(s)), .009, trim);
    }
  }
  // Dark underbody and side sills close the gap between wheels so no daylight shows through.
  box(width * 0.86, 0.16, spec.length * 0.9, trim, 0, gc + 0.06, 0);
  for (const side of [-1, 1]) box(0.05, 0.1, spec.wheelbase * 0.8, trim, side * width * 0.5 * 0.97, gc + 0.14, 0);

  // Wheels: tyre, rim with spokes, brake disc and a dark arch disc on the body side.
  const rim = paint('car-rim', 0xd9dfe2, 0.3, 0.45);
  for (const axle of [spec.wheelbase / 2, -spec.wheelbase / 2]) {
    for (const side of [-1, 1]) {
      const x = side * (width / 2 - 0.1), r = spec.wheelRadius;
      const wheel = new THREE.Group(); wheel.position.set(x, r, axle); group.add(wheel);
      wheel.name = `wheel-${side < 0 ? 'left' : 'right'}-${axle < 0 ? 'front' : 'rear'}`;
      wheelGroups.push(wheel);
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.26, 28), tire); tyre.rotation.z = Math.PI / 2; wheel.add(tyre);
      const face = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.66, r * 0.66, 0.27, 24), rim); face.rotation.z = Math.PI / 2; wheel.add(face);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.46, r * 0.46, 0.2, 20), brake); disc.rotation.z = Math.PI / 2; wheel.add(disc);
      for (let k = 0; k < 5; k++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, r * 1.2, r * 0.13), rim);
        spoke.position.x = side * 0.14; spoke.rotation.x = (k * Math.PI * 2) / 5 + Math.PI / 2; wheel.add(spoke);
      }
      if(options.periodStyle){
        const wall=new THREE.Mesh(new THREE.RingGeometry(r*.72,r*.86,24),plate);wall.rotation.y=side*Math.PI/2;wall.position.x=side*.139;wheel.add(wall);
        const hub=new THREE.Mesh(new THREE.SphereGeometry(r*.55,12,8),chrome);hub.scale.set(.22,1,1);hub.position.x=side*.15;wheel.add(hub);
      }
      for (const m of wheel.children) if (m instanceof THREE.Mesh) { m.castShadow = true; m.receiveShadow = true; }
      // Only the upper wheel well is backed: a full disc would extend below
      // the tyre and visibly penetrate the road by twenty percent of its radius.
      const arch = new THREE.Mesh(new THREE.CircleGeometry(r * 1.2, 28, 0, Math.PI), trim);
      arch.rotation.y = side * Math.PI / 2; arch.position.set(side * (flank(r) + 0.006), r, axle); group.add(arch);
      const lip = add(new THREE.TorusGeometry(openingRadius + .014, .024, 5, 24, Math.PI), chrome, side * (flank(r) + .012), r, axle);
      lip.rotation.y = side * Math.PI / 2;
      // Narrow moulded tyre grooves catch highlights without allocating textures.
      for (const offset of [-.08,.08]) {
        const groove = new THREE.Mesh(new THREE.TorusGeometry(r * .985,.008,4,24),trim);
        groove.rotation.y=Math.PI/2;groove.position.x=offset;wheel.add(groove);
      }
      // Broken shoulder tread and valve stem reveal rolling direction even on
      // the period hubcaps. They are merged into the existing wheel materials.
      for (let n = 0; n < 24; n++) {
        const angle = n * Math.PI / 12;
        for (const shoulder of [-1, 1]) {
          const block = new THREE.Mesh(new THREE.BoxGeometry(.065, .009, .027), tire);
          block.position.set(shoulder * .078, Math.cos(angle) * (r - .006), Math.sin(angle) * (r - .006));
          block.rotation.x = angle; wheel.add(block);
        }
      }
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.035,6),trim);
      valve.rotation.z = Math.PI / 2; valve.position.set(side * .16, r * .45, r * .36); wheel.add(valve);
    }
  }

  // Lights, grille, plates, mirrors, handles.
  const noseZ = -fore, tailZ = fore;
  const rearLampOffset = options.kind === 'van' ? .08 : 0;
  if (spec.lightBar) {
    box(width * 0.72, 0.06, 0.04, headlamp, 0, belt - 0.2, noseZ);
    box(width * 0.7, 0.07, 0.04, taillamp, 0, belt - 0.09, tailZ);
  }
  if (options.periodStyle) {
    // The lamps sit in one pressed front panel with a rolled brow. This connects
    // the pair on each wing to the bonnet rather than leaving four loose pods.
    panel(width * .93, .29, .15, body, 0, belt - .2, noseZ + .085, .065);
    for (const side of [-1, 1]) {
      panel(.46, .225, .09, chrome, side * width * .34, belt - .2, noseZ + .025, .055);
      panel(.414, .18, .025, trim, side * width * .34, belt - .2, noseZ - .027, .045);
    }
    panel(width * .9, .085, .18, body, 0, belt - .052, noseZ + .09, .035);
  }
  for (const side of [-1, 1]) {
    if(options.periodStyle){
      for(const dx of[-.105,.105]){
        const housing=add(new THREE.CylinderGeometry(.100,.100,.08,16),chrome,side*width*.34+dx,belt-.2,noseZ-.005);housing.rotation.x=Math.PI/2;
        const seal=add(new THREE.CylinderGeometry(.088,.088,.014,16),trim,side*width*.34+dx,belt-.2,noseZ-.047);seal.rotation.x=Math.PI/2;
        const lens=add(new THREE.CylinderGeometry(.078,.078,.012,16),headlamp,side*width*.34+dx,belt-.2,noseZ-.057);lens.rotation.x=Math.PI/2;
      }
      box(.018,.045,spec.length*.70,chrome,side*(width/2+.005),belt-.17,0);
    }else box(0.36, 0.1, 0.05, headlamp, side * width * 0.36, belt - 0.2, noseZ);
    // Recess the lens in a mounted bezel instead of a red block projecting
    // directly from the tail. The backing reaches into the rounded sheet metal.
    panel(.32, .16, .11 + rearLampOffset, chrome, side * width * .38, belt - .1, tailZ - .02 + rearLampOffset / 2, .025);
    panel(.28, .12, .018, trim, side * width * .38, belt - .1, tailZ + .039 + rearLampOffset, .02);
    panel(.25, .085, .018, taillamp, side * width * .38, belt - .1, tailZ + .053 + rearLampOffset, .018);
    // Period-correct side marker and a recessed door seam make the flank read as
    // assembled sheet metal instead of one continuous extrusion at gameplay distance.
    box(0.025, 0.055, 0.13, headlamp, side * (flank(belt - 0.03) + 0.018), belt - 0.03, Z(half - 0.32));
    for (const s of [0.1, -0.7]) box(0.03, 0.025, 0.2, chrome, side * (flank(belt - 0.08) + 0.01), belt - 0.08, Z(s));
    if (spec.roofRails) {
      box(0.04, 0.04, (spec.roofFront - spec.roofRear) * 0.82, chrome, side * flank(top) * 0.78, top + 0.045, Z((spec.roofFront + spec.roofRear) / 2));
    }
  }
  box(width * 0.5, 0.22, 0.11, trim, 0, gc + 0.34, noseZ + .035);
  for (let i = 0; i < 4; i++) box(width * 0.46, 0.012, 0.045, chrome, 0, gc + 0.27 + i * 0.045, noseZ - 0.002);
  box(0.52, 0.12, 0.03, plate, 0, gc + 0.2, noseZ - 0.015);
  if (options.kind !== 'van') box(0.52, 0.12, 0.03, plate, 0, gc + 0.38, tailZ + 0.015);
  box(width * 0.9, 0.1, 0.18, options.periodStyle?chrome:trim, 0, gc + 0.12, -half + 0.03);
  box(width * 0.9, 0.1, 0.18, options.periodStyle?chrome:trim, 0, gc + 0.12, half - 0.03);
  // Windshield blades lie on the sloping glass and connect to their cowl pivots.
  const windscreenPoint = (x: number, y: number): THREE.Vector3 => {
    const t = (y - beltTop) / (roofBase - beltTop);
    const s = THREE.MathUtils.lerp(spec.windshieldBase, spec.roofFront, t);
    return new THREE.Vector3(x, y + sectionLift(spec, x, y, s, 'cabin'), Z(s) - .025);
  };
  for (const side of [-1,1]) {
    const pivot = windscreenPoint(side * width * .19, beltTop + .012);
    const bladeStart = windscreenPoint(side * width * .08, beltTop + .07);
    const bladeEnd = windscreenPoint(side * width * .34, beltTop + .13);
    rod(pivot, bladeStart.clone().lerp(bladeEnd, .55), .011, chrome);
    rod(bladeStart, bladeEnd, .016, trim);
    add(new THREE.SphereGeometry(.025, 8, 6), chrome, pivot.x, pivot.y, pivot.z);
    // Hood seams follow the sloping top instead of hovering over the nose.
    const hood = (s: number): THREE.Vector3 => {
      const x = side * width * .30;
      const y = THREE.MathUtils.lerp(beltTop, belt - .04, (s - spec.windshieldBase) / (half - .08 - spec.windshieldBase)) + .035;
      return new THREE.Vector3(x, y + sectionLift(spec, x, y, s, 'body') + .003, Z(s));
    };
    rod(hood(spec.windshieldBase + .10), hood(half - .23), .0035, trim);
  }
  // A recessed cowl intake is broad enough to read from the follow camera.
  for (let slot = -5; slot <= 5; slot++) {
    const s = spec.windshieldBase + .12;
    const y = THREE.MathUtils.lerp(beltTop, belt - .04, .12 / (half - .08 - spec.windshieldBase)) + .035;
    const x = slot * width * .052;
    box(.052, .008, .095, trim, x, y + sectionLift(spec, x, y, s, 'body') + .004, Z(s));
  }
  box(.014,.15,.18,chrome,-flank(belt-.25)-.01,belt-.25,half-.62);

  // Mounted mirrors, bumper overriders and wing indicators belong to the
  // assembled body rather than floating away from its painted silhouette.
  for (const side of [-1, 1]) {
    const mirrorS = spec.windshieldBase - .2, mirrorY = belt + .12;
    const mountX = surfaceX(mirrorY, mirrorS);
    const mirrorX = side * (mountX + .19), mirrorZ = Z(mirrorS) - .015;
    box(.03, .10, .12, chrome, side * (mountX + .008), mirrorY - .055, mirrorZ);
    rod(new THREE.Vector3(side * mountX, mirrorY - .06, mirrorZ),
      new THREE.Vector3(side * (mountX + .14), mirrorY - .015, mirrorZ), .018, chrome);
    rod(new THREE.Vector3(side * (mountX + .14), mirrorY - .015, mirrorZ),
      new THREE.Vector3(mirrorX, mirrorY + .035, mirrorZ), .018, chrome);
    const mirror = add(new THREE.SphereGeometry(.1, 12, 8), chrome, mirrorX, mirrorY + .045, mirrorZ);
    mirror.scale.set(.55, .75, 1.15);
    const mirrorFace = add(new THREE.CircleGeometry(.066, 16), glass, side * (mountX + .244), mirrorY + .045, mirrorZ);
    mirrorFace.scale.set(1.2, .80, 1); mirrorFace.rotation.y = side * Math.PI / 2;
    box(.075,.20,.12,chrome,side*width*.31,gc+.17,noseZ-.03);
    box(.075,.20,.12,chrome,side*width*.31,gc+.17,tailZ+.03);
    const flankX = side*(flank(belt-.2)+.016);
    box(.018,.026,.25,trim,flankX,belt-.12,Z(.1));
    box(.028,.025,.20,chrome,flankX+side*.012,belt-.08,Z(.1));
    // Rocker-panel wear and stamped lower-door crease, using existing materials.
    box(.013,.018,spec.wheelbase*.67,chrome,side*(flank(gc+.24)+.014),gc+.24,0);
    box(.018,.065,.19,plate,side*(flank(belt-.03)+.023),belt-.03,Z(half-.32));
  }

  if (options.kind === 'van') {
    // Twin rear service doors, external hinges and a rubber-tread loading step.
    // Generic Kennedy support hardware, not a claim of a specific vehicle replica.
    const doorTop = top - .13, doorBottom = gc + .31;
    const roofSpan = spec.roofFront - spec.roofRear - .2, roofCenter = Z((spec.roofFront + spec.roofRear) / 2);
    const doorHeight = doorTop - doorBottom, doorY = (doorTop + doorBottom) / 2;
    panel(width * .80, doorHeight + .065, .10, trim, 0, doorY, half + .025, .07);
    for (const side of [-1,1]) {
      const doorX = side * width * .195;
      panel(width * .38, doorHeight, .115, body, doorX, doorY, half + .055, .055);
      // Glazed service doors have a rubber surround and inset pane. The top
      // corners echo the cab windows while the lower stamped field stays solid.
      const windowY = doorTop - .43;
      panel(width * .29, .60, .022, trim, doorX, windowY, half + .121, .07);
      panel(width * .255, .53, .016, glass, doorX, windowY, half + .139, .055);
      panel(width * .29, .38, .022, body, doorX, doorBottom + .38, half + .12, .035);
      const hingeX = side*width*.36;
      for (const y of [gc+.58,doorTop-.25]) {
        box(.15,.065,.035,chrome,hingeX,y,half+.119);
        add(new THREE.CylinderGeometry(.022,.022,.13,8),chrome,hingeX,y,half+.15);
      }
      box(.10,.23,.022,trim,side*.14,belt-.08,half+.123);
      box(.035,.16,.035,chrome,side*.14,belt-.08,half+.15);
      box(.025,.06,.028,trim,side*.14,belt-.21,half+.14);
      // Side-door tracks, lower access step, louvred utility compartment.
      box(.022,.025,1.38,chrome,side*(width*.5+.013),belt+.05,.2);
      box(.10,.06,1.05,chrome,side*width*.48,gc+.05,.12);
      for(let vent=0;vent<6;vent++)box(.018,.025,.38,trim,side*(flank(belt-.32)+.02),belt-.45+vent*.052,half-.66);
      box(.035,.035,roofSpan,chrome,side*width*.46*(1-spec.tumblehome),top-.03,roofCenter);
      for(let rib=0;rib<3;rib++){
        const x=side*(.24+rib*.14);
        box(.028,.018,roofSpan*.92,body,x,top+.022+sectionLift(spec,x,top,-roofCenter,'roof'),roofCenter);
      }
    }
    panel(.52, .12, .025, plate, -width * .195, doorBottom + .28, half + .15, .012);
    box(width*.72,.07,.26,chrome,0,gc+.02,half+.13);
    for(let n=0;n<7;n++)box(width*.66,.009,.013,trim,0,gc+.059,half+.025+n*.033);
    // Exhaust tip is recessed above the step instead of a loose tube below ground.
    const exhaust=add(new THREE.CylinderGeometry(.042,.042,.20,10),chrome,-width*.34,gc+.02,half-.05);
    exhaust.rotation.x=Math.PI/2;
    const mouth=add(new THREE.CircleGeometry(.029,10),trim,-width*.34,gc+.02,half+.053);
    mouth.rotation.y=0;
  } else {
    // A closed deck lid has its own shut line and latch, rather than the tail
    // reading as another hood. Sample the existing rear-deck slope exactly.
    const deck = (x: number, s: number): THREE.Vector3 => {
      const t = (spec.rearGlassBase - s) / (spec.rearGlassBase + half - .1);
      const y = THREE.MathUtils.lerp(beltTop + .02, belt + .04, t) + .035;
      return new THREE.Vector3(x, y + sectionLift(spec,x,y,s,'body') + .003, Z(s));
    };
    const innerS = spec.rearGlassBase - .16, outerS = -half + .24;
    for (const side of [-1, 1]) rod(deck(side * width * .32, innerS), deck(side * width * .32, outerS), .0035, trim);
    for (let segment = 0; segment < 8; segment++) {
      const x1 = width * .32 * (segment / 4 - 1), x2 = width * .32 * ((segment + 1) / 4 - 1);
      rod(deck(x1, outerS), deck(x2, outerS), .0035, trim);
    }
    panel(.13, .075, .07, chrome, 0, belt - .06, half + .015, .018);
    panel(.028, .035, .012, trim, 0, belt - .06, half + .058, .006);
  }

  if (options.decal) {
    const decal = new THREE.MeshBasicMaterial({ map: options.decal, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const size = Math.min(spec.height * 0.38, 0.82);
    for (const side of [-1, 1]) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), decal);
      plane.rotation.y = side * Math.PI / 2;
      plane.position.set(side * (flank(belt - 0.34) + 0.012), belt - 0.34, Z(spec.windshieldBase - 1.2 - size / 2));
      group.add(plane);
    }
  }
  // Expose only the small amount of mutable state needed by the world animation
  // pass. The geometry and materials remain owned by this factory.
  const sprungBody = new THREE.Group(); sprungBody.name = 'vehicle-sprung-body';
  const bodyRestHeight = spec.belt * .75;
  sprungBody.position.y = bodyRestHeight;
  // Keep every tyre on the ground while the body reacts to acceleration. The
  // local pivot is near the belt line so bumper ends do not swing about ground.
  for(const child of [...group.children]) if(!wheelGroups.includes(child as THREE.Group)) {
    child.position.y -= bodyRestHeight; sprungBody.add(child);
  }
  group.add(sprungBody);
  group.userData.vehicleRig = { wheels: wheelGroups, body: sprungBody, bodyRestHeight, wheelbase: spec.wheelbase, wheelRadius: spec.wheelRadius, headlamp, taillamp } satisfies VehicleRig;
  batchRigidParts(group);
  return group;
}
