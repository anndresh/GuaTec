import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {STAND_DESIGNS, standIndicatorPosition, standHasIdentityPost, standUsesPower, type StandModelKind} from './ApolloStandDesigns';
import {CABLE_CHANNELS,CABLE_TARGET_ORDER} from './ApolloStandRules';
export type {StandModelKind} from './ApolloStandDesigns';

export type StandMaterialFactory = (name: string, color: number, roughness?: number, metalness?: number) => THREE.MeshStandardMaterial;
export interface StandMovingPart { node:THREE.Group; axis:'y'|'z'; speed:number; activity:'weather'|'tracking' }
export type StandControlChannel = 'power-lever' | 'power-meter' | 'telemetry-0' | 'telemetry-1' | 'telemetry-2' | 'weather-heading' | 'weather-cloud';
export interface StandControlPart { node:THREE.Group; axis:'x'|'y'|'z'; channel:StandControlChannel }

/** Ground-plane proxies are kept separate from the visual mesh batches. */
export function standCollisionProxies(kind: StandModelKind, x: number, z: number): {x:number;z:number;w:number;d:number}[] {
  const design=STAND_DESIGNS[kind];
  const colliders=[{x:x+design.deskX,z,w:design.width/2+.06,d:design.depth/2+.06}];
  if(design.canopy!=='none')for(const dx of[-1.88,1.88])colliders.push({x:x+dx,z:z-1.2,w:.09,d:.09});
  if(standHasIdentityPost(kind))colliders.push({x:x-1.5,z:z-1.02,w:.05,d:.05});
  if(kind==='telemetry')colliders.push({x:x+2.02,z:z-.35,w:.4,d:.4});
  if(kind==='sequence')colliders.push({x:x+2.12,z:z-.35,w:.4,d:.48});
  if(kind==='flight-plan')colliders.push({x:x-2.35,z:z-1.03,w:.46,d:.12});
  if(kind==='radio')colliders.push({x:x+2.25,z:z-.85,w:.12,d:.12});
  if(kind==='weather')colliders.push({x:x+2.35,z:z-.72,w:.23,d:.23},{x:x-2.35,z:z-.55,w:.35,d:.32});
  if(kind==='beacons')for(const dx of[-2.25,0,2.25])colliders.push({x:x+dx,z:z-1.6,w:.2,d:.2});
  // Include the feet, not just the elevated instrument body. The rear braces of
  // the patch frame also touch the ground behind its shallow desk.
  if(kind==='survey'||kind==='tracking')colliders.push({x:x-2.13,z:z-.05,w:.68,d:.60});
  if(kind==='cables')for(const dx of[-1.39,1.29])colliders.push({x:x+dx,z:z-1.3,w:.09,d:.09});
  return colliders;
}

/** One shared instrument atlas. Printed labels, meter scales, paper and phosphor displays
 * share a texture instead of allocating a canvas for each dial or console. */
export function createStandAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const c = canvas.getContext('2d')!;
  const titles = ['GROUND SUPPORT / 1969', 'VOLTAGE / DC', 'SIGNAL / RF', 'CONTINUITY / BUS', 'FLIGHT OPERATIONS', 'CREW / AS-506', 'WEATHER / RANGE', 'RANGE SAFETY', 'OPTICAL SURVEY', 'FIELD RECORD', 'VOICE / UHF', 'TRACKING / 39A', 'LC-39A / KENNEDY', 'FLIGHT PLAN / 16 JUL', 'S-IVB / TELEMETRY', 'PAD / TELEMETRY'];
  for (let index = 0; index < 16; index++) {
    const x = index % 4 * 256, y = Math.floor(index / 4) * 256;
    c.save(); c.translate(x, y);
    const paper = [4, 5, 9, 13].includes(index);
    c.fillStyle = paper ? '#d9ceb0' : '#142c30'; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = paper ? '#796d52' : '#708b80'; c.lineWidth = 2; c.strokeRect(9, 9, 238, 238);
    c.fillStyle = paper ? '#303c37' : '#e3c68e'; c.font = '600 13px monospace'; c.fillText(titles[index]!, 19, 31);
    c.fillStyle = paper ? '#74674c' : '#8bb9a4'; c.font = '10px monospace'; c.fillText('APOLLO 11    •    AS-506', 19, 48);
    if ([1, 6].includes(index)) {
      c.fillStyle = '#e2d9be'; c.beginPath(); c.arc(128, 151, 86, Math.PI, 0); c.lineTo(214, 189); c.lineTo(42, 189); c.fill();
      c.strokeStyle = '#394a43'; c.lineWidth = 2;
      for (let tick = 0; tick <= 10; tick++) {
        const a = Math.PI + tick * Math.PI / 10;
        c.beginPath(); c.moveTo(128 + Math.cos(a) * 69, 151 + Math.sin(a) * 69); c.lineTo(128 + Math.cos(a) * 79, 151 + Math.sin(a) * 79); c.stroke();
      }
      c.fillStyle = '#34433b'; c.font = '12px monospace'; c.fillText(index === 6 ? 'RANGE WX' : index === 1 ? '28 V DC' : 'S-BAND', 92, 178);
    } else if (index === 3) {
      // Isolated label tiles for physical terminals, legible without color cues.
      CABLE_CHANNELS.forEach((letter,i)=>{
        c.fillStyle='#e2d9be';c.fillRect(i*64+5,104,54,64);
        c.fillStyle='#243d3c';c.font='bold 43px monospace';c.textAlign='center';
        c.fillText(letter,i*64+32,151);
      });
    } else if ([2, 7, 10, 11, 14, 15].includes(index)) {
      c.strokeStyle = '#39665b'; c.lineWidth = 1;
      for (let t = 0; t <= 6; t++) { c.beginPath(); c.moveTo(23, 72 + t * 23); c.lineTo(232, 72 + t * 23); c.stroke(); }
      c.strokeStyle = '#9bc7a3'; c.lineWidth = 2; c.beginPath();
      for (let t = 0; t < 210; t++) {
        const py = index===14 ? 150-Math.exp(-(((t-64)/19)**2))*43+Math.sin(t*.18)*5
          : index===15 ? 140+(Math.floor(t/30)%2?18:-18)
          : 140 + Math.sin(t * .12) * 25 * Math.sin(t * .025);
        t ? c.lineTo(23 + t, py) : c.moveTo(23, py);
      } c.stroke();
      c.fillStyle = '#b2d2b0'; c.font = '11px monospace'; c.fillText(index===14?'S-IVB     CH 01':index===15?'PAD       CH 03':'LINK      CH 02', 24, 220);
    } else {
      c.strokeStyle = paper ? '#a49a7b' : '#45635a'; c.lineWidth = 1;
      for (let row = 0; row < 6; row++) {
        c.strokeRect(23, 70 + row * 22, 10, 10);
        c.fillStyle = paper ? '#59624e' : '#91ac96'; c.fillRect(44, 73 + row * 22, 100 + (row % 3) * 30, 2);
      }
      c.fillStyle = paper ? '#8e4937' : '#ddbc79'; c.font = 'bold 14px monospace'; c.fillText('16 JUL 1969', 23, 228);
    }
    c.restore();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

/** Human-scale authored stations. Static parts are merged per shared material; each
 * station retains its own bounds so distant desks can be culled independently. */
export function buildStandModel(kind: StandModelKind, mat: StandMaterialFactory, atlas: THREE.Texture, index: number, animated = false): THREE.Group {
  const root = new THREE.Group(); root.name = `apollo-stand-${kind}`;
  const movingParts:StandMovingPart[]=[];root.userData.movingParts=movingParts;
  const controlParts:StandControlPart[]=[];root.userData.controlParts=controlParts;
  const design=STAND_DESIGNS[kind];root.userData.silhouette=design.silhouette;
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  let destination = batches;
  const paint = mat('stand-painted-enamel', 0x627c73, .57, .12);
  const cream = mat('stand-ivory-enamel', 0xd5ceaf, .65, .05);
  const steel = mat('stand-brushed-steel', 0x879b99, .36, .78);
  const dark = mat('stand-rubber-bakelite', 0x17282a, .84, .04);
  const amber = mat('stand-safety-ochre', 0xca984b, .6, .08);
  const red = mat('stand-red-insulation', 0x9e4c39, .71, .03);
  const paper = mat('stand-paper', 0xdad1b4, .94);
  const copper = mat('stand-copper', 0xa77951, .47, .68);
  const display = mat('stand-instrument-atlas', 0xffffff, .65, .05); display.map = atlas;
  const controlled = (channel:StandControlChannel|undefined,axis:StandControlPart['axis'],pivot:THREE.Vector3,draw:()=>void):void => {
    if(!animated||!channel){draw();return;}
    const previous=destination,parts=new Map<THREE.Material,THREE.BufferGeometry[]>();destination=parts;
    try{draw();}finally{destination=previous;}
    const node=new THREE.Group();node.name=`stand-control-${channel}`;node.position.copy(pivot);
    for(const[material,geometries]of parts){
      const geometry=mergeGeometries(geometries,false);
      geometries.forEach(part=>part.dispose());
      if(!geometry)throw new Error(`Could not batch stand control ${channel}`);
      geometry.translate(-pivot.x,-pivot.y,-pivot.z);geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;node.add(mesh);
    }
    root.add(node);controlParts.push({node,axis,channel});
  };
  const put = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    const transform = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry.clone(); nonIndexed.applyMatrix4(transform); geometry.dispose();
    const list = destination.get(material) ?? []; list.push(nonIndexed); destination.set(material, list);
  };
  const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, ry = 0) => put(new THREE.BoxGeometry(w, h, d), material, x, y, z, 0, ry);
  const cyl = (r: number, h: number, material: THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0) => put(new THREE.CylinderGeometry(r, r, h, 12), material, x, y, z, rx, 0, rz);
  const tube = (points: number[][], radius: number, material: THREE.Material) => put(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2]))), points.length===2?1:Math.min(18,(points.length-1)*3), radius, 6, false), material, 0, 0, 0);
  const sideGusset = (x:number,y:number,z:number,rise:number,reach:number,material:THREE.Material,slope=0) => {
    const profile=new THREE.Shape();profile.moveTo(0,0);profile.lineTo(reach,slope);profile.lineTo(0,-rise);profile.closePath();
    // Local X becomes station Z: a thin triangular cheek, not a solid console side.
    put(new THREE.ExtrudeGeometry(profile,{depth:.035,bevelEnabled:false,steps:1}),material,x,y,z,0,-Math.PI/2);
  };
  const sheet = (cell: number, w: number, h: number, x: number, y: number, z: number, rx = 0, ry = 0, channel?:StandControlChannel) => {
    const geometry = new THREE.PlaneGeometry(w, h), uv = geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cell % 4 + .025 + uv.getX(i) * .95) / 4, (3 - Math.floor(cell / 4) + .025 + uv.getY(i) * .95) / 4);
    put(geometry, display, x, y, z, rx, ry);
    if(cell===1||cell===6){
      // All analogue scales use one physical needle, including clipboard and
      // portable-meter copies of the atlas cells. No printed needle survives
      // behind a controlled pointer. The pivot matches pixel (128,154).
      const pivotY=h*(.5-154/256)/.95,length=h*60/256/.95;
      const plane=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx,ry,0));plane.setPosition(x,y,z);
      const pivot=new THREE.Vector3(0,pivotY,.009).applyMatrix4(plane);
      controlled(channel,'z',pivot,()=>{
        const needle=new THREE.BoxGeometry(w*.016,h*60/256/.95,.005);
        needle.translate(0,pivotY+length/2,.009);needle.applyMatrix4(plane);put(needle,red,0,0,0);
        const hub=new THREE.CircleGeometry(w*.021,8);hub.translate(0,pivotY,.013);hub.applyMatrix4(plane);put(hub,dark,0,0,0);
      });
    }
  };
  const terminalLabel=(letter:typeof CABLE_CHANNELS[number],x:number,y:number)=>{
    const geometry=new THREE.PlaneGeometry(.17,.20),uv=geometry.getAttribute('uv'),column=CABLE_CHANNELS.indexOf(letter);
    // Cell 3 occupies x=768..1024, y=0..256 in the shared 1024 atlas.
    for(let i=0;i<uv.count;i++)uv.setXY(i,(768+column*64+4+uv.getX(i)*56)/1024,1-(168-uv.getY(i)*64)/1024);
    put(geometry,display,x,y,-.46);
  };
  const beveled = (w: number, h: number, depth: number, material: THREE.Material, x: number, y: number, z: number) => {
    const s = new THREE.Shape(), r = .09;
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    put(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 1, steps: 1, curveSegments: 3 }), material, x, y, z);
  };
  const meter = (x: number, y: number, z: number, cell = 1, channel?:StandControlChannel) => { beveled(.63, .53, .1, dark, x, y, z); sheet(cell, .54, .45, x, y, z + .128,0,0,channel); };
  const knob = (x: number, y: number, z: number, r = .08, channel?:StandControlChannel) => {
    // A mounting washer, radial grip flutes and a raised index, all in existing batches.
    cyl(r * 1.16, .018, steel, x, y, z - .045, Math.PI / 2);
    controlled(channel,'z',new THREE.Vector3(x,y,z),()=>{
      cyl(r, .095, dark, x, y, z, Math.PI / 2);
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        put(new THREE.BoxGeometry(r*.18,r*.28,.074),dark,x+Math.sin(a)*r,y+Math.cos(a)*r,z,0,0,-a);
      }
      box(r*.17,r*.7,.012,cream,x,y+r*.3,z+.052);
    });
  };
  const handle = (x:number,y:number,z:number,w=.34,h=.10) => {
    // Raised bail leaves an actual gap behind the grip instead of a solid bar.
    for(const dx of[-w/2,w/2]){
      box(.055,.07,.02,steel,x+dx,y,z);
      cyl(.018,.035,dark,x+dx,y,z+.02,Math.PI/2);
    }
    tube([[x-w/2,y,z+.035],[x-w/2,y+h,z+.065],[x+w/2,y+h,z+.065],[x+w/2,y,z+.035]],.016,steel);
  };
  const caseHardware = (w:number,h:number,d:number,x:number,y:number,z:number) => {
    const seamY=y+h*.27,front=z+d+.03;
    box(w,.014,.016,dark,x,seamY,front);
    for(const side of[-1,1]){
      box(.014,.014,d,dark,x+side*(w/2+.026),seamY,z+d/2);
      // Two rear hinge leaves and a horizontal pin joining lid to body.
      box(.12,.11,.018,steel,x+side*w*.3,seamY,z-.032);
      cyl(.023,.15,steel,x+side*w*.3,seamY,z-.05,0,Math.PI/2);
      box(.055,.11,.028,steel,x+side*w*.31,seamY,front+.016);
      box(.031,.035,.018,dark,x+side*w*.31,seamY-.018,front+.036);
    }
    handle(x,y+h*.36,front,.36,.07);
  };
  const multimeter = (x:number) => {
    // Portable analogue test set: recessed scale, rotary range selector and two
    // separate socket-to-probe leads. It stays on the existing electrical bench.
    beveled(.46,.57,.16,dark,x,1.49,.05);
    box(.39,.49,.018,cream,x,1.49,.243);
    sheet(1,.34,.24,x,1.61,.254);knob(x,1.39,.282,.065);
    handle(x,1.79,.12,.29,.07);
    for(const side of[-1,1]){
      const insulation=side===1?red:dark,sz=side===1?.57:.40;
      cyl(.032,.026,copper,x+side*.125,1.285,.266,Math.PI/2);
      cyl(.018,.038,insulation,x+side*.125,1.285,.282,Math.PI/2);
      tube([[x+side*.125,1.285,.302],[x-.32+side*.035,1.22,.35],[x-.30,1.20,sz],[x-.08,1.20,sz]],.012,insulation);
      cyl(.025,.20,insulation,x+.02,1.20,sz,0,Math.PI/2);
      cyl(.035,.022,insulation,x+.12,1.20,sz,0,Math.PI/2);
      cyl(.009,.13,steel,x+.195,1.20,sz,0,Math.PI/2);
      for(let i=0;i<3;i++)cyl(.028,.009,dark,x-.04+i*.05,1.20,sz,0,Math.PI/2);
    }
  };
  const clipboard = (x: number, y: number, z: number, cell = 9, angle = -.12) => {
    box(.65, .035, .83, dark, x, y, z, angle); sheet(cell, .59, .77, x, y + .023, z, -Math.PI / 2,angle); box(.24, .028, .07, steel, x-Math.sin(angle)*.32, y + .04, z-Math.cos(angle)*.32,angle);
  };
  const tools = (cx=.92) => {
    // A real open jaw and ring eye, ridged screwdriver grip and hinged pliers.
    // The tray lip separates tools from the enamel instead of intersecting it.
    box(.88,.035,.54,dark,cx,1.185,.39);
    for(const dz of[-.265,.265])box(.9,.06,.025,steel,cx,1.21,.39+dz);
    for(const dx of[-.44,.44])box(.025,.06,.54,steel,cx+dx,1.21,.39);
    const outline=new THREE.Shape();
    const points=[[-.25,-.065],[.11,-.045],[.18,-.12],[.29,-.12],[.32,-.06],[.23,-.075],[.19,-.01],[.23,.045],[.32,.02],[.29,.10],[.18,.12],[.10,.045],[-.25,.065]];
    points.forEach(([x,y],i)=>i?outline.lineTo(x!,y!):outline.moveTo(x!,y!));outline.closePath();
    const eye=new THREE.Path();eye.absarc(-.21,0,.034,0,Math.PI*2,true);outline.holes.push(eye);
    put(new THREE.ExtrudeGeometry(outline,{depth:.018,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,steps:1,curveSegments:8}),steel,cx-.10,1.23,.25,-Math.PI/2,0,.10);
    cyl(.044,.19,amber,cx-.20,1.24,.55,0,Math.PI/2);
    cyl(.009,.25,steel,cx+.02,1.24,.55,0,Math.PI/2);box(.055,.012,.023,steel,cx+.17,1.24,.55);
    for(let i=0;i<4;i++)cyl(.046,.008,dark,cx-.27+i*.04,1.24,.55,0,Math.PI/2);
    for(const side of[-1,1]){
      tube([[cx+.28,1.245,.39],[cx+.1,1.245,.39+side*.06],[cx-.02,1.245,.39+side*.075]],.022,red);
      tube([[cx+.28,1.245,.39],[cx+.35,1.245,.39+side*.04],[cx+.40,1.245,.39+side*.025]],.015,steel);
    }cyl(.033,.035,steel,cx+.28,1.255,.39);
  };
  // Base, skids, tactile edge and an open working side; no decorative loose cargo.
  box(5.6,.10,4,cream,0,.02,0);box(5.4,.025,.07,dark,0,.085,1.8);
  const hazard=['sequence','cables','beacons'].includes(kind);
  for(let i=0;i<(hazard?10:2);i++)box(.17,.025,.07,hazard?amber:steel,hazard?-2.4+i*.53:-2.4+i*4.8,.10,1.8,-.35);
  const half=design.width/2-.16,tx=design.deskX,depth=design.depth;
  for(const x of[tx-half,tx+half]){
    box(.08,.96,.08,steel,x,.62,-depth/2+.12);box(.08,.96,.08,steel,x,.62,depth/2-.12);
    box(.18,.07,depth+.12,dark,x,.16,.04);
    if(kind==='weather')for(const z of[-depth/2+.12,depth/2-.12]){cyl(.095,.075,dark,x,.15,z,0,Math.PI/2);cyl(.035,.085,steel,x,.15,z,0,Math.PI/2);}
  }
  box(design.width,.11,depth,dark,tx,1.04,.04);box(design.width-.04,.055,depth-.04,paint,tx,1.12,.04);
  box(design.width-.25,.04,.045,steel,tx,1.17,depth/2+.025);box(design.width-.3,.07,.07,steel,tx,.37,-depth/2+.08);
  // Bolted angle-frame benches: readable side gussets, levelling pads and a
  // rear diagonal load path. All details remain in the original material batches.
  for(const side of[-1,1]){
    const x=tx+side*half;
    for(const z of[-depth/2+.12,depth/2-.12]){
      if(kind!=='weather'){
        cyl(.065,.04,dark,x,.09,z);cyl(.023,.07,steel,x,.145,z);
      }
      box(.13,.18,.025,paint,x,.91,z+.052);
      for(const y of[.86,.96])cyl(.016,.018,steel,x,y,z+.074,Math.PI/2);
    }
    tube([[x,.35,-depth/2+.12],[x,.91,depth/2-.12]],.018,steel);
  }
  if(['sequence','telemetry','radio','cables'].includes(kind)){
    // The console has actual electronics below its instruments, with a removable
    // service door, ventilation slots and a sheltered loom rather than an empty desk.
    const width=kind==='telemetry'?2.54:kind==='radio'?2.24:1.12;
    box(width,.63,.45,paint,tx,.69,-.30);
    box(width-.10,.53,.025,dark,tx,.69,-.057);
    box(width-.17,.47,.029,cream,tx,.69,-.038);
    for(const side of[-1,1])for(const y of[.51,.86])cyl(.017,.015,steel,tx+side*(width/2-.12),y,-.014,Math.PI/2);
    handle(tx,.68,-.012,.24,.055);
    for(let i=0;i<6;i++)box(width*.28,.014,.013,dark,tx-width*.24,.52+i*.052,-.014);
    // Rear plug panel, connectors with strain relief, and secured cable routes.
    box(.64,.22,.027,dark,tx,.74,-.54);
    for(let i=0;i<3;i++){
      const x=tx-.21+i*.21;
      cyl(.049,.038,steel,x,.74,-.568,Math.PI/2);
      cyl(.025,.08,dark,x,.74,-.61,Math.PI/2);
      tube([[x,.74,-.65],[x,.49,-.70],[tx+.48,.30,-.66],[tx+half,.32,-.60]],.012,i===0?red:dark);
    }
    for(const x of[tx,tx+.43])box(.04,.055,.11,steel,x,.31,-.66);
  }
  const tile = ({ sequence: 1, telemetry: 2, cables: 3, 'flight-plan': 13, 'crew-manifest': 5, weather: 6, beacons: 7, orientation: 12, survey: 8, records: 9, radio: 10, crew: 5, tracking: 11 })[kind];
  // Only the two paperwork offices need sun awnings. Instruments use open frames,
  // a lectern, a drafting table or a mobile cart rather than thirteen identical roofs.
  if(design.canopy!=='none'){
    const roofY=design.canopy==='dispatch'?2.95:2.7;
    const canopyPaint=design.canopy==='clerk'?cream:paint;
    const roofSlope=.075;
    // Folded sheet metal, rather than a floating slab: the roof falls towards a
    // continuous front gutter, with a rear flashing and returned side fascias.
    put(new THREE.BoxGeometry(4,.045,1.4),canopyPaint,0,roofY,-.85,roofSlope);
    for(const x of[-1.88,1.88]){
      box(.065,roofY-.14,.065,steel,x,roofY/2,-1.2);
      // Bolted foot and reinforced post cap remain inside the existing proxies.
      box(.16,.035,.16,steel,x,.09,-1.2);
      for(const dx of[-.055,.055])for(const dz of[-.055,.055])cyl(.012,.025,dark,x+dx,.12,-1.2+dz);
      box(.14,.095,.17,paint,x,roofY-.14,-1.2);
      box(.085,.085,1.4,steel,x,roofY-.105,-.85);
      tube([[x,roofY-.70,-1.2],[x,roofY-.14,-.22]],.027,steel);
      box(.14,.20,.095,paint,x,roofY-.64,-1.2);
      for(const y of[roofY-.70,roofY-.58])cyl(.022,.11,dark,x,y,-1.2,Math.PI/2);
      // Folded eaves show sheet thickness from the work side and the approach.
      put(new THREE.BoxGeometry(.055,.14,1.42),canopyPaint,x/1.88*1.98,roofY-.055,-.85,roofSlope);
      put(new THREE.BoxGeometry(.045,.025,1.4),steel,x/1.88*1.98,roofY-.128,-.85,roofSlope);
    }
    // Standing seams and fasteners share the existing metal batch. The pitched
    // roof makes the kiosk silhouette legible without adding walls or front feet.
    for(let i=0;i<9;i++){
      const x=-1.84+i*.46;
      put(new THREE.BoxGeometry(.018,.05,1.4),steel,x,roofY+.04,-.85,roofSlope);
      for(const z of[-1.37,-.32])cyl(.018,.014,steel,x,roofY+.075-(z+.85)*Math.sin(roofSlope),z);
    }
    box(3.76,.10,.075,steel,0,roofY-.13,-1.2);
    box(4,.105,.045,canopyPaint,0,roofY-.015,-1.55);
    // Open-topped gutter has a dark channel, two folded edges and end caps.
    box(4,.035,.16,dark,0,roofY-.13,-.14);
    for(const z of[-.205,-.065])box(4,.09,.022,steel,0,roofY-.10,z);
    for(const x of[-1.99,1.99])box(.025,.09,.16,steel,x,roofY-.10,-.14);
    // Drain spouts discharge clear of the documents; no new ground obstacle.
    for(const x of[-1.88,1.88])tube([[x,roofY-.13,-.14],[x,roofY-.23,-.14],[x,roofY-.27,-.23]],.023,steel);
  }
  if(standHasIdentityPost(kind)){
    box(.04,2.12,.04,steel,-1.50,1.15,-1.02);
    beveled(.87,.48,.025,dark,-1.50,2.18,-1.02);sheet(tile,.78,.39,-1.50,2.18,-.955);
  }
  for(const x of[tx-half,tx+half])for(const z of[-depth/2+.12,depth/2-.12])cyl(.027,.025,steel,x,1.165,z);
  const indicator=standIndicatorPosition(kind);
  cyl(.075,.10,dark,indicator.x,1.23,indicator.z);cyl(.085,.025,steel,indicator.x,1.29,indicator.z);
  if (kind === 'sequence') {
    // Vertical switchboard, ceramic cartridges, knife-switch grip and vented transformer.
    beveled(2.6,1.22,.24,paint,-.12,1.85,-.65);meter(-.86,2.06,-.38,1,'power-meter');
    box(1.1,.10,.07,copper,.48,2.24,-.35);box(1.1,.10,.07,copper,.48,1.6,-.35);
    for(let i=0;i<4;i++){
      const x=-.37+i*.36;
      cyl(.05,.33,cream,x,1.9,-.27);cyl(.066,.06,copper,x,1.73,-.27);cyl(.066,.06,copper,x,2.07,-.27);
      for(let ring=0;ring<3;ring++)cyl(.057,.014,steel,x,1.82+ring*.055,-.27);
    }
    cyl(.07,.14,steel,1.02,1.83,-.3,0,Math.PI/2);
    controlled('power-lever','x',new THREE.Vector3(1.02,1.83,-.3),()=>{
      // The offset operating arm clears the switchboard in both the upright
      // engaged pose and the .65 rad lowered disengaged pose supplied by the world.
      tube([[1.02,1.83,-.3],[1.02,1.83,-.01]],.025,steel);
      cyl(.025,.29,steel,1.02,1.975,-.01);
      cyl(.065,.20,red,1.02,2.12,-.01,0,Math.PI/2);
    });
    beveled(.68,1.35,.65,paint,2.12,.85,-.64);
    caseHardware(.68,1.35,.65,2.12,.85,-.64);
    for(let i=0;i<7;i++)box(.51,.025,.025,dark,2.12,.42+i*.14,.04);
    tube([[1.72,.35,-.5],[1.55,.18,-.9],[.8,.15,-.9],[.4,.45,-.6]],.035,red);
    tools(.6);multimeter(-1.02);
  } else if(kind==='telemetry') {
    // Three recessed CRT faces, control shelf and a full-height tape/data rack.
    beveled(2.95,.95,.45,paint,0,1.72,-.66);
    for(let i=0;i<3;i++){
      const x=-.96+i*.96;meter(x,1.84,-.18,[14,2,15][i]!);knob(x-.18,1.39,-.11,.075,`telemetry-${i}` as StandControlChannel);knob(x+.15,1.39,-.11,.05);
      box(.78,.06,.18,dark,x,2.15,-.13);
      // Deep hoods shade the CRTs; side cheeks and lower lips read at the
      // exploration camera distance instead of relying on tiny surface marks.
      for(const dx of[-.37,.37])box(.045,.49,.23,dark,x+dx,1.85,-.08);
      box(.78,.045,.23,steel,x,1.59,-.08);
    }
    put(new THREE.BoxGeometry(2.89,.075,.42),paint,0,1.255,.18,-.14);
    box(2.91,.06,.045,steel,0,1.285,.39);
    for(const x of[-1.38,1.38])sideGusset(x,1.28,-.02,.13,.42,dark);
    beveled(.73,2.23,.61,dark,2.02,1.31,-.70);
    // Rack ears, repeated fixings and pull handles make the removable modules read.
    for(const x of[1.68,2.36]){
      box(.035,1.53,.035,steel,x,1.10,-.055);
      for(let i=0;i<10;i++)cyl(.012,.014,dark,x,.40+i*.145,-.032,Math.PI/2);
    }
    for(let i=0;i<5;i++){
      const y=.5+i*.24;
      box(.63,.22,.06,paint,2.02,y,-.055);knob(2.23,y,-.015,.035);
      handle(1.91,y-.025,.002,.20,.05);
      for(let vent=0;vent<4;vent++)box(.014,.07,.012,dark,2.07+vent*.035,y,.009);
    }
    for(const x of[1.85,2.18]){
      cyl(.17,.06,steel,x,2.11,-.02,Math.PI/2);cyl(.055,.075,dark,x,2.11,.022,Math.PI/2);
      for(let n=0;n<3;n++)put(new THREE.BoxGeometry(.025,.25,.014),dark,x,2.11,.025,0,0,n*Math.PI*2/3);
    }
    // Tape deck transport: guides, capstan and the visible tape path between reels.
    for(const x of[1.86,2.03,2.19])cyl(.026,.048,steel,x,1.88,.015,Math.PI/2);
    tube([[1.85,1.96,.024],[1.86,1.88,.045],[2.03,1.85,.045],[2.19,1.88,.045],[2.18,1.96,.024]],.008,dark);
    for(const x of[1.79,2.25])box(.09,.032,.027,amber,x,1.71,.012);
    for(let i=0;i<8;i++)box(.018,.60,.015,dark,2.415,.90,-.52+i*.055);
    tube([[1.25,1.2,-.5],[1.55,.6,-.6],[1.75,.3,-.45],[2,.32,-.3]],.025,dark);
    clipboard(-.3,1.19,.24,2,.08);
  } else if(kind==='radio') {
    // A stacked receiver/transmitter, speaker grille and a wired handset.
    beveled(2.5,.59,.48,cream,-.12,1.56,-.64);beveled(2.22,.42,.43,paint,-.25,2.08,-.61);
    for(const x of[-1.12,.87])handle(x,2.04,-.145,.12,.11);
    for(const x of[-1.24,1.0])for(const y of[1.34,1.78])cyl(.022,.018,steel,x,y,-.125,Math.PI/2);
    sheet(10,1.24,.30,-.55,2.08,-.15);knob(.63,2.07,-.12,.12);
    meter(-.83,1.57,-.13,2);knob(-.17,1.57,-.10,.10);
    for(let i=0;i<8;i++)box(.025,.36,.018,dark,.2+i*.085,1.57,-.12);
    tube([[.3,1.19,.46],[.46,1.45,.30],[.9,1.46,.24],[1.04,1.18,.15]],.035,dark);
    cyl(.12,.10,dark,.33,1.21,.46,Math.PI/2);cyl(.12,.10,dark,1.02,1.21,.15,Math.PI/2);
    tube([[.85,1.18,-.50],[.84,1.65,-.4],[1.08,1.75,-.2]],.018,steel);cyl(.065,.16,dark,1.12,1.75,-.15,Math.PI/2);
    cyl(.035,3.24,steel,2.25,1.72,-.85);box(1.05,.035,.035,steel,2.25,3.0,-.85);
    for(const dx of[-.38,0,.38])box(.025,.025,.65,steel,2.25+dx,3,-.85);
    box(.21,.06,.21,paint,2.25,.10,-.85);cyl(.075,.22,dark,2.25,.24,-.85);
    for(const y of[.45,1.5,2.7]){
      cyl(.052,.045,dark,2.25,y,-.85);
      tube([[2.29,y,-.85],[2.29,y-.08,-.85]],.012,steel);
    }
    tube([[2.29,2.73,-.85],[2.29,.32,-.85],[1.16,.25,-.63],[.95,1.26,-.64]],.014,dark);
    box(.3,.065,.24,dark,-.7,1.2,.37);box(.18,.045,.08,copper,-.7,1.25,.37);
  } else if (kind === 'cables') {
    // Braced patch frame with two rows of ferrules and cables dropping into a tray.
    beveled(2.7,1.10,.14,cream,-.05,1.78,-.64);
    for(const x of[-1.39,1.29]){box(.065,1.25,.065,steel,x,1.75,-.7);tube([[x,1.3,-.4],[x,2.3,-.72],[x,.35,-1.3]],.025,steel);}
    for (let i = 0; i < 4; i++) {
      const x = -1 + i * .64;
      for(const y of[1.62,2.0]){
        box(.25,.23,.025,steel,x,y,-.485);
        cyl(.095,.08,dark,x,y,-.43,Math.PI/2);cyl(.052,.10,copper,x,y,-.38,Math.PI/2);
        put(new THREE.TorusGeometry(.044,.012,6,12),steel,x,y,-.316);
        // Recessed socket mouth and two screw heads distinguish the hardware
        // from a painted dot without changing terminal labels or cable order.
        cyl(.025,.012,dark,x,y,-.318,Math.PI/2);
        for(const dx of[-.101,.101]){
          cyl(.014,.014,dark,x+dx,y,-.463,Math.PI/2);
          box(.017,.004,.004,steel,x+dx,y,-.454);
        }
      }
      terminalLabel(CABLE_CHANNELS[i]!,x,2.20);terminalLabel(CABLE_TARGET_ORDER[i]!,x,1.81);
      tube([[x,2,-.3],[x-.13,1.64,-.1],[x+.16,1.34,.04],[x+.12,1.21,.39]],.022,i%2?dark:red);
      cyl(.035,.15,copper,x+.12,1.21,.39,Math.PI/2);
    }
    box(2.7,.10,.19,dark,-.05,1.29,-.15);tools(.57);multimeter(-.94);
  } else if(kind==='flight-plan') {
    put(new THREE.BoxGeometry(3.32,.065,1.22),cream,0,1.34,-.02,-.16);
    sheet(13,2.86,1.04,0,1.378,-.025,-Math.PI/2-.16);
    cyl(.038,3.23,steel,0,1.25,.60,0,Math.PI/2);
    for(const x of[-1.35,1.35]){
      // Hinged trestle and locking quadrant join the tilted board to the bench.
      box(.065,.19,.08,steel,x,1.22,.46);
      cyl(.065,.11,dark,x,1.28,.46,0,Math.PI/2);
      sideGusset(x,1.224,-.51,.06,.87,paint,.14);
      tube([[x,1.19,-.43],[x,1.39,-.32]],.024,steel);
      cyl(.07,.10,steel,x,1.29,-.375,0,Math.PI/2);
    }
    // Straightedge follows the same tilt as the paper and rests on its surface.
    put(new THREE.BoxGeometry(.045,.025,1.01),copper,-.42,1.389,-.025,-.16);
    put(new THREE.BoxGeometry(.45,.025,.055),dark,-.42,1.310,-.52,-.16);
    cyl(.065,.64,paper,1.18,1.382,-.37,0,Math.PI/2);cyl(.022,.72,dark,1.18,1.382,-.37,0,Math.PI/2);
    for(const x of[-2.72,-1.98])box(.04,2.4,.04,steel,x,1.28,-1.03);
    box(.86,.05,.055,steel,-2.35,2.48,-1.03);sheet(13,.74,1.05,-2.35,1.94,-.98);
    box(.55,.04,.16,copper,-.94,1.338,-.4);box(.21,.10,.15,dark,-1.06,1.408,-.4);
  } else if (kind === 'weather') {
    meter(-.5,1.52,-.41,6,'weather-cloud');meter(.25,1.52,-.41,1);clipboard(-.64,1.18,.22,6);
    cyl(.11,.44,cream,.83,1.4,.05);cyl(.025,.52,steel,.83,1.44,.05);
    tube([[.82,1.18,.15],[.95,1.24,.4],[.55,1.22,.50],[.38,1.24,.24]],.018,red);
    cyl(.045, 3.9, steel, 2.35, 2.05, -.72); cyl(.16, .18, dark, 2.35, 3.8, -.72);
    // Flanged base and mast clamps make the wind instrument physically anchored.
    box(.42,.06,.42,steel,2.35,.10,-.72);
    for(const dx of[-.14,.14])for(const dz of[-.14,.14])cyl(.024,.08,dark,2.35+dx,.17,-.72+dz);
    for(const y of[.25,1.4,2.6])cyl(.065,.05,dark,2.35,y,-.72);
    cyl(.075,.09,steel,2.35,3.36,-.72);
    controlled('weather-heading','y',new THREE.Vector3(2.35,3.36,-.72),()=>{
      // North at zero is -Z. The vane runs half a metre below the cup rotor,
      // so heading changes remain independent of the existing anemometer joint.
      box(.035,.035,.75,steel,2.35,3.36,-.745);
      const arrow=new THREE.Shape();arrow.moveTo(-.12,0);arrow.lineTo(.12,0);arrow.lineTo(0,.22);arrow.closePath();
      put(new THREE.ExtrudeGeometry(arrow,{depth:.018,bevelEnabled:false}),paint,2.35,3.36,-1.08,-Math.PI/2);
      box(.22,.08,.18,paint,2.35,3.36,-.44);
    });
    if(animated){
      const rotor=new THREE.Group();rotor.name='weather-anemometer-rotor';rotor.position.set(2.35,3.86,-.72);root.add(rotor);
      for(let a=0;a<3;a++){
        const angle=a*Math.PI*2/3,x=Math.cos(angle)*.65,z=Math.sin(angle)*.65;
        const arm=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.65,8),steel);arm.position.set(x/2,0,z/2);arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(x,0,z).normalize());rotor.add(arm);
        const cup=new THREE.Mesh(new THREE.SphereGeometry(.14,10,6,0,Math.PI*2,0,Math.PI/2),cream);cup.rotation.set(Math.PI/2,angle,0);cup.position.set(x,0,z);rotor.add(cup);
      }
      movingParts.push({node:rotor,axis:'y',speed:1.7,activity:'weather'});
    }else for (let a = 0; a < 3; a++) { const angle = a * Math.PI * 2 / 3; const x = 2.35 + Math.cos(angle) * .65, z = -.72 + Math.sin(angle) * .65; tube([[2.35, 3.86, -.72], [x, 3.86, z]], .025, steel); put(new THREE.SphereGeometry(.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cream, x, 3.86, z, Math.PI / 2, angle); }
    // Inclined louvres shed rain while leaving real ventilation gaps; the dark
    // instrument well stays recessed behind the blades instead of filling them.
    for(let i=0;i<5;i++)put(new THREE.BoxGeometry(.59,.035,.52),cream,-2.35,1.25+i*.085,-.55,.12);
    // Overlapping pitched caps give the louvred shelter a weatherproof roof
    // silhouette while keeping the same ground support and collision footprint.
    box(.7,.065,.63,cream,-2.35,1.67,-.55);box(.53,.36,.34,dark,-2.35,1.44,-.60);
    for(const side of[-1,1])put(new THREE.BoxGeometry(.75,.045,.37),cream,-2.35,1.758,-.55+side*.17,side*.29);
    box(.76,.045,.055,steel,-2.35,1.815,-.55);
    for(const dx of[-.315,.315])for(let row=0;row<5;row++)
      put(new THREE.BoxGeometry(.035,.052,.46),cream,-2.35+dx,1.27+row*.077,-.55,0,0,dx>0?-.25:.25);
    // A framed louvred instrument shelter with a hinged access door.
    for(const dx of[-.29,.29])box(.035,.45,.038,paint,-2.35+dx,1.43,-.27);
    for(const dx of[-.21,.21])box(.06,.075,.022,steel,-2.35+dx,1.45,-.235);
    cyl(.024,.09,dark,-2.16,1.43,-.21);
    box(.61,.04,.55,paint,-2.35,1.18,-.55);
    for(const dx of[-.22,.22])for(const dz of[-.18,.18]){
      box(.045,1.12,.045,steel,-2.35+dx,.66,-.55+dz);
      box(.10,.035,.10,steel,-2.35+dx,.11,-.55+dz);
    }
    // Four-way stretcher and rear cross-bracing ground the Stevenson-style
    // screen. Every contact stays within its original narrow support footprint.
    for(const dx of[-.22,.22])box(.04,.04,.40,paint,-2.35+dx,.40,-.55);
    for(const dz of[-.18,.18])box(.48,.04,.04,paint,-2.35,.40,-.55+dz);
    tube([[-2.57,.43,-.73],[-2.13,1.10,-.73]],.012,steel);
    tube([[-2.13,.43,-.73],[-2.57,1.10,-.73]],.012,steel);
    // A separate upper rain cap leaves an air break above the pitched roof.
    for(const dx of[-.24,.24])box(.025,.055,.025,steel,-2.35+dx,1.85,-.55);
    for(const side of[-1,1])put(new THREE.BoxGeometry(.78,.022,.20),cream,-2.35,1.895,-.55+side*.09,side*.29);
    box(.78,.025,.035,steel,-2.35,1.926,-.55);
  } else if (kind === 'beacons') {
    sheet(7,1.35,.93,-.15,1.185,.04,-Math.PI/2);cyl(.11,.18,dark,.72,1.28,.32,Math.PI/2);cyl(.11,.18,dark,.97,1.28,.32,Math.PI/2);
    tube([[.72,1.28,.28],[.83,1.32,.23],[.97,1.28,.28]],.028,steel);
    for (let i = 0; i < 3; i++) {
      const x = -2.25 + i * 2.25;
      cyl(.19, .16, dark, x, .23, -1.6); cyl(.055, 1.3, steel, x, .96, -1.6); cyl(.14, .22, amber, x, 1.70, -1.6);
      cyl(.19, .045, dark, x, 1.84, -1.6); box(.27, .27, .055, cream, x, 1.42, -1.47);
    }
  } else if(kind==='orientation') {
    beveled(2.55,1.29,.08,dark,0,1.92,-.76);sheet(12,2.39,1.13,0,1.92,-.65);
    for(const x of[-1.23,1.23]){
      box(.065,1.42,.085,paint,x,1.85,-.80);
      sideGusset(x,1.275,-.78,.13,.40,steel);
    }
    box(2.63,.08,.10,steel,0,2.60,-.76);
    box(2.63,.06,.23,paint,0,2.66,-.69);
    cyl(.18,.065,steel,.89,1.23,.24);cyl(.15,.02,cream,.89,1.28,.24);
    box(.015,.025,.25,red,.89,1.30,.24,.45);box(.92,.025,.055,copper,-.34,1.20,.42);
  } else if(kind==='crew') {
    // Equipment display, not another paperwork desk: three generic protective hoods.
    for(let i=0;i<3;i++){
      const x=-1.1+i*1.1;cyl(.21,.12,steel,x,1.24,-.12);
      put(new THREE.SphereGeometry(.28,16,10),cream,x,1.57,-.12);
      const visor=new THREE.SphereGeometry(.235,16,8);visor.scale(1,.62,.6);put(visor,dark,x,1.60,.09);
      put(new THREE.TorusGeometry(.2,.027,6,18),dark,x,1.34,-.12,Math.PI/2);
      box(.065,1.01,.065,steel,x,1.68,-.66);sheet(5,.48,.31,x,2.13,-.61);
    }
  } else if (kind === 'records' || kind === 'crew-manifest') {
    if(kind==='records')for(let i=0;i<2;i++)clipboard(-.82+i*.72,1.19+i*.006,.12,9,-.08+i*.06);
    if(kind==='records'){
      beveled(.83,.65,.61,paint,-1.13,.70,-.28);
      for(const y of[.49,.76]){
        box(.77,.22,.045,cream,-1.13,y,.36);handle(-1.13,y-.025,.40,.24,.055);
        box(.15,.055,.012,steel,-1.13,y+.065,.39);box(.12,.032,.014,paper,-1.13,y+.065,.399);
      }
      caseHardware(.83,.65,.61,-1.13,.70,-.28);
    }else{
      for(let i=0;i<3;i++){const x=-.9+i*.77;box(.6,.045,.19,dark,x,1.35,-.48);sheet(5,.44,.57,x,1.65,-.56);}
      box(2.55,.045,.045,steel,0,1.98,-.62);
      clipboard(-.9,1.19,.22,5,0);
      box(1.12,.075,.68,dark,.49,1.20,.17);sheet(5,.70,.45,.49,1.245,.17,-Math.PI/2);
      for(const z of[-.11,.45])box(1.06,.035,.035,steel,.49,1.26,z);
      cyl(.07,.64,steel,.16,1.33,.17,Math.PI/2);
      for(const z of[-.20,.54])cyl(.10,.12,dark,.16,1.35,z,Math.PI/2);
    }
    // Filing sorter, binder rings, stamp and a gooseneck lamp.
    for (let i = 0; i < 3; i++) { box(.64, .035, .66, dark, -1.1, 1.28 + i * .16, -.4); box(.55, .025, .56, paper, -1.1, 1.31 + i * .16, -.4); }
    for(const dx of[-.30,.30]){
      box(.025,.54,.025,steel,-1.1+dx,1.415,-.69);
      box(.025,.54,.025,steel,-1.1+dx,1.415,-.11);
      for(let i=0;i<3;i++)box(.025,.055,.66,paint,-1.1+dx,1.29+i*.16,-.4);
    }
    cyl(.10, .04, dark, 1.28, 1.18, -.33); cyl(.025, .55, copper, 1.28, 1.45, -.33);
    tube([[1.28, 1.72, -.33], [1.28, 1.93, -.33], [1.05, 1.94, -.12], [.98, 1.81, .01]], .025, copper);
    put(new THREE.ConeGeometry(.21, .16, 12, 1, true), paint, .98, 1.75, .01);
    box(.18, .05, .13, dark, .99, 1.20, .47); cyl(.04, .14, copper, .99, 1.29, .47);
  } else {
    // Survey uses an open gimbal/theodolite; tracking uses a twin-reel film camera.
    const cx=-2.13;
    if(kind==='tracking'){
      beveled(.72,.5,.60,paint,cx,1.83,-.32);
      // The lens turret is bolted to the forward camera casting, closing the
      // gap between the original film body and its objective barrel.
      cyl(.23,.17,paint,cx,1.83,-.405,Math.PI/2);
      for(const dx of[-.145,.145])for(const dy of[-.145,.145])
        cyl(.018,.024,steel,cx+dx,1.83+dy,-.502,Math.PI/2);
      box(.52,.085,.42,steel,cx,1.55,-.05);
      // A raised magazine bridge carries the twin reels. The rear door and
      // viewfinder give the operator-facing side its own readable massing.
      for(const dx of[-.20,.20])box(.075,.20,.13,paint,cx+dx,2.10,.025);
      beveled(.56,.34,.035,dark,cx,1.83,.31);
      beveled(.48,.27,.028,paint,cx,1.83,.355);
      handle(cx,1.74,.408,.23,.055);
      for(const dx of[-.22,.22])cyl(.018,.025,steel,cx+dx,1.92,.402,Math.PI/2);
      box(.13,.13,.46,paint,cx+.29,2.015,-.06);
      cyl(.078,.12,dark,cx+.29,2.015,.20,Math.PI/2);
      for(const dx of[-.20,.20]){
        cyl(.22,.13,dark,cx+dx,2.22,.03,Math.PI/2);cyl(.175,.018,steel,cx+dx,2.22,.105,Math.PI/2);
        cyl(.045,.035,copper,cx+dx,2.22,.12,Math.PI/2);
        if(animated){
          const reel=new THREE.Group();reel.name='tracking-film-reel';reel.position.set(cx+dx,2.22,.12);root.add(reel);
          for(let spoke=0;spoke<3;spoke++){
            const mesh=new THREE.Mesh(new THREE.BoxGeometry(.025,.30,.008),dark);mesh.rotation.z=spoke*Math.PI/3;reel.add(mesh);
          }
          movingParts.push({node:reel,axis:'z',speed:dx<0?.8:1.1,activity:'tracking'});
        }
      }
      box(.40,.055,.07,dark,cx,2.08,-.27);
    }else{
      for(const dx of[-.29,.29]){box(.07,.52,.12,paint,cx+dx,1.79,-.04);cyl(.125,.08,cream,cx+dx,1.95,-.04,0,Math.PI/2);}
      box(.65,.075,.12,paint,cx,1.56,-.04);
      cyl(.085,.67,paint,cx,1.95,-.17,Math.PI/2);cyl(.22,.065,cream,cx,1.55,-.05);cyl(.18,.025,dark,cx,1.59,-.05);
      // A real trunnion crosses both fork bearings and the telescope body.
      cyl(.052,.67,steel,cx,1.95,-.04,0,Math.PI/2);
      cyl(.13,.09,paint,cx,1.95,-.06,Math.PI/2);
      cyl(.067,.21,steel,cx,1.95,.235,Math.PI/2);
      cyl(.085,.075,dark,cx,1.95,.35,Math.PI/2);
      cyl(.053,.018,steel,cx,1.95,.394,Math.PI/2);
      cyl(.042,.020,dark,cx,1.95,.405,Math.PI/2);
      // Levelling screws visibly sit between the graduated circle and fork.
      cyl(.21,.06,cream,cx,1.395,-.05);
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3,x=cx+Math.cos(a)*.15,z=-.05+Math.sin(a)*.15;
        cyl(.034,.13,steel,x,1.49,z);cyl(.057,.045,dark,x,1.48,z);
      }
      for(let i=0;i<12;i++){const a=i*Math.PI/6;box(.013,.018,.045,copper,cx+Math.cos(a)*.17,1.61,-.05+Math.sin(a)*.17,a);}
    }
    const lensY=kind==='tracking'?1.83:1.95;
    cyl(.15,.25,dark,cx,lensY,-.60,Math.PI/2);cyl(.17,.035,steel,cx,lensY,-.74,Math.PI/2);cyl(.13,.035,dark,cx,lensY,-.77,Math.PI/2);
    // Open, tapered lens hood: the mouth stays hollow and its objective is
    // recessed. A solid cone here would read as a capped pipe from side views.
    const hoodProfile=[new THREE.Vector2(.142,0),new THREE.Vector2(.188,.16),
      new THREE.Vector2(.174,.16),new THREE.Vector2(.129,0)];
    put(new THREE.LatheGeometry(hoodProfile,16),paint,cx,lensY,-.785,-Math.PI/2);
    put(new THREE.TorusGeometry(.181,.012,6,16),steel,cx,lensY,-.95);
    cyl(.116,.012,steel,cx,lensY,-.80,Math.PI/2);
    cyl(.101,.014,dark,cx,lensY,-.81,Math.PI/2);
    for(const z of[-.53,-.58,-.63])cyl(.159,.022,cream,cx,lensY,z,Math.PI/2);
    // Focus pinion and ribbed wheel are mounted on a continuous shaft. The
    // lower pan handle likewise reaches its bearing instead of floating nearby.
    const focusX=cx+(kind==='tracking'?.43:.39);
    cyl(.027,.25,steel,focusX-.12,lensY,-.04,0,Math.PI/2);
    cyl(.09,.065,dark,focusX,lensY,-.04,0,Math.PI/2);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      box(.072,.026,.026,steel,focusX,lensY+Math.cos(a)*.078,-.04+Math.sin(a)*.078);
    }
    cyl(.028,.32,steel,cx+.33,1.7,-.05,0,Math.PI/2);
    cyl(.12,.08,steel,cx+.47,1.7,-.05,0,Math.PI/2);
    tube([[cx+.47,1.7,-.05],[cx+.47,1.62,.16],[cx+.47,1.48,.36]],.022,steel);
    tube([[cx+.47,1.48,.36],[cx+.47,1.43,.48]],.038,dark);
    cyl(.06, .62, steel, cx, 1.25, -.05);
    cyl(.17,.07,paint,cx,1.29,-.05);cyl(.12,.065,steel,cx,1.34,-.05);
    for(const dx of[-.19,.19])cyl(.045,.1,dark,cx+dx,1.28,-.05,0,Math.PI/2);
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3,fx=cx+Math.cos(a)*.6,fz=-.05+Math.sin(a)*.6;
      tube([[cx,1.25,-.05],[fx,.2,fz]],.035,steel);box(.15,.13,.12,dark,fx,.135,fz,a);
      // Telescoping lower legs and friction clamps visibly connect each foot.
      tube([[(cx+fx)*.5,.725,(-.05+fz)*.5],[fx,.2,fz]],.045,paint);
      cyl(.055,.065,dark,(cx+fx)*.5,.725,(-.05+fz)*.5);
      tube([[cx, .67,-.05],[(cx+fx)/2,.72,(fz-.05)/2]],.018,steel);
    }
    clipboard(.87, 1.18, .25, 8);
  }
  if(standUsesPower(kind)){
    for(let i=0;i<5;i++)box(.5,.025,.025,dark,-1.2,.62+i*.07,-.55);
    tube([[1.25,1.1,-.55],[1.6,.66,-.65],[1.7,.20,-.9],[2.15,.14,-1.3]],.022,dark);
  }
  root.userData.standIndex = index;
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    if (merged) { merged.computeBoundingSphere(); const mesh = new THREE.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); }
    geometries.forEach(geometry => geometry.dispose());
  }
  return root;
}
