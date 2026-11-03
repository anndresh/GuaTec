import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MaterialFactory } from './ApolloVehicles';

/** An original support antenna, built in metres around the existing mast footprint. */
export function buildTrackingDish(mat: MaterialFactory): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ground-tracking-parabolic-antenna';
  const enamel = mat('tracking-dish-enamel', 0xd8d9cd, .62, .25);
  enamel.side = THREE.DoubleSide;
  const steel = mat('galvanized', 0xa4aaa5, .58, .7);
  const dark = mat('tracking-drive', 0x3b514e, .73, .35);
  const concrete = mat('concrete', 0xc1bda9, .9);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const dishMatrix = new THREE.Matrix4().makeRotationX(.62);
  dishMatrix.setPosition(0, 8.1, .3);
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), dish = false): void => {
    const local = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
    if (dish) local.premultiply(dishMatrix);
    const transformed = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    transformed.applyMatrix4(local); geometry.dispose();
    const list = batches.get(material) ?? []; list.push(transformed); batches.set(material, list);
  };
  const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number): void => add(new THREE.BoxGeometry(w, h, d), material, new THREE.Vector3(x, y, z));
  const cylinder = (rt: number, rb: number, h: number, material: THREE.Material, x: number, y: number, z: number, dish = false, rotationZ = 0): void => {
    add(new THREE.CylinderGeometry(rt, rb, h, 12), material, new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationZ), dish);
  };
  const beam = (a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material = steel, dish = false): void => {
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    add(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 6), material, a.clone().add(b).multiplyScalar(.5), quaternion, dish);
  };
  const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
  const hoop = (radius: number, tube: number, y: number, material: THREE.Material, dish = false): void =>
    add(new THREE.TorusGeometry(radius, tube, 6, 48), material, v(0, y, 0), new THREE.Quaternion().setFromAxisAngle(v(1, 0, 0), Math.PI / 2), dish);
  const cable = (points: THREE.Vector3[], radius: number, dish = false): void =>
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, radius, 5, false), dark, undefined, undefined, dish);
  // Concrete plinth, anchor bolts and a stepped azimuth bearing ground the assembly.
  box(3.2, .35, 3.2, concrete, 0, .175, 0);
  box(2.5, .15, 2.5, dark, 0, .425, 0);
  for (const x of [-1.08, 1.08]) for (const z of [-1.08, 1.08]) cylinder(.075, .075, .13, steel, x, .54, z);
  cylinder(.57, .86, 4.65, steel, 0, 2.825, 0);
  for (const y of [.72, 4.85, 5.13]) cylinder(.88, .88, .18, dark, 0, y, 0);
  cylinder(1.0, 1.0, .23, steel, 0, 5.34, 0);
  box(1.3, .65, 1.15, dark, 0, 5.77, 0);
  // Fork and tilt bearings: the reflector has a visible mechanical connection.
  for (const x of [-1.7, 1.7]) {
    beam(v(x * .38, 5.5, 0), v(x, 7.3, -.2), .13, steel);
    cylinder(.38, .38, .38, dark, x, 7.3, -.2, false, Math.PI / 2);
    cylinder(.24, .24, .41, steel, x, 7.3, -.2, false, Math.PI / 2);
    beam(v(x, 7.3, -.2), v(0, 7.3, -.2), .09, steel);
  }
  beam(v(0, 7.3, -.2), v(0, 7.95, .29), .22, dark);
  box(.65, 1.15, .48, dark, -.95, 4.06, .45);
  for (const y of [3.76, 3.94, 4.12, 4.3]) box(.5, .035, .05, steel, -.95, y, .71);
  beam(v(-.95, 4.6, .43), v(-.6, 5.3, .1), .045, dark);

  // A perforation-free service deck surrounds, rather than intersects, the mast.
  // The access opening faces the fixed ladder. All hardware stays inside the
  // existing 7.6 m square collision proxy, including the inclined reflector.
  const deck = new THREE.Shape();
  deck.moveTo(-1.45, -1.4); deck.lineTo(1.45, -1.4);
  deck.lineTo(1.45, 1.4); deck.lineTo(-1.45, 1.4); deck.closePath();
  const mastOpening = new THREE.Path(); mastOpening.absarc(0, 0, .84, 0, Math.PI * 2, true);
  deck.holes.push(mastOpening);
  const deckGeometry = new THREE.ExtrudeGeometry(deck, {depth: .1, bevelEnabled: false, curveSegments: 16});
  add(deckGeometry, steel, v(0, 4.67, 0), new THREE.Quaternion().setFromAxisAngle(v(1, 0, 0), -Math.PI / 2));
  for (const x of [-1.37, 1.37]) {
    beam(v(x * .38, 3.9, 0), v(x, 4.67, 1.25), .065);
    beam(v(x * .38, 3.9, 0), v(x, 4.67, -1.25), .065);
    for (const z of [-1.32, 0, 1.32]) beam(v(x, 4.77, z), v(x, 5.77, z), .035);
    for (const y of [5.25, 5.77]) beam(v(x, y, -1.32), v(x, y, 1.32), .035);
  }
  for (const y of [5.25, 5.77]) {
    beam(v(-1.37, y, -1.32), v(1.37, y, -1.32), .035);
    for (const side of [-1, 1]) beam(v(side * 1.37, y, 1.32), v(side * .43, y, 1.32), .035);
  }
  for (const x of [-.43, .43]) beam(v(x, 4.77, 1.32), v(x, 5.77, 1.32), .035);
  for (const x of [-.4, .4]) {
    beam(v(x, .35, 1.48), v(x, 5.75, 1.48), .045);
    for (const y of [.7, 2.5, 4.5]) beam(v(x, y, .55), v(x, y, 1.48), .035);
    box(.22, .07, .32, dark, x, .385, 1.48);
  }
  for (let y = .58; y < 4.75; y += .3) beam(v(-.4, y, 1.48), v(.4, y, 1.48), .03);
  // Flange fasteners, a drive motor and a handwheel establish mechanical scale.
  for (const y of [.85, 5.48]) for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    cylinder(.045, .045, .085, steel, Math.cos(angle) * .77, y, Math.sin(angle) * .77);
  }
  cylinder(.23, .23, .65, dark, .88, 5.75, 0, false, Math.PI / 2);
  for (const x of [.65, .82, .99, 1.16]) cylinder(.26, .26, .045, steel, x, 5.75, 0, false, Math.PI / 2);
  add(new THREE.TorusGeometry(.27, .025, 6, 20), dark, v(-1.3, 4.1, .45), new THREE.Quaternion().setFromAxisAngle(v(0, 1, 0), Math.PI / 2));
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    beam(v(-1.3, 4.1, .45), v(-1.3, 4.1 + Math.cos(a) * .27, .45 + Math.sin(a) * .27), .018, dark);
  }
  cable([v(-.9, 3.55, .45), v(-.85, 2.9, .58), v(-.65, 1.2, .45), v(-.4, .52, .4)], .035);
  cable([v(-.85, 4.5, .45), v(-1.05, 5.1, .2), v(-1.25, 6.2, -.2), v(-1.7, 7.3, -.2)], .035);

  // y = r² / (4f): a concave paraboloid with a real rim and focal feed.
  const radius = 3.3, focalLength = 2.6, rings = 12, segments = 64;
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let ring = 0; ring <= rings; ring++) {
    const r = radius * ring / rings;
    for (let segment = 0; segment <= segments; segment++) {
      const angle = segment / segments * Math.PI * 2;
      positions.push(Math.cos(angle) * r, r * r / (4 * focalLength), Math.sin(angle) * r);
      uvs.push(.5 + Math.cos(angle) * r / (2 * radius), .5 + Math.sin(angle) * r / (2 * radius));
      if (ring < rings && segment < segments) {
        const a = ring * (segments + 1) + segment, b = a + segments + 1;
        if (ring > 0) indices.push(a, a + 1, b);
        indices.push(a + 1, b + 1, b);
      }
    }
  }
  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  surface.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  surface.setIndex(indices); surface.computeVertexNormals();
  add(surface, enamel, undefined, undefined, true);
  const ringHeight = radius * radius / (4 * focalLength);
  add(new THREE.TorusGeometry(radius, .06, 6, 64), steel, v(0, ringHeight, 0), new THREE.Quaternion().setFromAxisAngle(v(1, 0, 0), Math.PI / 2), true);
  cylinder(.42, .65, .25, dark, 0, -.2, 0, true);
  // Rear concentric stiffeners tie the radial ribs to the central mounting hub.
  // Front panel joints follow the parabola instead of floating above its rim.
  for (const r of [1.2, 2.25]) hoop(r, .035, r * r / (4 * focalLength) - .09, steel, true);
  for (let panel = 0; panel < 16; panel++) {
    const angle = panel / 16 * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle);
    const samples = Array.from({length: 9}, (_, i) => {
      const r = .42 + (radius - .42) * i / 8;
      return v(c * r, r * r / (4 * focalLength) + .009, s * r);
    });
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(samples), 12, .009, 3, false), dark, undefined, undefined, true);
    beam(v(c * .43, -.3, s * .43), v(c * 2.25, 2.25 ** 2 / (4 * focalLength) - .09, s * 2.25), .025, steel, true);
    add(new THREE.BoxGeometry(.12, .045, .16), dark, v(c * 3.28, ringHeight + .01, s * 3.28), new THREE.Quaternion().setFromAxisAngle(v(0, 1, 0), -angle), true);
  }
  for (let spoke = 0; spoke < 16; spoke++) {
    const angle = spoke / 16 * Math.PI * 2;
    for (let step = 0; step < 5; step++) {
      const ra = .35 + (radius - .35) * step / 5, rb = .35 + (radius - .35) * (step + 1) / 5;
      // Stiffeners remain on the back; their tips join the reflector rim.
      beam(v(Math.cos(angle) * ra, ra * ra / (4 * focalLength) - .09, Math.sin(angle) * ra), v(Math.cos(angle) * rb, rb * rb / (4 * focalLength) - .09, Math.sin(angle) * rb), .035, steel, true);
    }
  }
  for (let leg = 0; leg < 3; leg++) {
    const angle = leg / 3 * Math.PI * 2;
    beam(v(Math.cos(angle) * 2.85, 2.85 ** 2 / (4 * focalLength), Math.sin(angle) * 2.85), v(0, focalLength, 0), .045, dark, true);
  }
  cylinder(.19, .11, .43, steel, 0, focalLength, 0, true);
  cylinder(.22, .22, .1, dark, 0, focalLength - .24, 0, true);
  // Feed flange and a cable strapped to one support leg. The rear loop provides
  // visible slack near the elevation bearing without suggesting a rigid pipe.
  cylinder(.25, .25, .045, steel, 0, focalLength + .2, 0, true);
  cable([v(.12, focalLength, 0), v(1.1, 2.05, .02), v(2.1, 1.25, .02), v(2.85, .76, 0), v(2.9, .44, 0), v(1.7, -.05, 0), v(.4, -.32, 0)], .023, true);
  let triangles = 0;
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(part => part.dispose());
    if (!geometry) throw new Error('Tracking antenna material batch could not be merged.');
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `tracking-dish-rigid-${material.name || material.uuid}`;
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    triangles += geometry.getAttribute('position').count / 3;
  }
  root.userData.trackingDish = {panels: 16, materials: batches.size, triangles};
  return root;
}
