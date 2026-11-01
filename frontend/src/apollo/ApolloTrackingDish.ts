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
    add(new THREE.CylinderGeometry(rt, rb, h, 16), material, new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotationZ), dish);
  };
  const beam = (a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, dish = false): void => {
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    add(new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), 6), material, a.clone().add(b).multiplyScalar(.5), quaternion, dish);
  };
  const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
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
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false)!;
    geometries.forEach(part => part.dispose());
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
  }
  return root;
}
