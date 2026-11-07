import * as THREE from 'three';
import type { MaterialFactory } from './ApolloVehicles';

/** Period ground crew in metres. Every moving limb owns its costume and tools,
 * so material batching can preserve joints without freezing accessories in space. */
export function buildTechnician(role: string, mat: MaterialFactory) {
  const root = new THREE.Group();
  root.name = `dynamic-technician-${role}`;
  root.userData.dynamicTechnician = true;
  root.userData.role = role;
  const shirt = mat(`technician-shirt-${role}`, role === 'communications' ? 0x728b8e : role === 'documentation' ? 0xb6a46e : role === 'observation' ? 0x768b68 : 0xd9d4bd, .92, 0);
  const cloth = mat('technician-pants', 0x42585f, .94, 0);
  const seam = mat('technician-seams', 0x354643, .95, 0);
  const skin = mat(`technician-skin-${role}`, role === 'observation' ? 0x936647 : role === 'documentation' ? 0xd0a17b : 0xb98e67, .85, 0);
  const leather = mat('worker-shoe', 0x303a35, .8, .05);
  const paper = mat('technician-paper', 0xe5dfc6, .96, 0);
  const metal = mat('technician-hardware', 0x8d9991, .5, .5);
  const hair = mat('technician-hair', 0x443c30, .95, 0);
  function mesh(g: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Group = root) {
    const m = new THREE.Mesh(g, material); m.position.set(x,y,z); m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,p=root) => mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,p);
  const sphere = (r:number,m:THREE.Material,x:number,y:number,z:number,p=root) => mesh(new THREE.SphereGeometry(r,12,8),m,x,y,z,p);
  const cylinder = (a:number,b:number,h:number,m:THREE.Material,x:number,y:number,z:number,p=root) => mesh(new THREE.CylinderGeometry(a,b,h,10),m,x,y,z,p);
  function beam(a: THREE.Vector3,b: THREE.Vector3,r:number,m:THREE.Material,p:THREE.Group) {
    const part=mesh(new THREE.CylinderGeometry(r,r*.9,a.distanceTo(b),8),m,0,0,0,p);
    part.position.copy(a).add(b).multiplyScalar(.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return part;
  }
  const torso=mesh(new THREE.LatheGeometry([[.20,.91],[.205,.98],[.19,1.10],[.21,1.28],[.25,1.37],[.22,1.42],[.08,1.47]].map(([r,y])=>new THREE.Vector2(r,y)),20),shirt,0,0,0);
  torso.scale.z=.67;
  box(.40,.065,.275,leather,0,.93,0);
  box(.065,.05,.022,metal,0,.93,.15);
  // Placket, breast pockets, folded collars and clipped identification card.
  box(.022,.36,.018,paper,0,1.20,.147);
  for(let i=0;i<4;i++)sphere(.007,metal,0,1.04+i*.095,.16);
  for(const side of [-1,1]) {
    box(.115,.12,.016,shirt,side*.12,1.28,.151);
    box(.12,.012,.022,seam,side*.12,1.34,.161);
    const collar=box(.085,.064,.025,paper,side*.055,1.43,.10);collar.rotation.z=side*.45;
    box(.02,.07,.018,seam,side*.17,.94,.14);
  }
  box(.065,.09,.012,paper,-.12,1.25,.174);
  box(.05,.018,.014,metal,-.12,1.30,.181);
  box(.045,.006,.014,seam,-.12,1.25,.182);
  box(.026,.005,.014,seam,-.13,1.23,.182);
  cylinder(.006,.006,.1,leather,.125,1.36,.17);

  const head=new THREE.Group();head.name='technician-head';head.position.set(0,1.68,0);root.add(head);
  cylinder(.066,.075,.12,skin,0,-.20,0,head);
  sphere(.144,skin,0,0,0,head).scale.set(1,1.23,.93);
  sphere(.09,skin,0,-.10,.025,head).scale.set(.94,.68,1);
  // Eyes sit in shallow sockets, with small lids instead of oversized black blocks.
  for(const side of [-1,1]) {
    sphere(.027,skin,side*.144,-.01,0,head).scale.set(.55,1,.75);
    sphere(.019,paper,side*.05,.018,.128,head).scale.set(1,.55,.3);
    sphere(.008,leather,side*.05,.018,.135,head).scale.set(.75,1,.4);
    box(.044,.007,.014,hair,side*.05,.045,.128,head);
    box(.035,.005,.012,skin,side*.05,.030,.138,head);
  }
  sphere(.026,skin,0,-.025,.14,head).scale.set(.65,1.18,1.25);
  box(.045,.004,.008,hair,0,-.09,.128,head);
  const hairCap=mesh(new THREE.SphereGeometry(.146,16,8,0,Math.PI*2,0,1.45),hair,0,.04,-.01,head);hairCap.scale.set(1,1.05,.94);
  for(const side of [-1,1])box(.018,.07,.025,hair,side*.13,.014,-.005,head);
  if(role==='complex') {
    const helmet=mesh(new THREE.SphereGeometry(.172,16,10,0,Math.PI*2,0,Math.PI/2),paper,0,.09,0,head);helmet.scale.y=.72;
    cylinder(.187,.187,.018,paper,0,.09,0,head);
    box(.035,.10,.26,paper,0,.16,0,head);
    box(.04,.035,.009,metal,0,.12,.168,head);
  } else if(role==='observation') {
    sphere(.159,shirt,0,.09,-.01,head).scale.set(1,.55,1);
    box(.27,.02,.17,shirt,0,.09,.13,head);
    box(.04,.025,.012,paper,0,.13,.142,head);
  }
  if(role==='documentation') {
    for(const side of [-1,1]) {
      const rim=mesh(new THREE.TorusGeometry(.032,.0035,5,18),leather,side*.05,.018,.145,head);rim.scale.y=.83;
      box(.007,.007,.11,leather,side*.095,.018,.09,head);
    }
    box(.035,.005,.008,leather,0,.018,.149,head);
  }
  if(role==='communications') {
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.16,0,0),new THREE.Vector3(-.17,.15,0),new THREE.Vector3(0,.21,-.02),new THREE.Vector3(.17,.15,0),new THREE.Vector3(.16,0,0)]);
    mesh(new THREE.TubeGeometry(curve,18,.014,5,false),leather,0,0,0,head);
    for(const side of [-1,1]) {
      sphere(.055,leather,side*.16,0,0,head).scale.set(.6,1,1);
      sphere(.036,metal,side*.183,0,0,head).scale.set(.3,1,1);
    }
    const boom=new THREE.CatmullRomCurve3([new THREE.Vector3(.17,-.01,.01),new THREE.Vector3(.16,-.065,.12),new THREE.Vector3(.045,-.08,.17)]);
    mesh(new THREE.TubeGeometry(boom,10,.007,5,false),metal,0,0,0,head);
    sphere(.018,leather,.045,-.08,.17,head);
  }
  const legs=[-1,1].map(side=>{
    const hip=new THREE.Group();hip.name=side<0?'left-hip':'right-hip';hip.position.set(side*.113,.90,0);root.add(hip);
    cylinder(.10,.082,.40,cloth,0,-.20,0,hip);
    box(.08,.14,.016,seam,side*.055,-.12,.068,hip);
    const shin=new THREE.Group();shin.position.y=-.40;hip.add(shin);
    cylinder(.083,.070,.39,cloth,0,-.195,0,shin);
    box(.012,.30,.008,seam,0,-.22,.074,shin);
    cylinder(.073,.073,.025,seam,0,-.38,0,shin);
    const boot=sphere(.10,leather,0,-.42,.05,shin);boot.scale.set(.83,.65,1.6);
    box(.16,.025,.275,leather,0,-.475,.05,shin);
    for(let i=0;i<3;i++)box(.07,.005,.008,metal,0,-.375,.04+i*.025,shin);
    return hip;
  });
  const arms=[-1,1].map(side=>{
    const shoulder=new THREE.Group();shoulder.name=side<0?'left-shoulder':'right-shoulder';shoulder.position.set(side*.235,1.37,0);root.add(shoulder);
    sphere(.075,shirt,0,-.025,0,shoulder).scale.set(1,1.15,1);
    beam(new THREE.Vector3(0,-.03,0),new THREE.Vector3(side*.07,-.23,.025),.065,shirt,shoulder);
    const elbow=new THREE.Group();elbow.name='elbow';elbow.position.set(side*.07,-.25,.025);shoulder.add(elbow);
    cylinder(.058,.058,.035,paper,0,.015,0,elbow);
    beam(new THREE.Vector3(),new THREE.Vector3(-side*.035,-.13,.18),.044,skin,elbow);
    const hand=new THREE.Group();hand.name='hand';hand.position.set(-side*.035,-.145,.20);hand.rotation.x=-.65;elbow.add(hand);
    sphere(.042,skin,0,0,0,hand).scale.set(.8,1.1,.55);
    for(let i=0;i<4;i++)beam(new THREE.Vector3(-.025+i*.016,-.018,0),new THREE.Vector3(-.025+i*.016,-.057+(i===0||i===3?.008:0),.018),.008,skin,hand);
    beam(new THREE.Vector3(side*.027,.005,0),new THREE.Vector3(side*.047,-.026,.018),.012,skin,hand);
    if(side===1&&role==='documentation'){
      // The board follows the hand rather than floating beside the body.
      const board=new THREE.Group();board.name='clipboard';board.position.set(-.10,-.04,.03);board.rotation.x=.65;hand.add(board);
      box(.23,.31,.018,leather,0,0,0,board);box(.20,.27,.008,paper,0,-.006,.015,board);box(.09,.025,.015,metal,0,.145,.02,board);
      for(let i=0;i<7;i++)box(i%3===0?.11:.16,.003,.008,seam,-.01,.09-i*.025,.022,board);
    }
    return shoulder;
  });
  return {root,head,leftArm:arms[0]!,rightArm:arms[1]!,leftLeg:legs[0]!,rightLeg:legs[1]!};
}
