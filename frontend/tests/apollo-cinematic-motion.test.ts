import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cinematicTravel} from '../src/apollo/ApolloCinematicMotion';
import {ApolloExhaust} from '../src/apollo/ApolloExhaust';
import {buildCar,CAR_SPECS,poseVehicle,type VehicleRig} from '../src/apollo/ApolloVehicles';

test('crew paths reach their mark with continuous speed and acceleration at joins',()=>{
  for(const distance of[44,48]){
    assert.deepEqual(cinematicTravel(-2,distance),{distance:0,speed:0,acceleration:0});
    const end=cinematicTravel(26,distance);assert.equal(end.distance,distance);assert.equal(end.speed,0);
    let previous=-1;
    for(let t=0;t<=24;t+=.025){const s=cinematicTravel(t,distance);assert.ok(s.distance>=previous);previous=s.distance;assert.ok(s.speed>=0);assert.ok(Number.isFinite(s.acceleration));}
    for(const t of[2.5,21.5]){const left=cinematicTravel(t-1e-6,distance),right=cinematicTravel(t+1e-6,distance);assert.ok(Math.abs(left.speed-right.speed)<1e-5);assert.ok(Math.abs(left.acceleration-right.acceleration)<1e-5);}
    for(const t of[.7,5,22.3]){const h=1e-5,a=cinematicTravel(t-h,distance),b=cinematicTravel(t+h,distance),s=cinematicTravel(t,distance);assert.ok(Math.abs((b.distance-a.distance)/(2*h)-s.speed)<1e-6);assert.ok(Math.abs((b.speed-a.speed)/(2*h)-s.acceleration)<1e-6);}
  }
});

test('five exhausts share two bounded batches anchored at the nozzle mouths',()=>{
  const exhaust=new ApolloExhaust();assert.equal(exhaust.children.length,2);
  for(const node of exhaust.children){const batch=node as THREE.InstancedMesh;assert.equal(batch.count,5);assert.equal(batch.material instanceof THREE.MeshBasicMaterial,true);const mat=batch.material as THREE.MeshBasicMaterial;assert.equal(mat.depthWrite,false);assert.equal(mat.map,null);assert.equal(mat.blending,THREE.AdditiveBlending);assert.ok(batch.boundingSphere?.radius!>0);
    const matrix=new THREE.Matrix4();for(let i=0;i<5;i++){batch.getMatrixAt(i,matrix);assert.ok(Math.abs(matrix.elements[13]-1.02)<1e-6)}
    const pos=batch.geometry.getAttribute('position');for(const n of pos.array)assert.ok(Number.isFinite(n));
    const box=new THREE.Box3().setFromBufferAttribute(pos as THREE.BufferAttribute);assert.equal(box.max.y,0);assert.ok(box.min.y>=-29.001);
    batch.geometry.dispose();mat.dispose();
  }
  exhaust.pose(5,1,false);assert.equal(exhaust.visible,true);exhaust.pose(0,0,false);assert.equal(exhaust.visible,false);
});

test('transport brake dive and brake lamps follow deceleration and replay exactly',()=>{
  const mats:THREE.MeshStandardMaterial[]=[];
  const vehicle=buildCar(CAR_SPECS.van,{kind:'van',paint:0xd9d6bd,periodStyle:true},(_name,color,roughness,metalness)=>{const mat=new THREE.MeshStandardMaterial({color,roughness,metalness});mats.push(mat);return mat});
  const rig=vehicle.userData.vehicleRig as VehicleRig;
  poseVehicle(vehicle,20,2,22,false,-.8);assert.ok(vehicle.rotation.x<0);assert.equal(rig.taillamp.emissiveIntensity,.55);
  const pose=vehicle.rotation.toArray();poseVehicle(vehicle,4,2,4,false,.8);assert.ok(vehicle.rotation.x>0);assert.equal(rig.taillamp.emissiveIntensity,.18);
  poseVehicle(vehicle,20,2,22,false,-.8);assert.deepEqual(vehicle.rotation.toArray(),pose);
  poseVehicle(vehicle,20,2,22,true,-.8);assert.equal(vehicle.rotation.x,0);assert.equal(vehicle.rotation.z,0);assert.equal(rig.wheels[0].rotation.x,-50);
  vehicle.traverse(node=>{if(node instanceof THREE.Mesh)node.geometry.dispose()});mats.forEach(m=>m.dispose());
});
