/** Joint/event/lifecycle acceptance in the real world; no mission progress injected. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5199');assert.ok(['localhost','127.0.0.1'].includes(base.hostname));
const out=resolve('artifacts/station-controls');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined}),page=await browser.newPage({viewport:{width:1440,height:900},recordVideo:{dir:resolve(out,'motion'),size:{width:960,height:600}}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('WebSocket'))errors.push(m.text())});
await page.route('**/stand-control-acceptance',r=>r.fulfill({contentType:'text/html',body:`<style>html,body,#world{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="world"></div><script type="module">
import{ApolloWorld}from'/src/apollo/ApolloWorld.ts';window.world=new ApolloWorld(document.querySelector('#world'),{onInteract(){},onMap(){}});await world.ready;world.setSuspended(true);world.update(0);world.playerRoot.visible=false;
window.pose=()=>world.standControlParts.map(p=>({id:p.standId,channel:p.channel,angle:p.node.rotation[p.axis],position:p.node.position.toArray(),attached:p.node.parent===world.scene,meshes:p.node.children.length}));
window.frame=(id)=>{const b={power:[-49,135],telemetry:[-84,218],weather:[-36,379]}[id];world.camera.position.set(b[0]+4.1,id==='weather'?3.8:3.1,b[1]+5);world.camera.lookAt(b[0],id==='weather'?2:1.7,b[1]-.2);world.camera.fov=42;world.camera.updateProjectionMatrix();world.renderer.render(world.scene,world.camera);return world.diagnostics()};window.ready=true;</script>`}));
try{
 await page.goto(new URL('/stand-control-acceptance',base).href);await page.waitForFunction(()=>window.ready,undefined,{timeout:60000});
 const initial=await page.evaluate(()=>pose());assert.equal(initial.length,7);assert.ok(initial.every(p=>p.attached&&p.meshes===2&&p.position.every(Number.isFinite)));
 for(const id of ['power','telemetry','weather']){await page.evaluate(id=>frame(id),id);await page.screenshot({path:resolve(out,id+'-default.png')});}
 const draft={'power-bus':{version:1,kind:'sequence',slots:[1,3,0,2]},'telemetry-rack':{version:1,kind:'telemetry',controls:[0,100,50]},'weather-window':{version:1,kind:'weather',controls:[90,0]}};
 await page.evaluate(draft=>world.setStandDrafts(draft),draft);const edited=await page.evaluate(()=>pose());
 assert.equal(edited.find(p=>p.channel==='power-lever').angle,.65,'A fitted draft alone cannot energize the bank.');
 assert.equal(edited.find(p=>p.channel==='weather-heading').angle,-Math.PI/2);assert.equal(edited.find(p=>p.channel==='weather-cloud').angle,1.15);
 assert.ok(edited.filter(p=>p.channel.startsWith('telemetry')).every((p,i)=>p.angle!==initial.filter(p=>p.channel.startsWith('telemetry'))[i].angle));
 await page.evaluate(()=>{world.update(1/30);world.update(1/120)});assert.deepEqual(await page.evaluate(()=>pose()),edited,'Clock ticks and pause cannot drift event-driven controls.');
 for(const id of ['telemetry','weather']){await page.evaluate(id=>frame(id),id);await page.screenshot({path:resolve(out,id+'-edited.png')});}
 await page.waitForTimeout(350);await page.evaluate(draft=>{world.setStandDrafts({});world.setStandDrafts(JSON.parse(JSON.stringify(draft)))},draft);assert.deepEqual(await page.evaluate(()=>pose()),edited,'Restored drafts recover exact world-space pivots and angles.');
 await page.evaluate(()=>{world.setBonusStatus(['power-bus','telemetry-rack','weather-window']);world.setStandDrafts({})});const completed=await page.evaluate(()=>pose());assert.equal(completed.find(p=>p.channel==='power-lever').angle,0);assert.equal(completed.find(p=>p.channel==='power-meter').angle,0);
 assert.equal(completed.find(p=>p.channel==='weather-heading').angle,-225*Math.PI/180);
 const metrics={};for(const id of ['power','telemetry','weather']){metrics[id]=await page.evaluate(id=>frame(id),id);await page.screenshot({path:resolve(out,id+'-completed.png')});}
 await page.evaluate(()=>{world.setBonusStatus([]);world.setStandDrafts({})});assert.deepEqual(await page.evaluate(()=>pose()),initial,'Restart clears reference poses and restored drafts.');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{world.resize();frame('weather')});await page.screenshot({path:resolve(out,'weather-narrow.png')});
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>window.ready,undefined,{timeout:60000});
 await page.evaluate(d=>world.setStandDrafts(d),draft);assert.deepEqual(await page.evaluate(()=>pose()),edited,'Reduced motion preserves functional input poses.');
 const lifecycle=await page.evaluate(()=>{const geoms=new Set();for(const p of world.standControlParts)p.node.traverse(n=>{if(n.isMesh)geoms.add(n.geometry)});let disposed=0;for(const g of geoms)g.addEventListener('dispose',()=>disposed++);const d={colliders:world.diagnostics().colliders,assetErrors:[...world.assetErrors],geometries:geoms.size};world.dispose();return{...d,disposed,canvasRemaining:!!document.querySelector('canvas')}});
 assert.equal(lifecycle.colliders,67);assert.deepEqual(lifecycle.assetErrors,[]);assert.equal(lifecycle.disposed,lifecycle.geometries);assert.equal(lifecycle.canvasRemaining,false);assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({initial,edited,completed,metrics,lifecycle,errors},null,2));console.log('PASS seven live station joints: drafts, completion, exact restore/reset, suspended/reduced motion, 67 proxies and resource disposal.');
}finally{await page.context().close();await browser.close()}
