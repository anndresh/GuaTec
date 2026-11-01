/** Local-only arm attachment, detail budget and swing-away acceptance. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5173');if(!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use local Vite.');
const baseline=process.env.APOLLO_ARM_BASELINE==='1',out=resolve(process.env.APOLLO_ARM_OUTPUT||'artifacts/apollo-service-arms');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||undefined}),page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],metrics={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.route('**/service-arm-acceptance',route=>route.fulfill({contentType:'text/html',body:`<style>html,body,#world{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="world"></div><script type="module">import {ApolloWorld} from '/src/apollo/ApolloWorld.ts';window.world=new ApolloWorld(document.querySelector('#world'),{onInteract(){},onMap(){}});await world.ready;world.setSuspended(true);world.update(0);window.frame=(position,target)=>{world.camera.position.set(...position);world.camera.lookAt(...target);world.camera.fov=45;world.camera.updateProjectionMatrix();world.renderer.render(world.scene,world.camera);return world.diagnostics()};window.ready=true;</script>`}));
const capture=async(name,position,target)=>{metrics[name]=await page.evaluate(({position,target})=>frame(position,target),{position,target});await page.screenshot({path:resolve(out,name+'.png')})};
try{
 await page.goto(new URL('/service-arm-acceptance',base).href);await page.waitForFunction(()=>window.ready,undefined,{timeout:60000});assert.deepEqual(await page.evaluate(()=>world.assetErrors),[]);
 await page.evaluate(()=>world.playerRoot.visible=false);
 for(const[name,position,target]of[['lower',[-17,29,15],[-6,24,-2]],['middle',[-18,73,18],[-6,68,-2]],['upper',[-16,107,15],[-5,103,-1]],['pad',[45,95,110],[-5,62,0]]])await capture(name,position,target);
 await page.evaluate(()=>{world.playerRoot.visible=true;world.setSuspended(false);world.update(1/60)});await capture('exploration',[-35,3.35,141.8],[-35,1.35,136]);
 let attachments=null;
 if(!baseline){
  attachments=await page.evaluate(()=>{world.setCinematic('crew',0);world.update(0);world.scene.updateMatrixWorld(true);return world.arms.map(arm=>{const data=arm.userData.serviceArm,terminal=world.player.clone().set(data.terminal.x,data.terminal.y,data.terminal.z);arm.localToWorld(terminal);return{terminal:terminal.toArray(),radius:Math.hypot(terminal.x,terminal.z),expected:arm.userData.connectionRadius,yaw:arm.rotation.y,restYaw:arm.userData.restYaw,triangles:data.triangles,batches:arm.children.length,covered:data.covered}})});
  assert.equal(attachments.length,7);for(const a of attachments){assert.ok(Math.abs(a.radius-a.expected)<.015);assert.ok(a.triangles<9000);assert.ok(a.batches<=4);assert.equal(a.yaw,a.restYaw)}assert.equal(attachments.filter(a=>a.covered).length,1);
  const clearance=await page.evaluate(()=>world.arms.every(arm=>{const reach=arm.userData.serviceArm.terminal.x;for(let step=0;step<=32;step++){const yaw=arm.userData.restYaw-step/32*Math.PI*.68,dx=Math.cos(yaw),dz=-Math.sin(yaw);for(const[x,z]of[[-23,-10],[-23,2],[-11,-10]]){const px=x-arm.position.x,pz=z-arm.position.z,t=Math.max(0,Math.min(reach,px*dx+pz*dz));if(Math.hypot(px-t*dx,pz-t*dz)<1.75)return false}}return true}));assert.equal(clearance,true,'The full walkway sweep clears the other three tower columns.');
  const replay=await page.evaluate(()=>{world.setCinematic('launch',10.2);world.update(0);const a=world.arms.map(n=>n.rotation.y);world.setCinematic('crew',0);world.update(0);world.setCinematic('launch',10.2);world.update(0);return{a,b:world.arms.map(n=>n.rotation.y),deltas:world.arms.map(n=>n.rotation.y-n.userData.restYaw)}});assert.deepEqual(replay.a,replay.b);assert.ok(replay.deltas.every(n=>n< -2.1));
  await capture('released',[-18,73,18],[-6,68,-2]);
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{world.setCinematic('crew',0);world.update(0);world.setQuality('medium')});await capture('upper-mobile',[-20,110,24],[-5,103,-1]);
 assert.equal(metrics.pad.rocketHeightMeters,110.6);assert.equal(metrics.pad.colliders,65);assert.deepEqual(errors,[]);await writeFile(resolve(out,'report.json'),JSON.stringify({baseline,attachments,metrics,errors},null,2));console.log('PASS: authored arm views, unchanged scale/collisions'+(baseline?' (baseline).':', seven skin connections, covered upper passage and deterministic swing-away.'));
}catch(e){await page.screenshot({path:resolve(out,'failure.png')});throw e}finally{await browser.close()}
