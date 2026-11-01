/** Guest release smoke check. Diagnostics capture is confined to this test browser. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_RELEASE_URL||'http://127.0.0.1:4173');
const out=resolve(process.env.APOLLO_RELEASE_OUTPUT||'artifacts/apollo-motion-release');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||undefined});
const page=await browser.newPage({viewport:{width:1440,height:900},recordVideo:{dir:resolve(out,'motion'),size:{width:960,height:600}}}),errors=[];
page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.addInitScript(()=>{localStorage.setItem('mm.language','es');localStorage.setItem('guatec.apollo11.voice','off')});
// Local preview uses the same real API through an in-browser CORS bridge.
// Production runs exercise the site's normal network path unchanged.
if(['localhost','127.0.0.1'].includes(base.hostname))await page.route('https://guatec-api.onrender.com/api/**',async route=>{
 const headers={'access-control-allow-origin':base.origin,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS'};
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
 const response=await route.fetch({url:new URL(new URL(route.request().url()).pathname,'https://gua-tec.vercel.app').href,headers:{...route.request().headers(),origin:'https://gua-tec.vercel.app',referer:'https://gua-tec.vercel.app/'},timeout:20000});await route.fulfill({response,headers:{...response.headers(),...headers}});
});
try{
 await page.goto(base.href);await page.getByRole('button',{name:'Comenzar',exact:true}).click();await page.locator('.provider-guest').click();await page.locator('.username-screen input').fill('MotionQA'+Math.floor(Math.random()*1e8));await page.getByRole('button',{name:'Confirmar',exact:true}).click();await page.locator('.mission-card').first().waitFor();
 const entry=await page.locator('script[type="module"][src]').first().getAttribute('src'),source=await(await page.request.get(new URL(entry,base).href)).text(),chunk=source.match(/ApolloScreen-[\w-]+\.js/)?.[0];assert.ok(chunk);
 await page.evaluate(async url=>{const m=await import(url),mount=m.ApolloScreen.prototype.mount;m.ApolloScreen.prototype.mount=function(...args){window.q=this;return mount.apply(this,args)}},new URL('/assets/'+chunk,base).href);
 await page.getByText('Misión 01: Apollo 11',{exact:true}).click();await page.getByRole('button',{name:'Comenzar operaciones',exact:true}).click();await page.getByRole('button',{name:'Omitir introducción'}).click();await page.waitForFunction(()=>window.q?.world&&!q.movie&&!q.world.suspended);
 const start=await page.evaluate(()=>q.world.player.toArray());await page.locator('.apollo-world-canvas').focus();await page.keyboard.down('w');await page.waitForTimeout(450);await page.keyboard.up('w');const walked=await page.evaluate(()=>q.world.player.toArray());assert.ok(Math.hypot(walked[0]-start[0],walked[2]-start[2])>1);
 await page.keyboard.down('Space');await page.waitForTimeout(180);await page.keyboard.up('Space');const jump=await page.evaluate(()=>q.world.player.y);assert.ok(jump>.4);await page.keyboard.press('Escape');const paused=await page.evaluate(()=>({position:q.world.player.toArray(),velocity:q.world.diagnostics().motion.verticalVelocity}));await page.waitForTimeout(350);assert.deepEqual(await page.evaluate(()=>({position:q.world.player.toArray(),velocity:q.world.diagnostics().motion.verticalVelocity})),paused);
 await page.screenshot({path:resolve(out,'paused-jump.png')});await page.keyboard.press('Escape');await page.waitForTimeout(900);assert.equal(await page.evaluate(()=>q.world.player.y),0);
 await page.keyboard.press('m');await page.locator('.ap-large-map').first().waitFor();await page.screenshot({path:resolve(out,'operations-map.png')});await page.getByRole('button',{name:'Volver a operaciones',exact:true}).click();
 if(process.env.APOLLO_RELEASE_CINEMA==='1'){
  // Read-only visual fixtures: no progression, completion or save is injected.
  await page.evaluate(()=>{q.world.setSuspended(true);q.world.setCinematic('launch',12);q.world.update(0)});await page.waitForTimeout(80);
  const exhaust=await page.evaluate(()=>({batches:q.world.exhaust.children.length,counts:q.world.exhaust.children.map(m=>m.count),rocket:q.world.diagnostics().rocketHeightMeters,errors:q.world.assetErrors}));assert.equal(exhaust.batches,2);assert.deepEqual(exhaust.counts,[5,5]);assert.equal(exhaust.rocket,110.6);assert.deepEqual(exhaust.errors,[]);await page.screenshot({path:resolve(out,'launch.png')});
  await page.evaluate(()=>{q.world.setCinematic(null,0);q.world.setSuspended(false)});
 }
 const diagnostics=await page.evaluate(()=>q.world.diagnostics());assert.deepEqual(diagnostics.assetErrors,[]);assert.deepEqual(errors,[]);await page.screenshot({path:resolve(out,'exploration.png')});
 await writeFile(resolve(out,'report.json'),JSON.stringify({url:base.href,entry,chunk,start,walked,jump,paused,diagnostics,errors},null,2));console.log('PASS: compiled guest entry, held movement, airborne pause/resume, landing and map; '+chunk);
}catch(e){await page.screenshot({path:resolve(out,'failure.png')});await writeFile(resolve(out,'failure.json'),JSON.stringify({errors,message:String(e)},null,2));throw e}finally{await page.context().close();await browser.close()}
