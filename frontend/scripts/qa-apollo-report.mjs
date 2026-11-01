import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_QA_URL||'http://127.0.0.1:5173');if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw Error('Use a local Vite server.');
const out=resolve('artifacts/apollo-report');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],checks=[];let mode='apollo',sampleRequests=0,writeRequests=0;
page.on('pageerror',e=>errors.push(e.message));
const report={ticksSurvived:240,decisionsMade:26,samplesCollected:0,finalResources:{fuel:100,pressure:100,stability:100,telemetry:100},outcome:'success',summary:'Apollo 11: quince operaciones de apoyo terrestre completadas; traslado y lanzamiento observados desde el área segura.'};
const state={version:'apollo11-v1',checkpoint:7,done:true,elapsed:240,checks:[],dialogues:[],completed:['orientation','complex','documentation','communications','crew','observation','launch','epilogue'],bonusCompleted:['power-bus','flight-record','telemetry-rack','umbilical-check','crew-manifest','weather-window','pad-safety']};
await page.route('**/api/progress/**',r=>{if(r.request().method()!=='GET')writeRequests++;return r.fulfill({json:{state:mode==='apollo'?{apollo11:state}:{},report}})});
await page.route('**/api/samples',r=>{sampleRequests++;return r.fulfill({json:{samples:[]}})});
await page.route('**/apollo-report-acceptance',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`
 <meta charset="utf-8"><link rel="stylesheet" href="/src/style.css"><style>body{background:#10262d}</style><div id="app"><div id="ui-root"></div></div>
 <script type="module">import {ReportScreen} from '/src/screens/ReportScreen.ts';import {ApolloScreen} from '/src/apollo/ApolloScreen.ts';import {setLanguage,getLanguage} from '/src/core/language.ts';let active;const app={currentUser:{id:'report-entry-fixture'},showMissionSelect(){window.back=true},showMission1(){window.replay=true},async showReport(slug){window.reportOpened=slug;await window.start(getLanguage())}};window.start=async language=>{setLanguage(language);active?.unmount();const host=document.querySelector('#ui-root');host.replaceChildren();active=new ReportScreen(app,'mission-1-arrival');await active.mount(host)};window.openCompletedMission=async language=>{setLanguage(language);active?.unmount();const host=document.querySelector('#ui-root');host.replaceChildren();window.reportOpened=null;active=new ApolloScreen(app);await active.mount(host)};window.ready=true;</script>`}));
try{
 await page.goto(new URL('/apollo-report-acceptance',base).href);await page.waitForFunction(()=>window.ready);
 for(const language of['es','en','fr']){
   sampleRequests=0;await page.evaluate(language=>window.start(language),language);
   await page.locator('.screen-title').waitFor();assert.ok((await page.locator('.screen-title').boundingBox()).y>=0,'The report title stays reachable at the top of the real fixed-height app shell.');
   assert.equal(await page.locator('.ap-report-operation').count(),15);assert.equal(await page.locator('.ap-report-operation[data-completed=true]').count(),15);
   assert.equal(await page.locator('.report-resource-list').count(),0);assert.equal(sampleRequests,0);assert.ok(!(await page.locator('body').innerText()).includes('1926'));
   assert.ok((await page.locator('.ap-report-completion').innerText()).includes('15'));
   await page.screenshot({path:resolve(out,language+'-desktop.png')});checks.push(language+': fifteen ordered operations, coherent historical reference and no invented fuel/sample metrics.');
 }
 for(const[language,label]of[['es','Ver informe de misión'],['en','View mission report'],['fr','Voir le rapport de mission']]){
  await page.evaluate(language=>window.openCompletedMission(language),language);
  await page.getByRole('button',{name:label,exact:true}).waitFor({timeout:3000});await page.screenshot({path:resolve(out,language+'-completed-entry.png')});await page.getByRole('button',{name:label,exact:true}).click();
  await page.locator('.ap-report').waitFor();assert.equal(await page.evaluate(()=>window.reportOpened),'mission-1-arrival');assert.equal(await page.locator('.ap-report-operation[data-completed=true]').count(),15);
 }assert.equal(writeRequests,0,'Viewing a completed mission report must not rewrite progress or complete the mission again.');checks.push('Completed missions expose their report in ES/EN/FR and open all fifteen records without changing progress.');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.start('fr'));assert.equal(await page.locator('.ap-report').evaluate(el=>el.scrollWidth>el.clientWidth),false);await page.screenshot({path:resolve(out,'fr-mobile.png')});
 await page.locator('.report-replay-button').scrollIntoViewIfNeeded();assert.ok((await page.locator('.report-replay-button').boundingBox()).y<844,'The report footer remains reachable by scrolling.');
 await page.locator('.ap-report-operation').last().scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,'fr-mobile-bottom.png')});
 await page.setViewportSize({width:844,height:390});await page.evaluate(()=>window.start('en'));await page.locator('.screen-title').scrollIntoViewIfNeeded();assert.ok((await page.locator('.screen-title').boundingBox()).y>=0);await page.locator('.report-replay-button').scrollIntoViewIfNeeded();assert.ok((await page.locator('.report-replay-button').boundingBox()).y<390);await page.screenshot({path:resolve(out,'en-landscape-footer.png')});await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.start('fr'));checks.push('Real app shell keeps long-report headings and footers reachable on desktop, portrait and landscape.');
 await page.getByRole('button',{name:'Retour aux missions',exact:true}).click();assert.equal(await page.evaluate(()=>window.back),true);
 mode='legacy';sampleRequests=0;await page.evaluate(()=>window.start('es'));assert.equal(await page.locator('.ap-report').count(),0);assert.ok((await page.locator('body').innerText()).includes('1926'));assert.equal(sampleRequests,1);checks.push('Legacy reports keep their original engineering layout.');
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'report.json'),JSON.stringify({checks,errors},null,2));console.log('PASS: Apollo reports in ES/EN/FR, mobile scrolling and legacy report preservation.');
}catch(error){await page.screenshot({path:resolve(out,'failure.png')});throw error}finally{await browser.close()}
