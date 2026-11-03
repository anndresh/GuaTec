/** Regression: switching shadow tiers must render actual opaque world pixels. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5196');assert.ok(['localhost','127.0.0.1'].includes(base.hostname));
const baseline=process.env.APOLLO_QUALITY_BASELINE==='1',out=resolve('artifacts/quality-switch',baseline?'before':'after');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined}),page=await browser.newPage({viewport:{width:960,height:600}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('WebSocket'))errors.push(m.text())});
await page.route('**/quality-switch',r=>r.fulfill({contentType:'text/html',body:`<style>html,body,#world{margin:0;width:100%;height:100%;overflow:hidden}</style><div id="world"></div><script type="module">
import{ApolloWorld}from'${baseline?'/.qa-before-src':'/src'}/apollo/ApolloWorld.ts';window.world=new ApolloWorld(document.querySelector('#world'),{onInteract(){},onMap(){}});await world.ready;world.setSuspended(true);world.playerRoot.visible=false;world.update(0);window.ready=true;
</script>`}));
try{
 await page.goto(new URL('/quality-switch',base).href);await page.waitForFunction(()=>window.ready,undefined,{timeout:60000});
 for(const[step,quality]of ['high','low','medium','low','high','low'].entries()){
  const result=await page.evaluate(async quality=>{world.setQuality(quality);world.camera.position.set(-79.4,3.4,223.2);world.camera.lookAt(-84,1.45,217.8);world.camera.fov=46;world.camera.updateProjectionMatrix();for(let i=0;i<3;i++){await new Promise(requestAnimationFrame);world.renderer.render(world.scene,world.camera)}const gl=world.renderer.getContext(),w=world.renderer.domElement.width,h=world.renderer.domElement.height,pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let real=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-157)+Math.abs(pixels[i+1]-204)+Math.abs(pixels[i+2]-231)>35)real++;return{quality,nonSkyShare:real/(w*h),colliders:world.diagnostics().colliders,assetErrors:world.assetErrors}},quality);
  checks.push(result);await page.screenshot({path:resolve(out,step+'-'+quality+'.png')});assert.ok(result.nonSkyShare>.45,quality+' must show opaque scene pixels');assert.equal(result.colliders,67);assert.deepEqual(result.assetErrors,[]);
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));console.log('PASS six high/low/medium switches preserve opaque world, loaded assets and collisions.');
}catch(e){await writeFile(resolve(out,'failure.json'),JSON.stringify({checks,errors,message:String(e)},null,2));throw e}finally{await page.evaluate(()=>window.world?.dispose()).catch(()=>{});await browser.close()}
