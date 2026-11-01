/** Local-only vehicle inspection; no debug hooks are included in the game. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use local Vite.');
const out=resolve('artifacts/vehicle-pass');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],metrics={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.route('**/apollo-vehicle-acceptance',r=>r.fulfill({contentType:'text/html',body:`
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}</style><script type="module">
import * as THREE from '/node_modules/three/build/three.module.js';
import {buildCar,CAR_SPECS,poseVehicle} from '/src/apollo/ApolloVehicles.ts';
window.THREE=THREE;window.poseVehicle=poseVehicle;window.CAR_SPECS=CAR_SPECS;
window.scene=new THREE.Scene();scene.background=new THREE.Color(0xaebdc0);
window.camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,100);
window.renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xddeef4,0x697159,2.5));const sun=new THREE.DirectionalLight(0xffedd1,3);sun.position.set(-6,8,4);scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x686b65,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.012;scene.add(ground);
window.cars={};const materials=new Map();for(const kind of ['sedan','van']){cars[kind]=buildCar(CAR_SPECS[kind],{kind,paint:kind==='van'?0xd9d6bd:0x546e73,periodStyle:true},(name,color,roughness,metalness)=>{if(!materials.has(name))materials.set(name,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materials.get(name)});scene.add(cars[kind]);}
window.frame=(kind,rear=false)=>{for(const[k,car]of Object.entries(cars))car.visible=k===kind;const car=cars[kind];poseVehicle(car,0,0,0);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);camera.position.set(rear?5.7:-5.7,3.15,rear?7.6:-7.6);camera.lookAt(0,1,0);renderer.render(scene,camera);return{drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures}};
window.ready=true;</script>`}));
try{
 await page.goto(new URL('/apollo-vehicle-acceptance',base).href);await page.waitForFunction(()=>window.ready);
 for(const kind of ['sedan','van'])for(const rear of [false,true]){const name=kind+(rear?'-rear':'-front');metrics[name]=await page.evaluate(({kind,rear})=>frame(kind,rear),{kind,rear});await page.screenshot({path:resolve(out,name+'.png')});}
 const physics=await page.evaluate(()=>{
  const car=cars.van,rig=car.userData.vehicleRig;
  const sample=(distance,speed,acceleration,reduced=false,time=1)=>{poseVehicle(car,distance,speed,time,reduced,acceleration);car.updateMatrixWorld(true);return{wheels:rig.wheels.map(w=>({angle:w.rotation.x,bounds:new THREE.Box3().setFromObject(w,true).min.y})),body:{height:rig.body.position.y,pitch:rig.body.rotation.x,roll:rig.body.rotation.z},root:car.position.toArray(),rotation:car.rotation.toArray()};};
  const parked=sample(0,0,0),accelerating=sample(15,7,2),braking=sample(15,7,-2),replay=sample(15,7,2,false,88);
  sample(3,2,1);const sought=sample(15,7,2),reduced=sample(15,7,2,true),highAcceleration=sample(150,40,1000);
  return{parked,accelerating,braking,replay,sought,reduced,highAcceleration,bodyRestHeight:rig.bodyRestHeight,radius:rig.wheelRadius};
 });
 assert.deepEqual(physics.accelerating,physics.replay,'Distance sampling is independent of frame time.');
 assert.deepEqual(physics.accelerating,physics.sought,'Seeking reproduces the complete vehicle pose.');
 assert.ok(physics.accelerating.body.pitch>0&&physics.braking.body.pitch<0,'Sprung body reacts to acceleration and braking.');
 for(const state of [physics.accelerating,physics.braking,physics.reduced,physics.highAcceleration]){
  assert.ok(state.wheels.every(w=>w.bounds>=-.006&&w.bounds<.006),'Tyre contacts remain planted while the body moves.');
  assert.ok(Math.abs(state.body.pitch)<=.02,'Pitch stays bounded under extreme acceleration.');
  assert.deepEqual(state.root,[0,0,0]);
 }
 assert.equal(physics.accelerating.wheels[0].angle,-15/physics.radius,'Wheels roll from traveled distance.');
 assert.deepEqual(physics.reduced.body,{height:physics.bodyRestHeight,pitch:0,roll:0});
 assert.equal(physics.parked.body.height,physics.bodyRestHeight);
 assert.ok(Object.values(metrics).every(m=>m.drawCalls<=32),'Added details share the existing material batches.');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{frame('van',true);camera.position.multiplyScalar(1.75);renderer.render(scene,camera)});await page.screenshot({path:resolve(out,'van-narrow.png')});
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'report.json'),JSON.stringify({metrics,physics,errors},null,2));console.log('PASS vehicle details: 5 views, planted tyres, bounded load transfer, exact seek/replay, odometry, reduced motion, unchanged draw-call budget, no browser errors.');
}catch(e){await page.screenshot({path:resolve(out,'failure.png')});throw e}finally{await browser.close()}
