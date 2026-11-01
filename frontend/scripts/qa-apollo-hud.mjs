/** Real guest flow plus responsive operations HUD checks. Browser-only instance
 * capture permits a longest-dialogue fixture; mission progress is never injected. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5173');
if(!['localhost','127.0.0.1','[::1]'].includes(base.hostname))throw Error('Use a local frontend with its local API.');
const out=resolve(process.env.APOLLO_HUD_OUTPUT||'artifacts/visual-polish');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[],captures=[];
page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>{localStorage.setItem('mm.language','es');localStorage.setItem('guatec.apollo11.voice','off')});
async function capture(name){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.waitForTimeout(100);await page.screenshot({path:resolve(out,'hud-'+name+'.png')});captures.push(name)}
async function layout(){return page.evaluate(()=>{
 const box=selector=>{const e=document.querySelector(selector);if(!e||!e.getClientRects().length||getComputedStyle(e).visibility==='hidden')return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}};
 const intersects=(a,b)=>a&&b&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const map=box('.ap-minimap'),stick=box('.ap-mobile-stick'),radio=box('.ap-radio'),prompt=box('.ap-interact'),actions=box('.ap-mobile-actions'),objective=box('.ap-objective');
 const p=document.querySelector('.ap-radio p'),pr=p?.getBoundingClientRect(),rr=document.querySelector('.ap-radio')?.getBoundingClientRect();
 return{width:innerWidth,height:innerHeight,map,stick,radio,prompt,actions,objective,overlap:{mapStick:!!intersects(map,stick),mapRadio:!!intersects(map,radio),promptMap:!!intersects(prompt,map),promptActions:!!intersects(prompt,actions),radioActions:!!intersects(radio,actions),radioObjective:!!intersects(radio,objective),objectiveActions:!!intersects(objective,actions)},overflow:document.documentElement.scrollWidth>innerWidth,textFits:!!pr&&!!rr&&pr.bottom<=rr.bottom+1&&pr.right<=rr.right+1};
})}
try{
 await page.goto(base.href);await page.getByRole('button',{name:'Comenzar',exact:true}).click();await page.locator('.provider-guest').click();
 await page.locator('.username-screen input').fill('HudQA'+Math.floor(Math.random()*1e8));await page.getByRole('button',{name:'Confirmar',exact:true}).click();await page.locator('.mission-card').first().waitFor();
 const entry=await page.locator('script[type="module"][src]').first().getAttribute('src'),source=await(await page.request.get(new URL(entry,base).href)).text(),chunk=source.match(/ApolloScreen-[\w-]+\.js/)?.[0];
 const devAppSource=chunk?'':await(await page.request.get(new URL('/src/core/GameApp.ts',base).href)).text();
 const screenPath=chunk?'/assets/'+chunk:devAppSource.match(/import\("([^"]*ApolloScreen[^"]*)"\)/)?.[1];assert.ok(screenPath,'Locate the exact mission module, including Vite HMR identity.');
 await page.evaluate(async url=>{const m=await import(url),mount=m.ApolloScreen.prototype.mount;m.ApolloScreen.prototype.mount=function(...args){window.hudQa=this;return mount.apply(this,args)}},new URL(screenPath,base).href);
 await page.getByText('Misión 01: Apollo 11',{exact:true}).click();await page.getByRole('button',{name:'Comenzar operaciones',exact:true}).click();await page.getByRole('button',{name:'Omitir introducción'}).click();await page.locator('.ap-radio-visible').waitFor();
 assert.equal(await page.locator('.ap-operation-meter i').count(),15);assert.equal(await page.locator('.ap-operation-meter').getAttribute('aria-valuenow'),'0');
 await page.getByRole('button',{name:'Mapa · M',exact:true}).click();await page.getByRole('button',{name:'Volver a operaciones',exact:true}).click();
 await page.getByRole('button',{name:'Pausa',exact:true}).click();await page.getByRole('button',{name:'Continuar',exact:false}).click();
 await page.getByRole('button',{name:'Radio · R',exact:true}).click();checks.push('Desktop deck opens map and pause and repeats the active instruction.');
 // Existing, real mission dialogue with the longest subtitle in the source. This
 // exercises text fit without writing any progress, account or story fixture.
 const missionSource=await readFile(new URL('../src/apollo/ApolloState.ts',import.meta.url),'utf8');
 const radioText=[...missionSource.matchAll(/text:\s*'([^']+)'/g)].map(match=>match[1]).sort((a,b)=>b.length-a.length)[0];
 assert.ok(radioText?.length>150,'Use a real mission dialogue with a long subtitle.');
 for(const [width,height]of [[1440,900],[768,1024],[390,844],[844,390]]){
   await page.setViewportSize({width,height});
   await page.evaluate(text=>{hudQa.dialogue.clear();hudQa.dialogue.say('Daniel Carter · supervisor ficticio',text,120)},radioText);
   await page.waitForTimeout(500);
   const summary=page.locator('.ap-objective-details summary');
   if(!await page.locator('.ap-objective-details').evaluate(el=>el.open))await summary.click();
   const expanded=await layout();assert.ok(Object.values(expanded.overlap).every(value=>!value),'Expanded HUD clusters must remain separated: '+JSON.stringify(expanded));
   await capture(`${width}x${height}-expanded`);
   await summary.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.ap-objective-details').evaluate(el=>el.open),false);
   const result=await layout();checks.push(result);assert.equal(result.overflow,false,'No page overflow.');assert.equal(result.textFits,true,'The longest subtitle is contained.');
   assert.ok(Object.values(result.overlap).every(value=>!value),'HUD clusters must remain separated: '+JSON.stringify(result));
   await capture(`${width}x${height}`);
   await page.locator('.ap-minimap').click();assert.equal(await page.locator('.ap-large-map').isVisible(),true);await capture(`${width}x${height}-map`);await page.getByRole('button',{name:'Volver a operaciones',exact:true}).click();
   await page.keyboard.press('Escape');await page.getByRole('button',{name:'Continuar',exact:false}).waitFor();await capture(`${width}x${height}-pause`);await page.getByRole('button',{name:'Continuar',exact:false}).click();
 }
 await page.setViewportSize({width:1440,height:900});
 for(const [lang,map,radio,pause,jump,sprint]of [['en','Map · M','Radio · R','Pause','Jump','Run'],['fr','Carte · M','Radio · R','Pause','Sauter','Courir'],['es','Mapa · M','Radio · R','Pausa','Saltar','Correr']]){
   await page.keyboard.press('Escape');await page.locator('.ap-language-host>button').click();await page.getByRole('button',{name:lang.toUpperCase(),exact:true}).click();
   await page.locator('.ap-pause-control--primary').click();assert.equal(await page.getByRole('button',{name:map,exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:radio,exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:pause,exact:true}).count(),1);assert.equal(await page.locator('[data-mobile-copy="Saltar"]').innerText(),jump);assert.equal(await page.locator('[data-mobile-copy="Correr"]').innerText(),sprint);checks.push(lang+': desktop actions refreshed without duplicate accessible names.');const localized=await layout();assert.equal(localized.textFits,true);await capture(lang);await page.setViewportSize({width:390,height:844});assert.equal(await page.getByRole('button',{name:jump,exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:sprint,exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:pause,exact:true}).count(),1);await capture(lang+'-mobile');await page.setViewportSize({width:1440,height:900});
 }
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'hud-report.json'),JSON.stringify({checks,captures,errors,longestDialogueCharacters:radioText.length},null,2));console.log('PASS: real guest, deck actions, map/pause, operation meter, keyboard collapse, 4 viewports, longest subtitle and ES/EN/FR.');
}catch(error){await capture('failure');await writeFile(resolve(out,'hud-failure.json'),JSON.stringify({error:String(error),checks,errors,body:await page.locator('body').innerText()},null,2));throw error}finally{await browser.close()}
