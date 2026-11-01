/** Local-only authored-model views and physical footprint regression checks. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url), {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5173');
if(!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use local Vite.');
const phase=process.env.APOLLO_DETAIL_PHASE||'after',out=resolve('artifacts/stand-detail-pass',phase);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('WebSocket'))errors.push(m.text())});
await page.route('**/stand-details-acceptance',r=>r.fulfill({contentType:'text/html',body:`
<style>html,body,#world{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="world"></div><script type="module">
import {ApolloWorld} from '/src/apollo/ApolloWorld.ts';import {SITE_PLOTS} from '/src/apollo/ApolloSiteLayout.ts';import {standCollisionProxies} from '/src/apollo/ApolloStandModels.ts';
window.plots=SITE_PLOTS;window.proxies=standCollisionProxies;window.world=new ApolloWorld(document.querySelector('#world'),{onInteract(){},onMap(){}});await world.ready;world.setSuspended(true);world.update(0);world.playerRoot.visible=false;
window.frame=(kind,rear=false)=>{const {x,z}=plots.find(p=>p.kind===kind).target;world.camera.position.set(x+(rear?-4.8:4.6),3.4,z+(rear?-5.4:5.2));world.camera.lookAt(x,1.45,z-.2);world.camera.fov=46;world.camera.updateProjectionMatrix();world.renderer.render(world.scene,world.camera);return world.diagnostics()};window.ready=true;</script>`}));
try{
 await page.goto(new URL('/stand-details-acceptance',base).href);await page.waitForFunction(()=>window.ready,undefined,{timeout:60000});
 const metrics={};
 for(const kind of ['sequence','telemetry','cables','flight-plan','weather','radio','records','tracking']){
  metrics[kind]=await page.evaluate(kind=>frame(kind),kind);await page.screenshot({path:resolve(out,kind+'.png')});
 }
 metrics['rear-telemetry']=await page.evaluate(()=>frame('telemetry',true));await page.screenshot({path:resolve(out,'rear-telemetry.png')});
 const clearance=await page.evaluate(()=>plots.map(p=>({kind:p.kind,front:world.canMove(p.target.x,p.target.z+2.7),center:world.canMove(p.target.x,p.target.z)})));
 assert.ok(clearance.every(p=>p.front&&!p.center),'Work desks block passage and front approaches remain open.');
 const physics=await page.evaluate(()=>{
  const checks=[];window.world.setSuspended(false);world.yaw=0;
  for(const kind of ['survey','tracking','cables','weather']){
   const p=plots.find(p=>p.kind===kind),c=proxies(kind,p.target.x,p.target.z);
   const target=kind==='survey'||kind==='tracking'?c.find(c=>Math.abs(c.x-(p.target.x-2.13))<.01):c[0];
   world.onBlur();world.player.set(target.x,0,target.z+target.d+1);world.keys.add('w');world.keys.add('shift');
   for(let i=0;i<15;i++)world.update(.1);
   checks.push({kind,blocked:world.player.z>=target.z+target.d+.39,position:world.player.toArray()});
  }
  world.onBlur();world.setSuspended(true);return checks;
 });
 assert.ok(physics.every(p=>p.blocked),'Running at 10 m/s and 10 Hz cannot pass through the equipment.');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>world.setQuality('medium'));
 metrics.narrow=await page.evaluate(()=>{const p=plots.find(p=>p.kind==='telemetry').target;world.camera.position.set(p.x+7,5,p.z+11);world.camera.lookAt(p.x,1.4,p.z);world.renderer.render(world.scene,world.camera);return world.diagnostics()});await page.screenshot({path:resolve(out,'narrow.png')});
 assert.deepEqual(await page.evaluate(()=>world.assetErrors),[]);assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({metrics,clearance,physics,errors},null,2));
 console.log('PASS: eight station views, rear view, narrow viewport, 13 clear approaches and four high-speed collision checks.');
}finally{await browser.close()}
