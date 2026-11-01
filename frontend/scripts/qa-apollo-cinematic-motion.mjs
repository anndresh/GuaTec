/** Local-only cinematic fixtures plus real-input locomotion and unpaused video. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use local Vite.');
const out=resolve(process.env.APOLLO_CINEMA_OUTPUT||'artifacts/apollo-cinematic-motion');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:resolve(out,'motion'),size:{width:960,height:600}}});
const page=await context.newPage(),errors=[],checks=[],metrics={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.route('**/apollo-cinematic-motion-acceptance',route=>route.fulfill({contentType:'text/html',body:`
<meta charset="utf-8"><style>html,body,#world{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="world"></div><script type="module">
import {ApolloWorld} from '/src/apollo/ApolloWorld.ts';
window.world=new ApolloWorld(document.querySelector('#world'),{onInteract(){},onMap(){}});await world.ready;
window.play=(mode,start=0)=>{window.mode=mode;window.time=start;window.animate=true;world.setCinematic(mode,start);world.setSuspended(false)};
window.seek=(mode,time)=>{window.animate=false;world.setCinematic(mode,time);world.update(0)};
window.animate=false;window.mode=null;window.time=0;
let previous=performance.now();function frame(now){const dt=Math.min(.05,(now-previous)/1000);previous=now;if(window.animate){window.time+=dt;world.setCinematic(window.mode,window.time);world.update(dt)}requestAnimationFrame(frame)}requestAnimationFrame(frame);window.ready=true;
</script>`}));
const capture=async label=>{metrics[label]=await page.evaluate(()=>world.diagnostics());await page.screenshot({path:resolve(out,label+'.png')})};
try{
 await page.goto(new URL('/apollo-cinematic-motion-acceptance',base).href);await page.waitForFunction(()=>window.ready,undefined,{timeout:60000});assert.deepEqual(await page.evaluate(()=>world.assetErrors),[]);
 await page.evaluate(()=>{world.player.set(0,0,300);play(null)});await page.keyboard.down('w');await page.waitForTimeout(650);await page.keyboard.down('Shift');await page.waitForTimeout(700);await capture('running');await page.keyboard.up('w');await page.keyboard.up('Shift');await page.keyboard.down('Space');await page.waitForTimeout(200);await page.keyboard.up('Space');await capture('airborne');await page.waitForTimeout(800);await capture('landed');
 const intro=await page.evaluate(()=>{
   const samples=[];for(const time of[0,9.99,10,10.01,24.99,25,25.01,36]){seek('intro',time);samples.push({time,camera:world.camera.position.toArray(),target:world.cameraLook.toArray(),fov:world.camera.fov});}return samples;
 });
 for(const [a,b]of[[1,2],[2,3],[4,5],[5,6]])assert.ok(Math.hypot(...intro[a].camera.map((n,i)=>n-intro[b].camera[i]))<5,'Intro rail has no cut at the former segment boundaries.');checks.push({intro});
 await page.evaluate(()=>seek('intro',30));await capture('intro-descent');
 await page.evaluate(()=>play('crew'));await page.waitForFunction(()=>window.time>=2.5);await capture('crew-departure');await page.waitForFunction(()=>window.time>=10);await capture('crew-tracking');await page.waitForFunction(()=>window.time>=24.5,undefined,{timeout:25000});
 const arrival=await page.evaluate(()=>({crew:world.crew.map(r=>r.position.toArray()),van:world.van.position.toArray(),rotation:world.van.rotation.toArray(),weights:world.people.slice(1).map(p=>({walk:p.walk.getEffectiveWeight(),idle:p.idle.getEffectiveWeight()}))}));assert.ok(arrival.weights.every(w=>w.idle>.99&&w.walk<.01));assert.equal(arrival.crew[0][2],29);assert.equal(arrival.van[2],32);checks.push({arrival});
 // Fixed seek/replay must recover wheel angle, suspension and particle history.
 const labelBoxes=await page.evaluate(()=>{
  const shots=[];for(const time of[2.5,7,8,10,13,15,16.75]){seek('crew',time);world.scene.updateMatrixWorld(true);const boxes=world.crew.map(root=>{const mesh=root.children[1],p=mesh.geometry.getAttribute('position'),points=[];for(let i=0;i<p.count;i++)points.push(world.player.clone().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).project(world.camera));return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))}});shots.push({time,boxes});}return shots;
 });
 for(const shot of labelBoxes)for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const a=shot.boxes[i],b=shot.boxes[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,'Crew names remain separate at t='+shot.time)}checks.push({labelBoxes});
 const replay=await page.evaluate(()=>{const sample=()=>({wheel:world.van.userData.vehicleRig.wheels[0].rotation.x,position:world.van.position.toArray(),rotation:world.van.rotation.toArray()});seek('crew',22);const a=sample();seek('crew',3);seek('crew',22);return [a,sample()]});assert.deepEqual(replay[0],replay[1]);checks.push({replay});
 await page.evaluate(()=>play('launch'));await page.waitForFunction(()=>window.time>=4);await capture('engine-ignition');await page.waitForFunction(()=>window.time>=12);await capture('remote-liftoff');await page.waitForFunction(()=>window.time>=20);await capture('ascent');
 const smoke=await page.evaluate(()=>{
  const sample=t=>{seek('launch',t);return {opacity:Array.from(world.smoke.geometry.getAttribute('smokeOpacity').array),matrices:Array.from(world.smoke.instanceMatrix.array)}};
  const before=sample(1),a=sample(12);sample(40);const b=sample(12);seek('launch',40);return{before,first:a,replay:b,groundFaded:Array.from(world.smoke.geometry.getAttribute('smokeOpacity').array).slice(0,Math.ceil(world.smokeCount*.55)),batches:world.exhaust.children.map(m=>m.count)};
 });assert.ok(smoke.before.opacity.every(n=>n===0));assert.deepEqual(smoke.first,smoke.replay);assert.ok(smoke.groundFaded.every(n=>n===0));assert.deepEqual(smoke.batches,[5,5]);checks.push({smokeSeekable:true,groundFades:true,plumeBatches:smoke.batches});
 const arms=await page.evaluate(()=>{seek('launch',10.2);return world.arms.map(a=>a.rotation.y)});assert.ok(arms.every(angle=>angle< -2.1));checks.push({armsClearedBeforeAscent:arms});
 await page.setViewportSize({width:390,height:844});for(const[mode,time,name]of[['crew',5,'crew-mobile'],['launch',12,'launch-mobile'],['launch',25,'ascent-mobile']]){await page.evaluate(({mode,time})=>seek(mode,time),{mode,time});await capture(name)}
 // Force every quality count through the same shader-backed buffer.
 for(const quality of['low','medium','high']){await page.evaluate(quality=>{world.setQuality(quality);seek('launch',12)},quality);assert.equal(await page.evaluate(()=>world.smoke.count),{low:35,medium:65,high:100}[quality]);}
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>window.ready);const reduced=await page.evaluate(()=>{seek('crew',2);const vehicle=world.van.rotation.toArray();seek('launch',12);const a=world.camera.position.toArray();seek('launch',12);return {vehicle,a,b:world.camera.position.toArray(),materialCount:world.exhaust.children.length}});assert.equal(reduced.vehicle[0],0);assert.equal(reduced.vehicle[2],0);assert.deepEqual(reduced.a,reduced.b);checks.push({reducedMotion:reduced});
 const teardown=await page.evaluate(()=>{const rigs=[];world.scene.traverse(node=>{if(node.isInstancedMesh)rigs.push(node)});let released=0;rigs.forEach(r=>r.addEventListener('dispose',()=>released++));world.dispose();return{instances:rigs.length,released,canvas:!!document.querySelector('canvas')}});assert.ok(teardown.instances>=3);assert.equal(teardown.released,teardown.instances);assert.equal(teardown.canvas,false);checks.push({teardown});
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'report.json'),JSON.stringify({checks,metrics,errors},null,2));console.log('PASS: real locomotion video, continuous intro, full crew departure/arrival, seekable suspension/smoke, five exhausts in two batches, early arm release, three qualities and reduced motion.');
}catch(e){await page.screenshot({path:resolve(out,'failure.png')});throw e}finally{await context.close();await browser.close()}
