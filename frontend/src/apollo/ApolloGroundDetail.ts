import * as THREE from 'three';
import {SITE_BUILDINGS, SITE_PLOTS} from './ApolloSiteLayout';
import {standCollisionProxies} from './ApolloStandModels';

/** Ground-only occlusion keeps equipment planted even with shadow maps off. */
export function createApolloContactShadows(vehicles: THREE.Group[]): THREE.Group {
  const root = new THREE.Group(); root.name = 'grounded-equipment-contacts';
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(32,32,1,32,32,32);
  gradient.addColorStop(0,'rgba(0,0,0,.30)');gradient.addColorStop(.48,'rgba(0,0,0,.19)');gradient.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0,0,64,64);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const spots: {x:number;y:number;z:number;w:number;d:number;angle:number}[] = [];
  for (const plot of SITE_PLOTS) for (const p of standCollisionProxies(plot.kind,plot.target.x,plot.target.z)) {
    spots.push({x:p.x,y:.075,z:p.z,w:Math.max(.4,p.w*2.4),d:Math.max(.4,p.d*2.4),angle:0});
  }
  for (const b of SITE_BUILDINGS) spots.push({x:b.x,y:.011,z:b.z,w:b.width+4,d:b.depth+4,angle:0});
  const geometry = new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
  for (const vehicle of vehicles) if (!vehicle.visible || vehicle.userData.vehicleRig?.wheelbase > 3) {
    // The crew transport is attached to its unsprung root so suspension does
    // not lift its contact shadow off the road. Visibility follows its parent.
    const shadow = new THREE.Mesh(geometry,material);shadow.position.y=.075;shadow.scale.set(2.4,1,6.1);vehicle.add(shadow);
  } else spots.push({x:vehicle.position.x,y:.075,z:vehicle.position.z,w:2.25,d:5.1,angle:vehicle.rotation.y});
  const mesh = new THREE.InstancedMesh(geometry,material,spots.length), dummy = new THREE.Object3D();
  for (const [i,s] of spots.entries()) {
    dummy.position.set(s.x,s.y,s.z);dummy.rotation.y=s.angle;dummy.scale.set(s.w,1,s.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);
  root.userData.contacts=spots.length;
  return root;
}

/** Low coastal scrub sits outside the traversable support route. */
export function createApolloCoastalScrub(): THREE.InstancedMesh {
  const positions: number[] = [], colors: number[] = [];
  const base = new THREE.Color(0x74794d), tip = new THREE.Color(0xa2a26c);
  for (let blade=0;blade<7;blade++) {
    const a=blade*2.399, x=Math.cos(a)*.27,z=Math.sin(a)*.27,h=.34+(blade%3)*.13;
    for (const p of [[x-.09,0,z],[x+.09,0,z],[x+Math.cos(a)*.22,h,z+Math.sin(a)*.22]]) {
      positions.push(...p);colors.push(...(p[1]>0?tip:base).toArray());
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,side:THREE.DoubleSide});
  const mesh=new THREE.InstancedMesh(geometry,material,1800);mesh.name='coastal-scrub-outside-route';mesh.receiveShadow=true;
  let seed=314159;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const dummy=new THREE.Object3D(), color=new THREE.Color();
  for(let i=0;i<1800;i++){
    const side=i%2?1:-1,band=side*(158+rand()**1.8*460),z=105+rand()*510;
    dummy.position.set(band,-.12,z);dummy.rotation.y=rand()*Math.PI*2;
    const s=.8+rand()*2.8;dummy.scale.set(s,.6+rand()*1.5,s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    color.setHSL(.14+rand()*.035,.15+rand()*.16,.65+rand()*.16);mesh.setColorAt(i,color);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor!.needsUpdate=true;mesh.computeBoundingSphere();
  return mesh;
}
