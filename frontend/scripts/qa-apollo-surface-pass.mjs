/** Actual world baseline/finish captures, GPU evidence and resource lifecycle. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5196');
assert.ok(['localhost','127.0.0.1'].includes(base.hostname));
const phase=process.env.APOLLO_SURFACE_PHASE||'after',out=resolve('artifacts/surface-pass',phase);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
const conservative=process.env.APOLLO_CONSERVATIVE_RENDERER==='1';
const page=await browser.newPage({viewport:{width:1440,height:900},...(conservative?{userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'}:{})}),errors=[],metrics={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('WebSocket'))errors.push(m.text())});
await page.route('**/surface-acceptance',r=>r.fulfill({contentType:'text/html',body:`
<style>html,body,#world{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="world"></div><script type="module">
import {ApolloWorld} from '${phase==='before'?'/.qa-before-src':'/src'}/apollo/ApolloWorld.ts';
window.world=new ApolloWorld(document.querySelector('#world'),{onInteract(){},onMap(){}});await world.ready;world.setSuspended(true);world.update(0);
window.frame=(position,target,fov=48)=>{world.playerRoot.visible=false;world.camera.position.set(...position);world.camera.lookAt(...target);world.camera.fov=fov;world.camera.updateProjectionMatrix();world.renderer.render(world.scene,world.camera);return world.diagnostics()};
window.ready=true;</script>`}));
try{
 await page.goto(new URL('/surface-acceptance',base).href);await page.waitForFunction(()=>window.ready,undefined,{timeout:60000});
 const views=[['arrival',[-29,3.3,142],[-38,1.5,130],62],['telemetry',[-79.4,3.4,223.2],[-84,1.45,217.8],46],['radio',[74.6,3.4,240.2],[70,1.45,234.8],46],['sedan',[-77,2.8,213],[-71,1,218],43],['office',[-96,10,233],[-125,3,200],50],['utility',[145,10,283],[116,2.5,250],50],['workshop',[-89,10,371],[-118,3,338],50],['communications',[149,10,163],[120,2.5,130],50],['coast',[104,3.3,168],[220,1,260],62]];
 for(const[name,position,target,fov]of views){metrics[name]=await page.evaluate(({position,target,fov})=>frame(position,target,fov),{position,target,fov});await page.screenshot({path:resolve(out,name+'.png')});}
 await page.evaluate(()=>{world.van.visible=true;world.van.position.set(-71,0,218);world.van.rotation.y=0});
 metrics.van=await page.evaluate(()=>frame([-77,3,210.5],[-71,1.2,218],43));await page.screenshot({path:resolve(out,'van.png')});
 await page.evaluate(()=>world.van.visible=false);
 const profiles={};
 for(const quality of ['low','high']){
  profiles[quality]=await page.evaluate(async quality=>{world.setQuality(quality);frame([-79.4,3.4,223.2],[-84,1.45,217.8],46);const samples=[];let previous=performance.now();for(let i=0;i<75;i++){await new Promise(requestAnimationFrame);world.renderer.render(world.scene,world.camera);const now=performance.now();if(i>14)samples.push(now-previous);previous=now;}const gl=world.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');world.renderer.render(world.scene,world.camera);const pixels=new Uint8Array(innerWidth*innerHeight*4);gl.readPixels(0,0,innerWidth,innerHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let nonSky=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-157)+Math.abs(pixels[i+1]-204)+Math.abs(pixels[i+2]-231)>35)nonSky++;return{...world.diagnostics(),nonSkyShare:nonSky/(innerWidth*innerHeight),meanFrameMs:samples.reduce((a,b)=>a+b)/samples.length,p95FrameMs:[...samples].sort((a,b)=>a-b)[Math.floor(samples.length*.95)],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}},quality);
  await page.screenshot({path:resolve(out,quality+'-contacts.png')});
  if(phase!=='before')assert.ok(profiles[quality].nonSkyShare>.45,'Quality switch keeps real opaque world visible, not only sky/basic overlays.');
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{world.resize();world.setQuality('medium')});
 metrics.narrow=await page.evaluate(()=>frame([-76,5.1,230],[-84,1.4,218],48));await page.screenshot({path:resolve(out,'narrow.png')});
 const details=await page.evaluate(()=>{
  const contacts=world.scene.getObjectByName('grounded-equipment-contacts'),scrub=world.scene.getObjectByName('coastal-scrub-outside-route');
  const finished=[...world.materials.entries()].filter(([name,m])=>m.customProgramCacheKey().startsWith('apollo-finish-')).map(([name])=>name);
  const target=world.environmentTarget;let released=0;target?.addEventListener('dispose',()=>released++);
  const instances=[];world.scene.traverse(n=>{if(n.isInstancedMesh){let event=0;n.addEventListener('dispose',()=>event++);instances.push(()=>event)}});
  const before={contacts:contacts?.userData.contacts,contactInstances:contacts?.children[0]?.isInstancedMesh,scrubCount:scrub?.count,finished,colliders:world.diagnostics().colliders,assetErrors:[...world.assetErrors]};
  world.dispose();return{...before,environmentDisposals:released,instancesReleased:instances.every(count=>count()===1),canvasRemaining:!!document.querySelector('#world canvas')};
 });
 assert.equal(details.colliders,67);assert.deepEqual(details.assetErrors,[]);assert.equal(details.environmentDisposals,1);assert.equal(details.instancesReleased,true);assert.equal(details.canvasRemaining,false);
 if(phase!=='before'){assert.ok(details.contacts>30);assert.equal(details.contactInstances,true);assert.equal(details.scrubCount,1100);assert.ok(details.finished.includes('stand-painted-enamel'));}
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({phase,conservative,metrics,profiles,details,errors},null,2));
 console.log('PASS '+phase+': 13 world views, low/high frame samples, 67 proxies, shader compilation and exact environment/instance disposal.');
}catch(e){await page.screenshot({path:resolve(out,'failure.png')});throw e}finally{await browser.close()}
