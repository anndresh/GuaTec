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
  // Cross-sections give the face a jaw/cheek/brow silhouette and the shirt a
  // fitted shoulder line. One continuous surface avoids overlapping face blobs.
  function sections(rings: number[][], segments = 24) {
    const vertices:number[]=[],indices:number[]=[];
    for(const [y,rx,rz,cz] of rings)for(let i=0;i<=segments;i++){
      const angle=i/segments*Math.PI*2;
      vertices.push(Math.sin(angle)*rx,y,Math.cos(angle)*rz+cz);
    }
    for(let r=0;r<rings.length-1;r++)for(let i=0;i<segments;i++){
      const a=r*(segments+1)+i,b=a+segments+1;
      indices.push(a,a+1,b,b,a+1,b+1);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    const normal=g.getAttribute('normal');
    for(let r=0;r<rings.length;r++){
      const first=r*(segments+1),last=first+segments;
      const n=new THREE.Vector3().fromBufferAttribute(normal,first).add(new THREE.Vector3().fromBufferAttribute(normal,last)).normalize();
      normal.setXYZ(first,n.x,n.y,n.z);normal.setXYZ(last,n.x,n.y,n.z);
    }
    // Every other primitive has UVs; retain that layout for material batching.
    g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));return g;
  }
  mesh(sections([[.915,.195,.12,0],[.96,.207,.132,0],[1.07,.196,.13,0],[1.19,.208,.145,0],[1.31,.228,.14,0],[1.37,.245,.123,0],[1.41,.208,.105,0],[1.465,.075,.067,0]]),shirt,0,0,0);
  box(.40,.065,.275,leather,0,.93,0);
  box(.065,.05,.022,metal,0,.93,.15);
  // Placket, breast pockets, folded collars and clipped identification card.
  for(let i=0;i<4;i++){
    const y=1.04+i*.095,z=y<1.12?.141:y<1.30?.151:.142;
    sphere(.007,metal,0,y,z);
  }
  for(const side of [-1,1]) {
    // Follow the curved chest instead of hanging flat pocket plates ahead of it.
    const pocket=new THREE.Group();pocket.position.set(side*.115,1.28,.124);pocket.rotation.y=side*.35;root.add(pocket);
    box(.105,.12,.014,shirt,0,0,0,pocket);
    box(.105,.008,.016,shirt,0,.06,.010,pocket);
    if(side<0){
      box(.060,.085,.010,paper,0,-.03,.017,pocket);
      box(.050,.014,.012,metal,0,.018,.023,pocket);
      box(.040,.005,.008,seam,0,-.025,.024,pocket);
      box(.026,.004,.008,seam,-.005,-.045,.024,pocket);
    }else cylinder(.006,.006,.10,leather,.012,.075,.012,pocket);
    // No animation pivot here: keep pocket details in the shared torso batch.
    root.updateMatrixWorld(true);for(const item of [...pocket.children])root.attach(item);pocket.removeFromParent();
    const collar=box(.085,.064,.025,shirt,side*.055,1.43,.075);collar.rotation.z=side*.45;
    box(.02,.07,.018,seam,side*.17,.94,.14);
  }

  const head=new THREE.Group();head.name='technician-head';head.position.set(0,1.68,0);root.add(head);
  cylinder(.066,.075,.12,skin,0,-.20,0,head);
  mesh(sections([[-.17,.045,.045,.012],[-.145,.082,.071,.018],[-.105,.108,.088,.012],[-.045,.134,.112,-.002],[.018,.14,.123,-.008],[.072,.137,.121,-.009],[.125,.12,.108,-.014],[.17,.071,.065,-.018],[.184,.002,.002,-.018]]),skin,0,0,0,head);
  // Eyes sit in shallow sockets, with small lids instead of oversized black blocks.
  for(const side of [-1,1]) {
    sphere(.027,skin,side*.144,-.01,0,head).scale.set(.55,1,.75);
    sphere(.017,paper,side*.05,.018,.112,head).scale.set(1,.50,.30);
    sphere(.007,leather,side*.05,.018,.118,head).scale.set(.75,1,.4);
    box(.044,.007,.014,hair,side*.05,.043,.111,head);
    box(.035,.005,.012,skin,side*.05,.028,.118,head);
  }
  sphere(.023,skin,0,-.025,.119,head).scale.set(.70,1.15,1.35);
  box(.041,.0025,.006,hair,0,-.092,.114,head);
  const scalp=new THREE.SphereGeometry(.153,24,12,0,Math.PI*2,0,1.60);
  const hairPoints=scalp.getAttribute('position');
  for(let i=0;i<hairPoints.count;i++){
    const x=hairPoints.getX(i),y=hairPoints.getY(i),z=hairPoints.getZ(i);
    const edge=1-Math.min(1,y/.153);
    // Front swept hairline, lower at the nape; asymmetric part breaks the bowl.
    hairPoints.setXYZ(i,x,y+edge*(z>0?.045+Math.sin(x*22)*.012:-.025),z*.96);
  }
  scalp.computeVertexNormals();mesh(scalp,hair,0,.040,-.015,head);
  for(const side of [-1,1])box(.015,.045,.024,hair,side*.132,.006,-.015,head);
  if(role==='complex') {
    const helmet=mesh(new THREE.SphereGeometry(.172,16,10,0,Math.PI*2,0,Math.PI/2),paper,0,.09,0,head);helmet.scale.y=.72;
    cylinder(.187,.187,.018,paper,0,.09,0,head);
    box(.035,.10,.26,paper,0,.16,0,head);
    box(.04,.035,.009,metal,0,.12,.168,head);
  } else if(role==='observation') {
    sphere(.159,shirt,0,.115,-.012,head).scale.set(1,.62,1);
    box(.27,.02,.17,shirt,0,.112,.13,head);
    box(.04,.025,.012,paper,0,.15,.142,head);
  }
  if(role==='documentation') {
    for(const side of [-1,1]) {
      const rim=mesh(new THREE.TorusGeometry(.032,.0035,5,18),leather,side*.05,.018,.131,head);rim.scale.y=.83;
      box(.007,.007,.11,leather,side*.095,.018,.076,head);
    }
    box(.035,.005,.008,leather,0,.018,.135,head);
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
  const elbows:THREE.Group[]=[];
  const arms=[-1,1].map(side=>{
    const shoulder=new THREE.Group();shoulder.name=side<0?'left-shoulder':'right-shoulder';shoulder.position.set(side*.235,1.37,0);root.add(shoulder);
    const upper=mesh(new THREE.CapsuleGeometry(.067,.145,4,12),shirt,side*.035,-.10,.012,shoulder);
    upper.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-side*.07,.23,-.025).normalize());
    const elbow=new THREE.Group();elbow.name='elbow';elbow.position.set(side*.07,-.25,.025);shoulder.add(elbow);elbows.push(elbow);
    cylinder(.060,.060,.018,shirt,0,.015,0,elbow);
    beam(new THREE.Vector3(),new THREE.Vector3(0,-.22,0),.044,skin,elbow);
    const hand=new THREE.Group();hand.name='hand';hand.position.set(0,-.235,0);hand.rotation.x=.25;elbow.add(hand);
    sphere(.042,skin,0,0,0,hand).scale.set(.8,1.1,.55);
    for(let i=0;i<4;i++){
      const x=-.025+i*.016,length=i===0||i===3?.031:.039;
      beam(new THREE.Vector3(x,-.018,0),new THREE.Vector3(x,-.018-length,.006),.008,skin,hand);
      beam(new THREE.Vector3(x,-.018-length,.006),new THREE.Vector3(x,-.023-length,.023),.007,skin,hand);
    }
    beam(new THREE.Vector3(side*.027,.005,0),new THREE.Vector3(side*.047,-.026,.018),.012,skin,hand);
    if(side===1&&role==='documentation'){
      // The board follows the hand rather than floating beside the body.
      const board=new THREE.Group();board.name='clipboard';board.position.set(-.10,-.04,.03);board.rotation.x=.65;hand.add(board);
      box(.23,.31,.018,leather,0,0,0,board);box(.20,.27,.008,paper,0,-.006,.015,board);box(.09,.025,.015,metal,0,.145,.02,board);
      for(let i=0;i<7;i++)box(i%3===0?.11:.16,.003,.008,seam,-.01,.09-i*.025,.022,board);
    }
    if(side===1&&role==='communications'){
      const mic=box(.055,.085,.035,leather,0,-.03,.03,hand);mic.name='push-to-talk-microphone';
      for(let i=0;i<4;i++)box(.035,.004,.008,metal,0,-.005-i*.012,.05,hand);
      box(.012,.018,.01,metal,.031,-.02,.03,hand);
    }
    if(side===1&&role==='complex'){
      // Open-ended spanner: a readable tool silhouette, held by the grip.
      box(.022,.17,.012,metal,0,-.06,.025,hand);
      for(const side of[-1,1])box(.018,.045,.018,metal,side*.025,.043,.025,hand);
      box(.062,.018,.018,metal,0,.016,.025,hand);
    }
    if(side===1&&role==='observation'){
      const optics=new THREE.Group();optics.name='field-binoculars';optics.position.set(-.045,-.025,.035);optics.rotation.x=-.25;hand.add(optics);
      for(const x of[-.043,.043]){
        const body=cylinder(.034,.042,.11,leather,x,0,.035,optics);body.rotation.x=Math.PI/2;
        const rim=cylinder(.044,.044,.015,metal,x,0,.095,optics);rim.rotation.x=Math.PI/2;
        const lens=cylinder(.035,.035,.003,seam,x,0,.105,optics);lens.rotation.x=Math.PI/2;
      }
      box(.09,.025,.06,leather,0,0,.025,optics);
      cylinder(.014,.014,.04,metal,0,.022,.025,optics);
    }
    return shoulder;
  });
  if(role==='communications'){
    box(.12,.18,.055,leather,.20,.85,-.04);
    cylinder(.005,.005,.12,metal,.20,1.0,-.04);
  }
  return {root,head,leftElbow:elbows[0]!,rightElbow:elbows[1]!,leftArm:arms[0]!,rightArm:arms[1]!,leftLeg:legs[0]!,rightLeg:legs[1]!};
}
