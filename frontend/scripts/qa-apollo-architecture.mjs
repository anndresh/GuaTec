/** Local-only views of architecture, navigation clearance and resource bounds. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use local Vite.');
const out=resolve('artifacts/architecture-pass');await mkdir(out,{recursive:true});
const prefix=process.env.APOLLO_ARCH_PREFIX||'after';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],metrics={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.route('**/architecture-acceptance',r=>r.fulfill({contentType:'text/html',body:`<style>html,body,#world{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="world"></div><script type="module">
import {ApolloWorld} from '/src/apollo/ApolloWorld.ts';import {SITE_BUILDINGS} from '/src/apollo/ApolloSiteLayout.ts';window.buildings=SITE_BUILDINGS;window.world=new ApolloWorld(document.querySelector('#world'),{onInteract(){},onMap(){}});await world.ready;world.setSuspended(true);world.update(0);window.ready=true;
window.frame=(position,target,player=false)=>{world.playerRoot.visible=player;world.camera.position.set(...position);world.camera.lookAt(...target);world.camera.fov=50;world.camera.updateProjectionMatrix();world.renderer.render(world.scene,world.camera);return world.diagnostics()};</script>`}));
try{
 await page.goto(new URL('/architecture-acceptance',base).href);await page.waitForFunction(()=>window.ready);assert.deepEqual(await page.evaluate(()=>world.assetErrors),[]);
 const buildings=await page.evaluate(()=>window.buildings);
 for(const[i,b]of buildings.entries()){
  const position=[b.x+29,10,b.z+33],target=[b.x,b.height*.5,b.z];metrics['building-'+i]=await page.evaluate(({position,target})=>frame(position,target),{position,target});await page.screenshot({path:resolve(out,`${prefix}-building-${i}.png`)});
 }
 for(const[name,position,target,player]of[['vab',[-740,100,130],[-1000,78,-100],false],['vab-roof',[-865,290,50],[-1000,120,-100],false],['arrival',[-35,3.35,141.8],[-35,1.35,136],true],['engineering',[-90,3.2,230],[-121,3,200],false]]){metrics[name]=await page.evaluate(({position,target,player})=>frame(position,target,player),{position,target,player});await page.screenshot({path:resolve(out,`${prefix}-${name}.png`)})}
 const clearance=await page.evaluate(()=>window.buildings.map(b=>({centerBlocked:!world.canMove(b.x,b.z),frontClear:world.canMove(b.x,b.z+b.depth/2+1.5),sideClear:world.canMove(b.x+b.width/2+1.5,b.z)})));
 assert.ok(clearance.every(c=>c.centerBlocked&&c.frontClear&&c.sideClear));
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>world.setQuality('medium'));
 for(const[name,position,target]of[['vab',[-500,128,350],[-1000,78,-100]],['building-1',[170,12,309],[116,3,250]]]){metrics['mobile-'+name]=await page.evaluate(({position,target})=>frame(position,target),{position,target});await page.screenshot({path:resolve(out,`${prefix}-mobile-${name}.png`)})}
 const lod=await page.evaluate(()=>{const node=world.scene.getObjectByName('vehicle-assembly-building');if(!node)return null;return[1000,2500,2200,2000].map(distance=>{world.camera.position.set(-1000,0,-100+distance);world.camera.lookAt(-1000,80,-100);world.renderer.render(world.scene,world.camera);return node.getCurrentLevel()})});
 if(prefix!=='before')assert.deepEqual(lod,[0,1,1,0],'Distant LOD uses hysteresis and returns to detailed architecture.');
 assert.deepEqual(errors,[]);await writeFile(resolve(out,`${prefix}-report.json`),JSON.stringify({metrics,clearance,lod,errors},null,2));console.log('PASS architecture: 10 views, four closed-building footprints and clear approaches, LOD hysteresis and no page/console errors.');
}catch(e){await page.screenshot({path:resolve(out,`${prefix}-failure.png`)});throw e}finally{await browser.close()}
