import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MaterialFactory } from './ApolloVehicles';

/** Parked, period-inspired transport chassis. It is an educational interpretation,
 * not a dimensionally exact replica. Axes and metre scale match ApolloWorld. */
export function buildCrawler(mat: MaterialFactory): THREE.Group {
  const root = new THREE.Group();
  root.name = 'crawler-transport-chassis';
  const enamel = mat('crawler', 0x63746e, .75, .5);
  const tread = mat('crawler-track', 0x343e3c, .9, .25);
  const steel = mat('crawler-machined-steel', 0x9baba5, .5, .65);
  const ivory = mat('crawler-cab-enamel', 0xc9cabb, .65, .2);
  const glass = mat('crawler-cab-glass', 0x294a55, .22, .4);
  const caution = mat('crawler-caution', 0xc9a650, .8, .1);
  const red = mat('crawler-marker-red', 0x9c4336, .6, .15);
  const lamp = mat('crawler-work-lamp', 0xefe6c8, .35, .2);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const transform = new THREE.Matrix4();
  const orientation = new THREE.Quaternion();
  const unitScale = new THREE.Vector3(1, 1, 1);
  const position = new THREE.Vector3();

  // Bake all rigid detail into eight material batches. Neither extra textures nor
  // individual bolt/shoe draw calls are needed when seen from the support route.
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material,
    x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): void => {
    orientation.setFromEuler(new THREE.Euler(rx, ry, rz));
    transform.compose(position.set(x, y, z), orientation, unitScale);
    const baked = geometry.index ? geometry.toNonIndexed() : geometry;
    baked.applyMatrix4(transform);
    if (baked !== geometry) geometry.dispose();
    const batch = batches.get(material) ?? [];
    batch.push(baked); batches.set(material, batch);
  };
  const box = (w: number, h: number, d: number, material: THREE.Material,
    x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void =>
    add(new THREE.BoxGeometry(w, h, d), material, x, y, z, rx, ry, rz);
  const cylinder = (radius: number, height: number, material: THREE.Material,
    x: number, y: number, z: number, rx = 0, rz = 0, segments = 8): void =>
    add(new THREE.CylinderGeometry(radius, radius, height, segments), material, x, y, z, rx, 0, rz);
  const beam = (a: THREE.Vector3, b: THREE.Vector3, radius: number,
    material: THREE.Material = steel): void => {
    const delta = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 6);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
    add(geometry, material, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  };
  const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
  const chamferedPlate = (w: number, d: number, thickness: number,
    material: THREE.Material, x: number, y: number, z: number, cut = .65,
    well?: readonly [number, number]): void => {
    const a = w / 2, b = d / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-a + cut, -b); shape.lineTo(a - cut, -b);
    shape.lineTo(a, -b + cut); shape.lineTo(a, b - cut);
    shape.lineTo(a - cut, b); shape.lineTo(-a + cut, b);
    shape.lineTo(-a, b - cut); shape.lineTo(-a, -b + cut); shape.closePath();
    if (well) {
      const [wa, wb] = well.map(value => value / 2);
      const opening = new THREE.Path();
      opening.moveTo(-wa, -wb); opening.lineTo(-wa, wb);
      opening.lineTo(wa, wb); opening.lineTo(wa, -wb); opening.closePath();
      shape.holes.push(opening);
    }
    add(new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false }), material, x, y, z, -Math.PI / 2);
  };

  // The deep central hull becomes open braced framing, with two load-bearing
  // longitudinal beams and cross members visible between the track assemblies.
  for (const x of [-11, 11]) {
    box(1.25, 2.05, 31, enamel, x, 4.35, 0);
    box(2.1, .2, 31, steel, x, 3.38, 0);
  }
  for (const z of [-13, -6.5, 0, 6.5, 13]) {
    box(37, .62, 1.2, enamel, 0, 4.25, z);
    for (const side of [-1, 1]) {
      beam(v(side * 10, 3.55, z), v(side * 18.6, 5.25, z), .18, enamel);
      beam(v(side * 10, 5.15, z), v(side * 18.6, 3.6, z), .15, enamel);
    }
  }
  chamferedPlate(40, 34, .55, enamel, 0, 5.35, 0, 1.05, [14, 11]);
  chamferedPlate(40.5, 34.5, .14, steel, 0, 5.9, 0, 1.15, [14, 11]);
  // The maintenance well exposes engine housings and structural depth instead of
  // reading as a solid tabletop from the introduction's aerial camera.
  for (const side of [-1, 1]) {
    box(.28, .8, 11.4, enamel, side * 7, 5.65, 0);
    box(14.2, .8, .28, enamel, 0, 5.65, side * 5.5);
    for (const y of [6.55, 7.07]) {
      beam(v(side * 7.05, y, -5.5), v(side * 7.05, y, 5.5), .05, ivory);
      beam(v(-7, y, side * 5.55), v(7, y, side * 5.55), .05, ivory);
    }
    for (const z of [-5.5, 0, 5.5]) box(.1, 1.05, .1, ivory, side * 7.05, 6.55, z);
    for (const x of [-3.5, 0, 3.5]) box(.1, 1.05, .1, ivory, x, 6.55, side * 5.55);
  }
  // Four raised bearing saddles identify how the transporter supports a platform.
  for (const x of [-13, 13]) for (const z of [-10, 10]) {
    cylinder(.9, 2.8, enamel, x, 4.2, z);
    cylinder(.56, 1.8, steel, x, 5.1, z);
    box(3.6, .36, 3.2, ivory, x, 6.2, z);
    for (const dx of [-1.25, 1.25]) for (const dz of [-1, 1])
      cylinder(.12, .11, tread, x + dx, 6.435, z + dz);
  }
  // Engine rooms, access hatches and louvered ventilation sit below deck level.
  for (const side of [-1, 1]) {
    box(4.8, 1.7, 8.3, enamel, side * 4, 4.3, 0);
    box(4.65, .13, 8.15, steel, side * 4, 5.19, 0);
    for (const end of [-1, 1]) {
      box(4.2, 1.2, .08, tread, side * 4, 4.22, end * 4.2);
      for (let i = 0; i < 6; i++) box(4.05, .07, .1, steel, side * 4, 3.73 + i * .19, end * 4.26);
    }
    cylinder(.24, 8.8, steel, side * .9, 4.12, 0, Math.PI / 2);
    for (const z of [-3, 0, 3]) cylinder(.31, .13, ivory, side * .9, 4.12, z, Math.PI / 2);
  }

  // Each of the four corner trucks has two separate continuous belts. An actual
  // annular profile leaves the road wheels visible through the opening.
  const outline: [number, number][] = [[-3.12, .16], [3.12, .16], [3.92, 1.04], [3.92, 2.58], [3.12, 3.52], [-3.12, 3.52], [-3.92, 2.58], [-3.92, 1.04]];
  const opening: [number, number][] = [[-2.88, .68], [-3.35, 1.22], [-3.35, 2.36], [-2.88, 3.0], [2.88, 3.0], [3.35, 2.36], [3.35, 1.22], [2.88, .68]];
  for (const cx of [-15, 15]) for (const cz of [-12, 12]) {
    box(7.5, .72, 4.5, enamel, cx, 3.55, cz);
    cylinder(.8, 1.5, steel, cx, 3.45, cz);
    for (const lane of [-1.95, 1.95]) {
      const x = cx + lane, width = 3.25;
      const shape = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(z, y)));
      shape.holes.push(new THREE.Path(opening.map(([z, y]) => new THREE.Vector2(z, y))));
      const belt = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
      belt.translate(0, 0, -width / 2);
      add(belt, tread, x, 0, cz, 0, Math.PI / 2);
      for (let i = 0; i < outline.length; i++) {
        const [za, ya] = outline[i], [zb, yb] = outline[(i + 1) % outline.length];
        const length = Math.hypot(zb - za, yb - ya), count = Math.ceil(length / .62);
        const angle = -Math.atan2(yb - ya, zb - za);
        for (let step = 0; step < count; step++) {
          const t = (step + .5) / count;
          // Thicker lower shoes reach the ground plane; the belt shell
          // retains its clearance above them.
          box(width + .12, i === 0 ? .32 : .16, length / count * .87, steel, x, ya + (yb - ya) * t, cz + za + (zb - za) * t, angle);
        }
      }
      // Four separate load wheels touch the inner lower belt at y=.68. The
      // former five overlapping wheels were suspended .18 m above that belt.
      for (const dz of [-2.4, -.8, .8, 2.4]) {
        cylinder(.79, width + .04, enamel, x, 1.47, cz + dz, 0, Math.PI / 2, 12);
        for (const side of [-1, 1]) {
          cylinder(.36, .13, steel, x + side * (width / 2 + .07), 1.47, cz + dz, 0, Math.PI / 2);
          cylinder(.13, .17, tread, x + side * (width / 2 + .12), 1.47, cz + dz, 0, Math.PI / 2);
          // Diagonal suspension links meet the visible hub and bogie frame.
          beam(v(x + side * (width / 2 + .04), 2.28, cz + dz + .28),
            v(x + side * (width / 2 + .04), 1.47, cz + dz), .055, steel);
        }
      }
      // Upper return rollers contact the inner top belt without intersecting
      // the road wheels below. Thin end caps show the axle through the opening.
      for (const dz of [-1.6, 1.6]) {
        cylinder(.3, width + .02, enamel, x, 2.7, cz + dz, 0, Math.PI / 2);
        for (const side of [-1, 1]) {
          cylinder(.1, .08, steel, x + side * (width / 2 + .06), 2.7, cz + dz, 0, Math.PI / 2);
          beam(v(x + side * (width / 2 + .03), 2.28, cz + dz),
            v(x + side * (width / 2 + .03), 2.7, cz + dz), .045, enamel);
        }
      }
      // Distinct bogie frame connects the wheels to the steering pedestal.
      for (const side of [-1, 1]) box(.12, .42, 5.8, enamel, x + side * (width / 2 + .03), 2.28, cz);
    }
  }

  // Thin guard rails and open deck space retain the low transporter silhouette.
  for (const side of [-1, 1]) {
    for (const y of [6.55, 7.07]) {
      beam(v(-18.8, y, side * 17.12), v(18.8, y, side * 17.12), .055, ivory);
      beam(v(side * 20.05, y, -15.85), v(side * 20.05, y, 15.85), .055, ivory);
    }
    for (let i = 0; i <= 12; i++) {
      const x = -18.6 + i * 3.1;
      box(.1, 1.05, .1, ivory, x, 6.55, side * 17.12);
    }
    for (let i = 0; i <= 10; i++) box(.1, 1.05, .1, ivory, side * 20.05, 6.55, -15.5 + i * 3.1);
    box(38, .2, .1, caution, 0, 6.12, side * 17.14);
    box(.1, .2, 31.5, caution, side * 20.07, 6.12, 0);
  }

  // Diagonal operator cabins: dark framed glazing, pale roofs, sliding doors,
  // mirrors and small work lamps communicate human scale at a distance.
  for (const side of [-1, 1]) {
    const x = side * 17.4, z = -side * 13.9;
    chamferedPlate(4.1, 4.3, .26, ivory, x, 6.04, z, .35);
    box(3.9, .7, 4.1, ivory, x, 6.55, z);
    box(3.88, 1.06, 4.07, glass, x, 7.39, z);
    chamferedPlate(4.25, 4.45, .18, ivory, x, 7.94, z, .34);
    for (const dx of [-1.94, 0, 1.94]) for (const dz of [-2.04, 2.04])
      box(.12, 1.16, .12, ivory, x + dx, 7.38, z + dz);
    for (const dx of [-1.94, 1.94]) {
      box(.12, 1.16, .12, ivory, x + dx, 7.38, z);
      box(.09, .07, .48, steel, x + dx * 1.02, 6.6, z + .7);
      beam(v(x + dx, 7.5, z), v(x + dx * 1.24, 7.5, z), .035);
      box(.08, .35, .28, tread, x + dx * 1.24, 7.5, z);
    }
    for (const dx of [-1.4, 1.4]) {
      box(.42, .25, .14, lamp, x + dx, 6.62, z - side * 2.11);
      box(.24, .18, .12, red, x + dx, 6.55, z + side * 2.12);
      // Wiper arms sit on the outer glazing rather than inside the dark cab.
      beam(v(x + dx * .5, 6.89, z - side * 2.09),
        v(x + dx * .5 + .23, 7.57, z - side * 2.09), .018, tread);
      box(.62, .035, .035, tread, x + dx * .5 + .23, 7.57, z - side * 2.09);
    }
    for (const dx of [-1.96, 1.96]) {
      box(.035, .055, 3.9, steel, x + dx, 6.92, z);
      for (const dz of [-1.7, 1.7]) box(.045, .12, .14, steel, x + dx, 6.67, z + dz);
    }
    // Roof drip edge, rear intake grille and panel hinge blocks reuse the
    // existing eight material batches; none of these details adds a draw call.
    box(4.12, .06, .09, steel, x, 7.98, z + side * 2.12);
    box(1.45, .38, .045, tread, x, 6.53, z + side * 2.075);
    for (let row = 0; row < 4; row++) box(1.35, .035, .045, steel, x, 6.39 + row * .09, z + side * 2.105);
    box(.22, .16, .22, caution, x, 8.18, z);
    // Access stairway runs inboard, entirely inside the original footprint.
    const sx = side * 19.05, sz = side * 3.1;
    for (const dx of [-.65, .65]) {
      beam(v(sx + dx, .07, sz + 4.4), v(sx + dx, 6.06, sz), .075, ivory);
      beam(v(sx + dx, 1.02, sz + 4.4), v(sx + dx, 7.0, sz), .055, ivory);
      box(.25, .07, .38, steel, sx + dx, .035, sz + 4.4);
    }
    for (let i = 0; i < 22; i++) {
      const t = i / 21, y = .07 + t * 5.98;
      box(1.45, .14, .25, steel, sx, y, sz + 4.4 * (1 - t));
      if (i % 4 === 0 || i === 21) for (const dx of [-.65, .65])
        box(.06, .95, .06, ivory, sx + dx, y + .475, sz + 4.4 * (1 - t));
    }
  }

  let triangles = 0;
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(geometry => geometry.dispose());
    if (!merged) throw new Error('Crawler material batch could not be merged.');
    merged.computeBoundingBox(); merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = `crawler-rigid-${material.name || material.uuid}`;
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    triangles += merged.getAttribute('position').count / 3;
  }
  root.userData.crawlerModel = { trucks: 4, belts: 8, roadWheels: 32, returnRollers: 16,
    roadWheelRadius: .79, roadWheelCenterHeight: 1.47, innerBeltBottom: .68,
    roadWheelSpacing: 1.6, materials: batches.size, triangles };
  return root;
}
