/** Local-only antenna views, metre-scale bounds and integrated collision count. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local Vite server.');
const out=resolve(process.env.APOLLO_DISH_OUTPUT||'artifacts/dish-detail-pass/after');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],metrics={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.route('**/apollo-dish-acceptance',route=>route.fulfill({contentType:'text/html',body:`
<style>html,body,#world{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="world"></div><script type="module">
import {ApolloWorld} from '/src/apollo/ApolloWorld.ts';import * as THREE from '/node_modules/three/build/three.module.js';window.THREE=THREE;window.world=new ApolloWorld(document.querySelector('#world'),{onInteract(){},onMap(){}});await world.ready;world.setSuspended(true);world.update(0);window.ready=true;
window.frame=(position,target)=>{world.playerRoot.visible=false;world.camera.position.set(...position);world.camera.lookAt(...target);world.camera.fov=45;world.camera.updateProjectionMatrix();world.renderer.render(world.scene,world.camera);return world.diagnostics()};
</script>`}));
try{
 await page.goto(new URL('/apollo-dish-acceptance',base).href);await page.waitForFunction(()=>window.ready);
 assert.deepEqual(await page.evaluate(()=>world.assetErrors),[]);
 const continuity=await page.evaluate(()=>{
  const missing=[];
  for(let y=98.1;y<110.6;y+=.2){let hit=false;world.rocket.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.visible||hit||mesh.material.transparent)return;
   const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index;
   for(let i=0;i<(index?.count??p.count);i+=3){const ids=[0,1,2].map(n=>index?index.getX(i+n):i+n),ys=ids.map(n=>p.getY(n));if(Math.min(...ys)<=y&&Math.max(...ys)>=y&&ids.every(n=>Math.hypot(p.getX(n),p.getZ(n))<1.1)){hit=true;break;}}
  });if(!hit)missing.push(y)}
  return{missing,height:world.diagnostics().rocketHeightMeters,colliders:world.diagnostics().colliders};
 });
 assert.deepEqual(continuity.missing,[],'Escape assembly reaches the capsule without a floating gap.');assert.equal(continuity.height,110.6);assert.equal(continuity.colliders,67);
 for(const[name,position,target]of[['dish',[94,9,269],[83,7,254]],['dish-rear',[72,10,239],[83,7,254]],['dish-drive',[88,6,261],[83,4.3,254]],['reflector',[88,15,260],[83,8.8,254]]]){metrics[name]=await page.evaluate(({position,target})=>frame(position,target),{position,target});await page.screenshot({path:resolve(out,'after-'+name+'.png')})}
 for(const[name,position,target]of[['exploration',[-35,3.35,141.8],[-35,1.35,136]],['communications',[87,3.2,256],[83,1.4,250]]]){
  await page.evaluate(()=>{world.playerRoot.visible=true;world.setSuspended(false);world.update(1/60)});
  metrics[name]=await page.evaluate(({position,target})=>{world.camera.position.set(...position);world.camera.lookAt(...target);world.renderer.render(world.scene,world.camera);return world.diagnostics()},{position,target});await page.screenshot({path:resolve(out,'play-'+name+'.png')});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{world.setQuality('medium');world.setSuspended(true)});
 for(const[name,position,target]of[['dish',[106,14,283],[83,7,254]],['dish-rear',[60,16,225],[83,7,254]]]){metrics['mobile-'+name]=await page.evaluate(({position,target})=>frame(position,target),{position,target});await page.screenshot({path:resolve(out,'mobile-'+name+'.png')})}
 const dish=await page.evaluate(()=>{const root=world.scene.getObjectByName('ground-tracking-parabolic-antenna');const bounds=new THREE.Box3().setFromObject(root);return{bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},collider:world.colliders.find(c=>c.x===83&&c.z===254),data:root.userData,batches:root.children.length,triangles:root.children.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0)}});assert.deepEqual(dish.collider,{x:83,z:254,w:3.8,d:3.8});assert.ok(dish.bounds.min[0]>=79.2&&dish.bounds.max[0]<=86.8);assert.ok(dish.bounds.min[2]>=250.2&&dish.bounds.max[2]<=257.8);assert.equal(dish.batches,4);assert.ok(dish.triangles<12000);assert.deepEqual(errors,[]);await writeFile(resolve(out,'machinery-report.json'),JSON.stringify({dish,continuity,metrics,errors},null,2));console.log('PASS: antenna front/back/drive/reflector, two narrow views, two play views, unchanged bounds/collisions, no errors.');
}catch(e){await page.screenshot({path:resolve(out,'machinery-failure.png')});throw e}finally{await browser.close()}
