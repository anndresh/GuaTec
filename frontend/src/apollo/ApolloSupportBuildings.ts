import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MaterialFactory } from './ApolloVehicles';
import type { SiteRect } from './ApolloSiteLayout';

/** Closed support-building kit, authored in local metres around the site footprint.
 * Facades suggest rooms and setbacks without opening the collision shell. */
export function buildSupportBuilding(
  spec: SiteRect & { height: number }, index: number, mat: MaterialFactory,
): THREE.Group {
  const { width: width, depth, height } = spec;
  const variant = ((index % 4) + 4) % 4;
  const root = new THREE.Group();
  root.name = `support-building-${variant}`;
  const wall = mat('building', 0xc2c2b7, .87);
  const roof = mat('roof', 0x5f6e6d, .7, .3);
  const glass = mat('service-window-glass', 0x344b50, .25, .25);
  const trim = mat('service-building-trim', 0xc4c6b4, .7, .12);
  const metal = mat('utility-pipe', 0x6d7d76, .65, .5);
  const recess = mat('support-building-recess', 0x374440, .88, .1);
  const accent = mat('support-building-brick', 0x916e56, .92, .05);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material,
    x: number, y: number, z: number, ry = 0, rx = 0): void => {
    matrix.compose(position.set(x, y, z), quaternion.setFromEuler(new THREE.Euler(rx, ry, 0)), scale);
    const baked = geometry.index ? geometry.toNonIndexed() : geometry;
    if (baked !== geometry) geometry.dispose();
    baked.applyMatrix4(matrix);
    const list = batches.get(material) ?? [];
    list.push(baked); batches.set(material, list);
  };
  const box = (w: number, h: number, d: number, material: THREE.Material,
    x: number, y: number, z: number, ry = 0): void =>
    add(new THREE.BoxGeometry(w, h, d), material, x, y, z, ry);
  const pipe = (radius: number, h: number, material: THREE.Material,
    x: number, y: number, z: number): void =>
    add(new THREE.CylinderGeometry(radius, radius, h, 6), material, x, y, z);
  const pitchedRoof = (w: number, d: number, rise: number, x: number, y: number, z: number): void => {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0);
    shape.lineTo(0, rise); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
    geometry.translate(0, 0, -d / 2); add(geometry, roof, x, y, z);
  };

  // The closed core sits behind the structural grid, giving real reveal depth
  // without open interiors. The existing site footprint remains the collider.
  box(width - .28, height, depth - .28, wall, 0, height / 2, 0);
  const plinthHeight = variant === 0 ? .86 : variant === 3 ? .68 : .44;
  box(width + .16, plinthHeight, depth + .16, accent, 0, plinthHeight / 2, 0);
  box(width + .32, .12, depth + .32, trim, 0, plinthHeight + .06, 0);
  box(width + .24, .16, depth + .24, recess, 0, height - .14, 0);
  box(width + .56, .15, depth + .56, trim, 0, height + .015, 0);
  box(width - .5, .14, depth - .5, roof, 0, height + .14, 0);

  // Parapets cast a narrow edge shadow and hide the flat roof's service runs.
  const parapetHeight = variant === 1 ? .3 : .48;
  for (const side of [-1, 1]) {
    box(width + .1, parapetHeight, .22, wall, 0, height + .08 + parapetHeight / 2, side * (depth / 2 - .06));
    box(.22, parapetHeight, depth, wall, side * (width / 2 - .06), height + .08 + parapetHeight / 2, 0);
    box(width + .32, .09, .4, metal, 0, height + .125 + parapetHeight, side * (depth / 2 - .06));
    box(.4, .09, depth + .12, metal, side * (width / 2 - .06), height + .125 + parapetHeight, 0);
  }

  for (let face = 0; face < 4; face++) {
    const angle = face * Math.PI / 2, along = face % 2 ? depth : width;
    const outside = (face % 2 ? width : depth) / 2;
    const sine = Math.sin(angle), cosine = Math.cos(angle);
    const facadeBox = (w: number, h: number, d: number, material: THREE.Material,
      u: number, y: number, offset: number): void =>
      box(w, h, d, material, cosine * u + sine * (outside + offset), y,
        -sine * u + cosine * (outside + offset), angle);
    const facadePipe = (u: number, y: number, offset: number, h: number): void =>
      pipe(.055, h, metal, cosine * u + sine * (outside + offset), y,
        -sine * u + cosine * (outside + offset));
    const facadeTube = (points: readonly (readonly [number, number, number])[], radius: number): void => {
      const curve = new THREE.CatmullRomCurve3(points.map(([u, y, offset]) =>
        new THREE.Vector3(cosine * u + sine * (outside + offset), y,
          -sine * u + cosine * (outside + offset))));
      add(new THREE.TubeGeometry(curve, 4, radius, 5, false), metal, 0, 0, 0);
    };
    const window = (u: number, y: number, w: number, h: number, split = true): void => {
      facadeBox(w + .36, h + .3, .18, recess, u, y, -.055);
      facadeBox(w, h, .035, glass, u, y, .045);
      for (const side of [-1, 1]) {
        facadeBox(.15, h + .22, .42, trim, u + side * (w / 2 + .06), y, .13);
        facadeBox(w + .28, .12, .38, trim, u, y + side * (h / 2 + .07), .13);
      }
      facadeBox(w + .3, .1, .34, metal, u, y - h / 2 - .12, .17);
      if (split) {
        facadeBox(.07, h, .1, metal, u, y, .11);
        facadeBox(w, .06, .1, metal, u, y + h * .14, .11);
      }
      if (face !== 2 && variant !== 3) {
        // Deep Florida sun hoods give the occupied elevations a readable shadow
        // line. Each shelf is borne by two triangular wall brackets, not floats.
        const shadeY = y + h / 2 + .26;
        facadeBox(w + .44, .1, .6, trim, u, shadeY, .32);
        for (const side of [-1, 1]) {
          const profile = new THREE.Shape();
          profile.moveTo(.035, 0); profile.lineTo(.56, 0);
          profile.lineTo(.035, -.3); profile.closePath();
          const bracket = new THREE.ExtrudeGeometry(profile, { depth: .07, bevelEnabled: false });
          bracket.rotateY(-Math.PI / 2); bracket.translate(.035, 0, 0);
          const bracketU = u + side * (w / 2 + .08);
          add(bracket, metal, cosine * bracketU + sine * outside, shadeY - .05,
            -sine * bracketU + cosine * outside, angle);
        }
      }
    };
    const louver = (u: number, y: number, w = 1.6, h = .95): void => {
      facadeBox(w + .16, h + .14, .09, trim, u, y, .06);
      facadeBox(w, h, .06, recess, u, y, .125);
      for (let row = 0; row < 6; row++) facadeBox(w - .06, .06, .14, metal, u, y - h * .4 + row * h * .16, .17);
    };
    // Wall piers, head band and shallow panels give lateral elevations the same
    // level of authorship as the entrance that faces away from some work yards.
    facadeBox(along - .7, .18, .16, trim, 0, height - .68, .08);
    // Recessed horizontal bed joints establish the scale of the concrete-block
    // walls. They stay behind windows, piers and door hardware.
    for (let y = 1.2; y < height - .8; y += 1.2)
      facadeBox(along - 1.1, .025, .02, metal, 0, y, -.125);
    for (const side of [-1, 1]) {
      facadeBox(.66, height - .7, .66, trim, side * (along / 2 - .48), height / 2 + .13, .18);
      const drainU = side * (along / 2 - .84);
      facadePipe(drainU, height / 2 + .08, .17, height - .35);
      // Scuppers connect the roof to each downpipe, with spaced saddle clamps
      // and a curved outlet ending over the existing drainage apron.
      facadeBox(.32, .24, .3, metal, drainU, height + .28, .13);
      facadeBox(.22, .1, .025, recess, drainU, height + .29, .292);
      facadeTube([[drainU, height + .3, .15], [drainU, height + .1, .23], [drainU, height - .15, .17]], .055);
      facadeTube([[drainU, .3, .17], [drainU, .18, .23], [drainU, .13, .4]], .055);
      for (let y = .65; y < height - .3; y += 1.35) {
        facadeBox(.19, .09, .22, metal, drainU, y, .12);
      }
    }
    const hasEntry = face === 0;
    const hasGarage = face === 2 && (variant === 1 || variant === 2);
    const bayCount = Math.max(3, Math.floor((along - 2) / 4.6));
    const spacing = (along - 3.3) / bayCount;
    const windowHeight = variant === 1 ? 1.0 : variant === 3 ? 1.25 : 1.55;
    const windowY = variant === 1 ? height - 1.55 : variant === 3 ? height - 1.75 : 3.05;
    const windowWidth = Math.min(3.25, spacing - .5);
    for (let bay = 0; bay < bayCount; bay++) {
      const u = (bay - (bayCount - 1) / 2) * spacing;
      const openingWidth = hasGarage ? (variant === 2 ? 5.2 : 4.2) : 2.4;
      if ((hasEntry || hasGarage) && Math.abs(u) < openingWidth / 2 + windowWidth / 2 + .3) continue;
      window(u, windowY, windowWidth, windowHeight);
      // Whole spandrel panels and projecting bay cheeks carry the elevation at
      // walking distance. Their proportions distinguish office, plant and radio.
      const spandrelHeight = variant === 1 ? 1.55 : variant === 3 ? 1.03 : .86;
      const spandrelTop = windowY - windowHeight / 2 - .18;
      facadeBox(windowWidth + .26, spandrelHeight, .19,
        variant === 1 ? metal : variant === 3 ? accent : roof,
        u, spandrelTop - spandrelHeight / 2, .035);
      for (const side of [-1, 1]) {
        const cheekTop = windowY + windowHeight / 2 + .3;
        const cheekBottom = plinthHeight + .12;
        const cheekY = variant === 3 ? (cheekTop + cheekBottom) / 2 : windowY;
        const cheekHeight = variant === 3 ? cheekTop - cheekBottom : windowHeight + .52;
        facadeBox(.18, cheekHeight, .6, trim,
          u + side * (windowWidth / 2 + .19), cheekY, .23);
      }
    }
    if (variant === 0 || variant === 3) {
      // A continuous beam joins occupied bays; the entry portal intersects it.
      // Communications uses a deeper continuous visor in place of small hoods.
      facadeBox(along - 1.16, variant === 3 ? .23 : .17,
        variant === 3 ? .68 : .52, trim, 0,
        windowY + windowHeight / 2 + .29, variant === 3 ? .31 : .23);
    } else {
      for (let pier = 1; pier < bayCount; pier++) {
        const u = (pier - bayCount / 2) * spacing;
        if ((hasEntry || hasGarage) && Math.abs(u) < (hasGarage ? 3.1 : 2.9)) continue;
        facadeBox(.48, height - .72, .64, trim, u, height / 2 + .12, .18);
      }
    }
    // Hairline expansion joints sit in pier gaps, never over the glazing.
    for (const u of [-along * .28, along * .28]) {
      facadeBox(.035, height - .88, .025, metal, u, height / 2 + .12, .016);
    }
    if (hasEntry) {
      // A full-height entrance bay gives each building a clear architectural
      // centre. The solid door stays closed behind the column-and-lintel frame.
      const entryWidth = variant === 1 ? 5.3 : 5.1;
      for (const side of [-1, 1]) {
        facadeBox(.68, height - .36, .68, variant === 0 || variant === 3 ? accent : trim,
          side * (entryWidth / 2 - .34), height / 2, .25);
        facadeBox(.84, .22, .76, trim, side * (entryWidth / 2 - .34), .22, .25);
      }
      facadeBox(entryWidth, .66, .68, trim, 0, height - .65, .25);
      facadeBox(entryWidth - 1.36, .16, .58, recess, 0, height - 1.06, .24);
      facadeBox(2.4, 3.12, .07, recess, 0, 1.91, .045);
      facadeBox(1.98, 2.78, .045, variant === 1 ? metal : roof, 0, 1.8, .104);
      for (const side of [-1, 1]) facadeBox(.12, 2.98, .17, trim, side * 1.1, 1.9, .12);
      facadeBox(2.35, .12, .17, trim, 0, 3.39, .12);
      facadeBox(.72, .72, .04, glass, -.3, 2.38, .145);
      facadeBox(.1, .42, .08, metal, .66, 1.8, .18);
      facadeBox(.025, 2.74, .018, recess, 0, 1.8, .134);
      for (const y of [.72, 1.84, 3.0]) {
        facadeBox(.095, .19, .045, metal, -1.01, y, .2);
        facadePipe(-1.01, y, .23, .2);
      }
      facadeBox(1.85, .19, .025, metal, 0, .53, .14);
      // This short rain hood remains wholly within the .7 m collider allowance.
      facadeBox(entryWidth - .3, .18, .64, metal, 0, 3.55, .3);
      for (const u of [-1.15, 1.15]) facadeBox(.08, .36, .3, trim, u, 3.34, .18);
      facadeBox(2.35, .11, .46, metal, 0, .53, .23);
      // Recessed directory plaque and unlit practical luminaire need no text map.
      const directoryU = entryWidth / 2 - .34;
      facadeBox(.62, .53, .07, recess, directoryU, 2.22, .63);
      for (let row = 0; row < 3; row++) facadeBox(.48 - row * .07, .025, .025, trim, directoryU, 2.36 - row * .12, .68);
      facadeBox(.58, .18, .25, recess, 0, 3.98, .14);
      facadeBox(.4, .07, .2, trim, 0, 3.89, .15);
    }
    if (hasGarage) {
      const w = variant === 2 ? 5.2 : 4.2;
      for (const side of [-1, 1]) facadeBox(.5, 4.25, .65, trim, side * (w / 2 + .42), 2.24, .23);
      facadeBox(w + 1.34, .42, .65, trim, 0, 4.55, .23);
      facadeBox(w + .32, 3.77, .08, recess, 0, 2.3, .048);
      facadeBox(w, 3.5, .055, metal, 0, 2.25, .105);
      for (const side of [-1, 1]) facadeBox(.16, 3.75, .18, trim, side * (w / 2 + .08), 2.3, .14);
      facadeBox(w + .35, .2, .26, trim, 0, 4.18, .15);
      for (let row = 0; row < 13; row++) facadeBox(w - .12, .035, .045, recess, 0, .64 + row * .255, .151);
      facadeBox(.7, .08, .06, trim, 0, .95, .18);
      for (const side of [-1, 1]) {
        // Rubber seals, lifting handles and lock plates belong to the closed
        // roller shutter; no new doorway is implied in the collision shell.
        facadeBox(.045, 3.48, .035, recess, side * (w / 2 - .05), 2.25, .153);
        facadeBox(.38, .15, .035, recess, side * w * .32, 1.14, .162);
        facadeBox(.28, .045, .065, trim, side * w * .32, 1.14, .2);
      }
      facadeBox(.3, .35, .12, recess, w / 2 + .44, 1.48, .59);
      facadeBox(.14, .045, .025, trim, w / 2 + .44, 1.54, .665);
    }
    if (face % 2) {
      louver(-along * .29, 1.22, variant === 1 ? 2.1 : 1.6);
      if (variant !== 0) louver(along * .29, 1.22);
      // Surface conduit follows an existing wall rather than creating obstacles.
      facadeBox(along * .48, .065, .07, metal, 0, .94, .11);
      facadeBox(.065, .65, .07, metal, along * .23, 1.23, .11);
      // Weatherproof disconnect and analogue meter, sized to read at walking
      // distance. The service assembly stays inside the existing .7 m envelope.
      const serviceU = along * .23;
      facadeBox(.65, .83, .20, recess, serviceU, 1.73, .16);
      facadeBox(.56, .74, .055, metal, serviceU, 1.73, .285);
      facadeBox(.74, .08, .35, trim, serviceU, 2.19, .20);
      facadeBox(.12, .24, .055, recess, serviceU + .19, 1.63, .33);
      facadeBox(.035, .16, .08, trim, serviceU + .19, 1.65, .37);
      for (const y of [1.49, 1.97]) {
        facadeBox(.075, .13, .055, trim, serviceU - .25, y, .33);
      }
      const meterU = serviceU - .07, meterY = 1.88;
      const meterX = cosine * meterU + sine * (outside + .36);
      const meterZ = -sine * meterU + cosine * (outside + .36);
      add(new THREE.CylinderGeometry(.13, .13, .045, 12), recess,
        meterX, meterY, meterZ, angle, Math.PI / 2);
      add(new THREE.CylinderGeometry(.105, .105, .015, 12), glass,
        cosine * meterU + sine * (outside + .395), meterY,
        -sine * meterU + cosine * (outside + .395), angle, Math.PI / 2);
      facadeBox(.02, .085, .012, trim, meterU, meterY + .015, .409);
      facadeBox(.30, .09, .012, trim, serviceU - .035, 1.46, .321);
    }
    if (face === 3) {
      // A fixed service ladder provides a recognisable roof-access silhouette.
      // Its stand-off and top hooks remain inside the .7 m collider margin.
      const u = along / 2 - 1.65;
      for (const side of [-1, 1]) {
        facadePipe(u + side * .34, height / 2 + .67, .33, height + .14);
        facadeTube([[u + side * .34, height + .7, .33], [u + side * .34, height + .95, .23],
          [u + side * .34, height + .94, -.15], [u + side * .34, height + .58, -.28]], .04);
        for (let y = .9; y < height; y += 1.8)
          facadeBox(.1, .12, .36, metal, u + side * .34, y, .16);
      }
      for (let y = .67; y < height + .4; y += .3)
        facadeBox(.69, .045, .065, metal, u, y, .33);
    }
  }

  const rooftopUnit = (x: number, z: number, w: number, d: number, h = .96): void => {
    box(w + .22, .16, d + .22, recess, x, height + .28, z);
    box(w, h, d, metal, x, height + .36 + h / 2, z);
    box(w + .14, .1, d + .14, trim, x, height + .41 + h, z);
    for (let row = 0; row < 5; row++) {
      box(w - .2, .055, .07, recess, x, height + .52 + row * (h - .18) / 5, z + d / 2 + .025);
      box(.07, .055, d - .2, recess, x + w / 2 + .025, height + .52 + row * (h - .18) / 5, z);
    }
    // Capped fan wells and guard bars are geometry in the existing metal/recess
    // batches. No extra transparent layers, texture maps or dynamic lights.
    const fanRadius = Math.min(w, d) * .29;
    pipe(fanRadius + .07, .1, recess, x, height + .51 + h, z);
    pipe(fanRadius, .035, metal, x, height + .575 + h, z);
    pipe(fanRadius * .82, .025, recess, x, height + .604 + h, z);
    pipe(.09, .07, metal, x, height + .63 + h, z);
    for (let bar = -2; bar <= 2; bar++) {
      const offset = bar * fanRadius * .3;
      const span = 2 * Math.sqrt(fanRadius ** 2 - offset ** 2);
      box(span, .025, .025, trim, x, height + .65 + h, z + offset);
    }
  };

  const rooflight = (x: number, z: number): void => {
    const y = height + .43, w = 3.4, d = 1.35;
    box(w + .18, .14, d + .18, recess, x, height + .25, z);
    // A sloped solid curb carries the glazing all the way to its high edge.
    const curb = new THREE.Shape();
    curb.moveTo(-d / 2, .31); curb.lineTo(d / 2, .31);
    curb.lineTo(d / 2, .329); curb.lineTo(-d / 2, .491); curb.closePath();
    const curbGeometry = new THREE.ExtrudeGeometry(curb, { depth: w, bevelEnabled: false });
    curbGeometry.translate(0, 0, -w / 2); curbGeometry.rotateY(Math.PI / 2);
    add(curbGeometry, recess, x, height, z);
    add(new THREE.BoxGeometry(w, .045, d), glass, x, y, z, 0, -.12);
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(.085, .075, d + .14), metal, x + side * w / 2, y + .02, z, 0, -.12);
      box(w, .075, .075, metal, x, y + .02 + side * d * .06, z + side * d / 2);
    }
    for (const offset of [-w / 6, w / 6])
      add(new THREE.BoxGeometry(.055, .065, d), trim, x + offset, y + .025, z, 0, -.12);
  };
  if (variant === 0) {
    // Office plant: a broad air handler and secondary unit share a continuous
    // low duct plinth. The L return enters the second housing instead of floating.
    rooftopUnit(-width * .21, -depth * .12, 6.3, 4.0, 1.28);
    rooftopUnit(width * .23, depth * .2, 2.5, 2.1, .75);
    const ductLength = width * .44, ductX = width * .01;
    box(ductLength, .08, .85, recess, ductX, height + .25, -depth * .12);
    box(ductLength, .4, .65, metal, ductX, height + .49, -depth * .12);
    box(.85, .08, depth * .32 + .85, recess, width * .23, height + .25, depth * .04);
    box(.65, .4, depth * .32 + .65, metal, width * .23, height + .49, depth * .04);
    pipe(.18, 1.3, roof, width * .25, height + .83, -depth * .27);
    box(.65, .12, .65, trim, width * .25, height + 1.52, -depth * .27);
    rooflight(-width * .2, depth * .27);
    rooflight(width * .13, -depth * .29);
  } else if (variant === 1) {
    // Utility block: an offset raised equipment gallery creates a stepped roof.
    box(width * .49, 1.25, depth * .48, wall, -width * .13, height + .84, -depth * .1);
    box(width * .49 + .36, .16, depth * .48 + .36, metal, -width * .13, height + 1.54, -depth * .1);
    // A recessed raised roof spine gives this utility gallery a stepped crown.
    box(width * .39, .28, depth * .37, recess, -width * .13, height + 1.76, -depth * .1);
    box(width * .39 + .22, .1, depth * .37 + .22, metal, -width * .13, height + 1.95, -depth * .1);
    for (let bay = 0; bay < 4; bay++) {
      const x = -width * .3 + bay * width * .112;
      box(width * .085, .6, .08, recess, x, height + .96, depth * .14 + .05);
      for (let row = 0; row < 4; row++) box(width * .08, .045, .11, trim, x, height + .73 + row * .15, depth * .14 + .1);
    }
    rooftopUnit(width * .29, depth * .14, 2.8, 2.8, 1.15);
    // Paired low extract cowls distinguish the service block from the offices.
    // Broad flashing plates and flanged necks connect every hood to the roof.
    for (const side of [-1, 1]) {
      const x = width * .21 + side * .77, z = -depth * .28;
      box(1.12, .12, 1.12, recess, x, height + .25, z);
      pipe(.32, .84, metal, x, height + .73, z);
      pipe(.39, .09, trim, x, height + .38, z);
      pipe(.5, .12, recess, x, height + 1.16, z);
      add(new THREE.CylinderGeometry(.28, .6, .25, 12), metal, x, height + 1.345, z);
      pipe(.3, .075, trim, x, height + 1.51, z);
    }
  } else if (variant === 2) {
    // Workshop block: two shallow pitched monitor roofs with glazed clerestories.
    for (const side of [-1, 1]) {
      const x = side * width * .22, w = width * .28, d = depth * .72;
      box(w, .72, d, wall, x, height + .58, -depth * .04);
      pitchedRoof(w + .3, d + .3, 1.0, x, height + .96, -depth * .04);
      box(.14, .09, d + .36, trim, x, height + 1.96, -depth * .04);
      for (let bay = 0; bay < 4; bay++) {
        const z = -d * .37 + bay * d * .25 - depth * .04;
        for (const edge of [-1, 1]) {
          box(.045, .45, d * .2, glass, x + edge * (w / 2 + .025), height + .66, z);
          box(.08, .5, .055, trim, x + edge * (w / 2 + .05), height + .66, z - d * .1);
        }
      }
    }
    rooftopUnit(0, depth * .32, 2.6, 1.8, .7);
  } else {
    // Communications block: long central plant duct, paired intake stacks and a
    // low capped vent gallery give a different silhouette from the office roofs.
    box(width * .62, .62, 3.0, metal, 0, height + .58, -depth * .13);
    for (const side of [-1, 1]) {
      rooftopUnit(side * width * .23, -depth * .13, 2.8, 3.0, 1.1);
      pipe(.34, 1.4, metal, side * width * .12, height + .91, depth * .24);
      pipe(.52, .16, recess, side * width * .12, height + 1.62, depth * .24);
      pipe(.55, .1, trim, side * width * .12, height + 1.75, depth * .24);
    }
    box(width * .42, .18, 3.2, trim, 0, height + .98, -depth * .13);
    rooflight(0, depth * .25);
    // A low directional aerial stays below the roof equipment height allowance.
    // Its feet, twin uprights, boom and graduated elements form one connected rig.
    const aerialX = width * .25, aerialZ = depth * .29, aerialY = height + 1.96;
    for (const side of [-1, 1]) {
      box(.58, .14, .58, recess, aerialX + side * .85, height + .28, aerialZ);
      pipe(.07, 1.63, metal, aerialX + side * .85, height + 1.145, aerialZ);
      box(.24, .12, .18, trim, aerialX + side * .85, aerialY - .05, aerialZ);
    }
    box(3.1, .065, .065, metal, aerialX, aerialY, aerialZ);
    for (let element = 0; element < 6; element++) {
      const x = aerialX - 1.35 + element * .51;
      box(.045, .045, 1.32 - element * .12, trim, x, aerialY + .055, aerialZ);
    }
  }

  let triangles = 0;
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach(part => part.dispose());
    if (!geometry) throw new Error('Support-building material batch could not be merged.');
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `support-building-${variant}-${material.name || material.uuid}`;
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    triangles += geometry.getAttribute('position').count / 3;
  }
  root.userData.supportBuilding = { variant, footprint: { width, depth, height }, materials: batches.size, triangles };
  return root;
}
