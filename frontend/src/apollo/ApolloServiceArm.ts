import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MaterialFactory } from './ApolloVehicles';

/** Rigid service-arm kit. Local +X reaches from the tower hinge towards the
 * vehicle; the returned root retains the world's swing-away animation pivot. */
export function buildServiceArm(mat: MaterialFactory, index: number, length = 10.7): THREE.Group {
  if (!Number.isFinite(length) || length < 3) throw new Error('A service arm needs at least three metres of reach.');
  const root = new THREE.Group();
  root.name = `launch-service-arm-${index}`;
  const frame = mat('tower', 0x8f3c30, .64, .45);
  const steel = mat('galvanized', 0xa4aaa5, .58, .7);
  const dark = mat('pad-dark', 0x41494b, .83, .35);
  const deck = mat('service-arm-deck', 0xb8b9aa, .72, .3);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material,
    x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void => {
    matrix.compose(position.set(x, y, z), quaternion.setFromEuler(new THREE.Euler(rx, ry, rz)), scale);
    const baked = geometry.index ? geometry.toNonIndexed() : geometry;
    if (baked !== geometry) geometry.dispose();
    baked.applyMatrix4(matrix);
    const list = batches.get(material) ?? [];
    list.push(baked); batches.set(material, list);
  };
  const box = (w: number, h: number, d: number, material: THREE.Material,
    x: number, y: number, z: number): void => add(new THREE.BoxGeometry(w, h, d), material, x, y, z);
  const cylinder = (radius: number, length: number, material: THREE.Material,
    x: number, y: number, z: number, alongX = false): void =>
    add(new THREE.CylinderGeometry(radius, radius, length, 8), material, x, y, z, 0, 0, alongX ? Math.PI / 2 : 0);
  const beam = (a: THREE.Vector3, b: THREE.Vector3, thickness: number,
    material: THREE.Material): void => {
    const geometry = new THREE.BoxGeometry(thickness, a.distanceTo(b), thickness);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    add(geometry, material, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  };
  const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
  const start = .25, end = length - .16, center = (start + end) / 2;
  const bays = Math.max(3, Math.ceil((end - start) / 1.7)), bayLength = (end - start) / bays;

  // The deck sits on transverse bearers; both side frames have continuous upper
  // and lower chords with genuinely connected diagonal and vertical members.
  for (const side of [-1, 1]) {
    box(end - start + .22, .22, .18, frame, center, .17, side * 1.02);
    box(end - start + .16, .13, .13, frame, center, 1.13, side * 1.02);
    for (let bay = 0; bay <= bays; bay++) {
      const x = start + bay * bayLength;
      box(.12, 1.01, .12, frame, x, .64, side * 1.02);
      box(.09, 1.4, .09, steel, x, 1.17, side * 1.115);
      if (bay < bays) {
        const next = x + bayLength;
        beam(v(x, bay % 2 ? 1.13 : .23, side * 1.02), v(next, bay % 2 ? .23 : 1.13, side * 1.02), .095, frame);
      }
    }
    for (const y of [1.42, 1.86]) box(end - start + .12, .065, .065, steel, center, y, side * 1.115);
    // Edge curbs keep the paired service runs visually separate from the walkway.
    box(length - .35, .17, .055, dark, length / 2, .54, side * .91);
    cylinder(.075, length - .8, steel, length / 2, .7, side * .78, true);
    for (let clamp = 0; clamp < 5; clamp++) {
      const x = .8 + clamp * (length - 1.6) / 4;
      box(.14, .18, .23, dark, x, .65, side * .78);
      box(.12, .07, .3, steel, x, .79, side * .78);
    }
    // Side runs stop in capped manifolds inside the deck envelope.
    cylinder(.14, .14, steel, length - .33, .7, side * .78, true);
    cylinder(.1, .1, dark, length - .23, .7, side * .78, true);
  }
  for (let bay = 0; bay <= bays; bay++) {
    const x = start + bay * bayLength;
    box(.18, .2, 2.23, frame, x, .29, 0);
    if (bay < bays) beam(v(x, .25, -1.0), v(x + bayLength, .25, 1.0), .07, dark);
  }
  // Broad deck sheets are divided by narrow crosswise strips. The top remains
  // continuous, so the walkway has no accidental holes beneath its railings.
  box(length - .12, .12, 2.22, deck, length / 2, .43, 0);
  const treads = Math.floor((length - .7) / .333);
  for (let tread = 0; tread <= treads; tread++) box(.035, .025, 1.66, steel, .35 + tread * (length - .7) / treads, .503, 0);
  for (const z of [-.52, 0, .52]) box(length - .45, .021, .025, dark, length / 2, .505, z);

  // Hinge bearing, mounting cheek plates and end diaphragm give both ends a
  // clear structural termination instead of rails and beams ending in mid-air.
  box(.3, .17, 2.48, frame, .15, .12, 0);
  box(.2, .98, 2.23, frame, .15, .62, 0);
  cylinder(.15, 1.13, steel, .16, .72, 0);
  for (const y of [.2, 1.2]) cylinder(.18, .11, dark, .18, y, 0);
  box(.16, .35, 2.22, frame, length - .1, .32, 0);
  // One connected, compact valve and paired fairleads are legible at the end.
  const serviceSide = index % 2 ? 1 : -1;
  cylinder(.035, .28, dark, length * .81, .8, serviceSide * .78);
  add(new THREE.TorusGeometry(.14, .025, 5, 12), frame, length * .81, .94, serviceSide * .78, Math.PI / 2);
  for (const z of [-.45, .45]) {
    box(.35, .32, .24, dark, length - .36, .65, z);
    cylinder(.12, .2, steel, length - .36, .83, z, true);
  }

  // A compact central umbilical bends down to the model's declared connection
  // point. It reaches the skin without burying a full-width deck in the vehicle.
  box(.35, .24, .45, steel, length - .18, .61, 0);
  const umbilical = new THREE.CatmullRomCurve3([v(length - .24, .72, 0), v(length + .04, .58, 0), v(length + .25, .25, 0), v(length + .4, .1, 0)]);
  add(new THREE.TubeGeometry(umbilical, 10, .06, 6, false), dark, 0, 0, 0);
  cylinder(.09, .1, steel, length + .4, .1, 0, true);
  cylinder(.066, .018, dark, length + .441, .1, 0, true);

  if (index === 6) {
    // The high service passage is partly enclosed. Roof, posts and side panels
    // form one connected canopy, while the ends deliberately remain open.
    box(length - 1.2, .13, 2.3, deck, length / 2, 2.025, 0);
    for (const side of [-1, 1]) {
      box(length - 1.4, .57, .07, deck, length / 2, .87, side * 1.115);
      box(length - 1.4, .3, .065, deck, length / 2, 1.78, side * 1.115);
      for (let post = 0; post < 5; post++) {
        const x = .75 + post * (length - 1.5) / 4;
        box(.085, 1.5, .09, steel, x, 1.25, side * 1.115);
      }
    }
    for (const x of [.75, length / 2, length - .75]) box(.09, .09, 2.23, steel, x, 1.97, 0);
  }

  let triangles = 0;
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(part => part.dispose());
    if (!geometry) throw new Error('Service-arm material batch could not be merged.');
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `service-arm-${index}-${material.name || material.uuid}`;
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    triangles += geometry.getAttribute('position').count / 3;
  }
  root.userData.serviceArm = { index, bays, length, terminal: { x: length + .45, y: .1, z: 0 }, triangles, batches: batches.size, covered: index === 6 };
  return root;
}
