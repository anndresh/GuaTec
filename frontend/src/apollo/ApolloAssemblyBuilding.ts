import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {MaterialFactory} from './ApolloVehicles';

/** Original architectural interpretation at the established VAB metre scale.
 * No modern facade insignia; the high-bay silhouette stays readable in both LODs. */
export function buildAssemblyBuilding(mat: MaterialFactory, detailed = true): THREE.Group {
  const root = new THREE.Group(); root.name = detailed ? 'vab-high-bay-detail' : 'vab-distant-shell';
  const wall = mat('building', 0xc2c2b7, .87);
  const roof = mat('roof', 0x5f6e6d, .7, .3);
  const door = mat('vab-door', 0x929e9f, .75, .25);
  const recess = mat('vab-recess', 0x4b5e60, .84, .2);
  const trim = mat('vab-cladding-trim', 0xd2d2c6, .77, .15);
  const steel = mat('galvanized', 0xa4aaa5, .58, .7);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number): void => {
    const source = new THREE.BoxGeometry(w, h, d), geometry = source.toNonIndexed();
    source.dispose();
    geometry.translate(x, y, z);
    const list = batches.get(material) ?? []; list.push(geometry); batches.set(material, list);
  };
  box(158, 160, 134, wall, 0, 80, 0);
  box(160, 1.8, 136, roof, 0, 160.9, 0);
  box(159, 2.5, 135, door, 0, 1.25, 0);
  for (const side of [-1, 1]) {
    // Two tall portals on each rollout elevation, instead of six featureless strips.
    for (const x of [-38, 38]) {
      box(47, 141, .36, detailed ? recess : door, x, 70.5, side * 67.2);
      box(40.5, 137, .4, door, x, 68.5, side * 67.43);
      if (!detailed) continue;
      // Lower rollout leaves, then a stack of vertical-lift panels and guide rails.
      for (let leaf = 0; leaf < 6; leaf++) {
        box(6.6, 21, .18, steel, x - 16.75 + leaf * 6.7, 10.6, side * 67.76);
        box(.12, 20.6, .2, recess, x - 20 + leaf * 6.7, 10.6, side * 67.88);
      }
      for (let panel = 0; panel < 8; panel++) {
        const y = 22 + panel * 14.35;
        box(40, 13.95, .17, door, x, y + 6.98, side * 67.76);
        box(40, .3, .22, trim, x, y, side * 67.9);
        for (const offset of [-13, 0, 13]) box(.18, 13.5, .16, steel, x + offset, y + 7, side * 67.89);
      }
      for (const offset of [-21.3, 21.3]) {
        // A stepped channel, inner running face and wall cleats make the lift
        // guides read as supported hardware rather than painted vertical lines.
        box(1.2, 139, .85, steel, x + offset, 69.5, side * 67.52);
        box(.5, 138, .08, recess, x + offset, 69.5, side * 67.99);
        box(.14, 138, .1, steel, x + offset, 69.5, side * 68.04);
        const outerX = x + Math.sign(offset) * 23.2;
        box(2, 141, 1, trim, outerX, 70.5, side * 67.45);
        for (const y of [7, 35, 63, 91, 119, 137])
          box(2.4, .65, .18, steel, x + offset, y, side * 67.98);
      }
      box(48.4, 3, 1, trim, x, 141, side * 67.45);
      box(44, .65, .16, recess, x, 139.55, side * 68.01);
      // The ventilation gallery sits between the portal lintel and roof band.
      // Its dark backing and five framed bays establish the high-bay scale.
      box(42, 4.8, .26, recess, x, 150.2, side * 67.12);
      for (let slot = 0; slot < 5; slot++) {
        const ventX = x - 16.4 + slot * 8.2;
        box(7.6, .24, .55, steel, ventX, 152.6, side * 67.42);
        for (let row = 0; row < 2; row++)
          box(7.5, .22, .35, door, ventX, 149 + row * 1.6, side * 67.37);
      }
    }
    if (!detailed) continue;
    // Engaged pilasters and restrained cladding joints give the exposed side
    // elevations the same architectural density as the rollout face.
    for (const z of [-64, -42, -21, 0, 21, 42, 64]) {
      box(1.6, 157, 1.2, trim, side * 79.2, 80, z);
    }
    // Vertical expansion reveals divide broad cladding fields between the
    // engaged piers; they continue into the existing horizontal course pattern.
    for (const z of [-53, -31.5, -10.5, 10.5, 31.5, 53])
      box(.12, 139, .12, recess, side * 79.06, 87.5, z);
    for (let y = 12; y < 158; y += 8) box(.12, .1, 132, door, side * 79.08, y, 0);
    for (const z of [-53, -31.5, -10.5, 10.5, 31.5, 53]) {
      box(.16, 8, 10, recess, side * 79.14, 8.5, z);
      for (let row = 0; row < 5; row++) box(.24, .4, 9.7, steel, side * 79.25, 5.2 + row * 1.6, z);
      for (const edge of [-1, 1]) box(.5, 8.6, .25, trim, side * 79.3, 8.5, z + edge * 5.15);
      box(.85, .4, 10.55, steel, side * 79.4, 12.85, z);
    }
    for (const x of [-77.8, 0, 77.8]) box(1.6, 157, .4, trim, x, 80, side * 67.12);
    box(158, .9, .7, trim, 0, 157.8, side * 67.25);
    box(.7, .9, 134, trim, side * 79.25, 157.8, 0);
    // Roof edge returns and recessed intake grilles retain the existing height.
    box(160, .8, .4, trim, 0, 161.4, side * 67.6);
    box(.4, .8, 135, trim, side * 79.6, 161.4, 0);
    for (const x of [-66, 66]) {
      const z = side * 34;
      box(6.4, .1, 22.4, recess, x, 161.87, z);
      for (const edge of [-1, 1]) {
        box(.16, .08, 22.4, steel, x + edge * 3.12, 161.96, z);
        box(6.4, .08, .16, steel, x, 161.96, z + edge * 11.12);
      }
      for (let slat = 0; slat < 12; slat++) box(6, .08, .22, steel, x, 161.96, z - 10 + slat * 1.8);
    }
    // Small personnel entrances and a window band establish scale near grade.
    for (const x of [-70, 70]) {
      box(3, 4.1, .2, recess, x, 2.1, side * 67.35);
      box(3.8, .2, .7, steel, x, 4.4, side * 67.55);
      for (const offset of [-1.7, 1.7]) box(.18, 4.4, .3, trim, x + offset, 2.2, side * 67.5);
      box(7, 1.3, .17, recess, x, 8.3, side * 67.35);
      for (const offset of [-2.3, 0, 2.3]) box(.14, 1.4, .23, steel, x + offset, 8.3, side * 67.48);
    }
  }
  let triangles = 0;
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false)!;
    geometries.forEach(part => part.dispose());
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = false; mesh.receiveShadow = true; root.add(mesh);
    triangles += geometry.getAttribute('position').count / 3;
  }
  root.userData.architecture = {detailed, triangles, batches: batches.size};
  return root;
}
