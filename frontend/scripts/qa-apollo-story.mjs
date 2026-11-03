/** Compiled-build acceptance: guest account, held WASD travel, real instruments,
 * fifteen ordered operations, cloud reentry and reset. No progress is injected.
 * The class instance is captured only inside this test browser; production has no hook. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const base=new URL(process.env.APOLLO_STORY_URL||'http://127.0.0.1:4173');
if(!['127.0.0.1','localhost','[::1]','gua-tec.vercel.app'].includes(base.hostname))throw Error('Use a local compiled preview or the known production game.');
const out=resolve(process.env.APOLLO_STORY_OUTPUT||'artifacts/apollo-story');await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:900},recordVideo:{dir:resolve(out,'motion'),size:{width:960,height:600}}}),errors=[],trace=[],consoleErrors=[],networkErrors=[];
page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});page.on('response',r=>{if(r.status()>=400)networkErrors.push({url:r.url(),status:r.status()})});
await page.addInitScript(()=>{localStorage.setItem('mm.language','es');localStorage.setItem('guatec.apollo11.voice','off')});
const snapshot=()=>page.evaluate(()=>window.q.state.toJSON());
const controlChecks=[];
async function controlAngle(channel,expected,label){
 const actual=await page.evaluate(channel=>{const p=q.world.standControlParts.find(p=>p.channel===channel);if(!p)throw Error('Missing physical control '+channel);return p.node.rotation[p.axis]},channel);
 assert.ok(Math.abs(actual-expected)<1e-9,label+': '+actual+' != '+expected);controlChecks.push(label);
}
const checkpoint=async value=>{await page.waitForFunction(value=>q.state.checkpoint===value,value,{timeout:value===5?45000:20000});};
const capture=async label=>{const state=await snapshot();if(label==='stand-power-bus'){await controlAngle('power-lever',0,'Verified switch engages');await controlAngle('power-meter',0,'Power meter reaches nominal');}trace.push({label,checkpoint:state.checkpoint,completed:state.completed,stands:state.bonusCompleted});console.log(label,state.checkpoint,state.bonusCompleted.length);await page.screenshot({path:resolve(out,label+'.png')});};

async function range(locator,value){
 const box=await locator.boundingBox(),max=Number(await locator.getAttribute('max'));await page.mouse.click(box.x+8+(box.width-16)*value/max,box.y+box.height/2);
 // A fine click can land inside the existing native thumb. Finish with the real
 // keyboard adjustment instead of assigning values or dispatching synthetic input.
 const remaining=value-Number(await locator.inputValue());await locator.focus();
 for(let i=0;i<Math.abs(remaining);i++)await page.keyboard.press(remaining>0?'ArrowRight':'ArrowLeft');
 const label=await locator.getAttribute('aria-label'),index=['S-IVB','Enlace','Plataforma'].indexOf(label);
 if(index>=0)await controlAngle('telemetry-'+index,(130-value*2.6)*Math.PI/180,'Native tuner input channel '+index);
 if(label==='Rumbo de veleta')await controlAngle('weather-heading',-value*Math.PI/180,'Native heading input drives vane');
 if(label==='Obturador de nubosidad')await controlAngle('weather-cloud',(.5-value/100)*2.3,'Native cloud input drives meter');

}
async function drag(item,slot){const a=await item.boundingBox(),b=await slot.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:14});await page.mouse.up();}

async function goTo(target){
  const goal={x:target.x,z:target.z+5};
  // Plan with the world's actual collision query, then walk every segment with input.
  const route=await page.evaluate(goal=>{
    const step=2,minX=-144,minZ=100,width=148,height=153,count=width*height;
    const cell=(x,z)=>Math.round((z-minZ)/step)*width+Math.round((x-minX)/step),point=i=>({x:minX+(i%width)*step,z:minZ+Math.floor(i/width)*step});
    const start=cell(q.world.player.x,q.world.player.z),end=cell(goal.x,goal.z),parents=new Int32Array(count).fill(-1),queue=new Int32Array(count),visited=new Uint8Array(count);
    let head=0,tail=0,found=-1;queue[tail++]=start;visited[start]=1;
    while(head<tail){const i=queue[head++];if(i===end){found=i;break}const p=point(i);
      for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx*step,z=p.z+dz*step,n=cell(x,z);if(x<minX||x>150||z<100||z>404||n<0||n>=count||visited[n]||![.25,.5,.75,1].every(t=>q.world.canMove(p.x+dx*step*t,p.z+dz*step*t)))continue;visited[n]=1;parents[n]=i;queue[tail++]=n;}
    }
    if(found<0)throw Error('No walkable route to '+JSON.stringify(goal));
    const points=[];for(let i=found;i!==start;i=parents[i])points.push(point(i));points.reverse();
    const corners=[];for(let i=0;i<points.length;i++){const prev=points[i-1],next=points[i+1];if(!prev||!next||points[i].x-prev.x!==next.x-points[i].x||points[i].z-prev.z!==next.z-points[i].z)corners.push(points[i]);}
    corners.push(goal);return corners;
  },goal);
  for(const point of route){
    let reached=false;
    for(let attempt=0;attempt<180;attempt++){
      const delta=await page.evaluate(p=>({x:p.x-q.world.player.x,z:p.z-q.world.player.z}),point),distance=Math.hypot(delta.x,delta.z);
      if(distance<.85){reached=true;break}
      await page.evaluate(d=>{q.world.yaw=Math.atan2(-d.x,-d.z)},delta);await page.locator('.apollo-world-canvas').focus();
      await page.keyboard.down('Shift');await page.keyboard.down('w');await page.waitForTimeout(Math.max(45,Math.min(450,(distance-.35)*100)));await page.keyboard.up('w');await page.keyboard.up('Shift');
    }
    assert.ok(reached,'Held movement must reach '+JSON.stringify(point)+'; '+JSON.stringify(await page.evaluate(()=>({player:q.world.player.toArray(),paused:q.paused,suspended:q.world.suspended,hidden:document.hidden}))));
  }
}

async function changeMissionLanguage(language){
 await page.keyboard.press('Escape');await page.getByRole('button',{name:/Idioma|Language|Langue/}).click();await page.getByRole('button',{name:language.toUpperCase(),exact:true}).click();await page.keyboard.press('Escape');
 assert.equal(await page.locator('.ap-objective').getAttribute('aria-label'),{es:'Objetivo actual',en:'Current objective',fr:'Objectif actuel'}[language]);
}
async function openCurrent(){const target=await page.evaluate(()=>q.state.current.target);await goTo(target);await page.locator('.ap-interact').click();}
async function stand(kind){
  const pending=await page.evaluate(()=>q.state.requiredStand);assert.equal(pending?.kind,kind,'Chronology chooses the expected operation.');
  await goTo(pending.target);await page.locator('.ap-interact').click();await page.locator('.ap-stand--'+kind).waitFor();
  const purpose=page.locator('.ap-stand-purpose');await purpose.locator('summary').click();assert.ok((await purpose.locator('p').innerText()).length>20);await purpose.locator('summary').click();
  const assign=async order=>{for(let i=0;i<order.length;i++)await drag(page.locator('[data-item="'+order[i]+'"]'),page.locator('[data-slot="'+i+'"]'))};
  if(kind==='sequence'){await assign([1,3,0,2]);await controlAngle('power-lever',.65,'Fitted drafts cannot energize bank');await page.getByRole('slider',{name:'Palanca de alimentación'}).focus();await page.keyboard.press('End');}
  if(kind==='flight-plan'){await assign([1,3,0,2]);await page.getByRole('button',{name:'Sellar plan de vuelo'}).click();}
  if(kind==='telemetry'){
   await range(page.locator('.ap-stand input').nth(0),19);
   await page.getByRole('button',{name:'Volver al recorrido',exact:true}).click();await page.locator('.ap-stand--telemetry').waitFor({state:'detached'});await page.locator('.ap-interact').click();await page.locator('.ap-stand--telemetry').waitFor();
   assert.equal(await page.locator('.ap-stand input').nth(0).inputValue(),'19');await controlAngle('telemetry-0',(130-19*2.6)*Math.PI/180,'Close/reopen restores partial draft');
   assert.ok(!(await snapshot()).bonusCompleted.includes(pending.id));
   for(const [i,value]of[62,74,58].entries())await range(page.locator('.ap-stand input').nth(i),value);await page.getByRole('button',{name:'Fijar enlace'}).click();}
  if(kind==='cables'){await assign([2,0,3,1]);await page.getByRole('button',{name:'Probar continuidad'}).click();}
  if(kind==='crew-manifest'){for(let i=0;i<3;i++){await page.locator('.ap-imprinter-roller').focus();await page.keyboard.down('Space');await page.waitForTimeout(1000);await page.keyboard.up('Space');}}
  if(kind==='weather'){
   for(const[language,bearing]of[['en','225° / SW'],['fr','225° / SO'],['es','225° / SO']]){
    await page.keyboard.press('Escape');await changeMissionLanguage(language);await page.locator('.ap-interact').click();assert.equal(await page.locator('.ap-wind-reference').innerText(),bearing);
   }
   await range(page.getByRole('slider',{name:'Rumbo de veleta'}),225);await range(page.getByRole('slider',{name:'Obturador de nubosidad'}),35);await page.getByRole('button',{name:'Sellar parte de observación'}).click();}
  if(kind==='beacons'){const r=await page.locator('.ap-perimeter canvas').boundingBox();for(const[x,y]of[[.22,.3],[.73,.65],[.48,.24]]){await page.mouse.move(r.x+r.width*x,r.y+r.height*y,{steps:8});await page.waitForTimeout(1450)}}
  await page.waitForFunction(id=>q.state.bonusCompleted.includes(id),pending.id);await capture('stand-'+pending.id);
}

async function optics(targets){
  await page.locator('.ap-instrument').waitFor();
  for(const values of targets){for(const[i,value]of values.entries())await range(page.locator('.ap-inst-control input').nth(i),value);await page.locator('.ap-inst-action').click();}
}

try{
 assert.equal((await page.request.get(new URL('/api/health',base).href,{timeout:60000})).status(),200);
 await page.goto(base.href);await page.getByRole('button',{name:'Comenzar',exact:true}).click();await page.locator('.provider-guest').click();
 await page.locator('.username-screen input').waitFor();await page.locator('.username-screen input').fill('StoryQA'+Math.floor(Math.random()*1e8));await page.getByRole('button',{name:'Confirmar',exact:true}).click();await page.locator('.mission-card').first().waitFor();
 const entry=await page.locator('script[type="module"][src]').first().getAttribute('src'),source=await(await page.request.get(new URL(entry,base).href)).text(),chunk=source.match(/ApolloScreen-[\w-]+\.js/)?.[0];assert.ok(chunk,'Use the compiled Vite preview.');
 await page.evaluate(async url=>{const m=await import(url),mount=m.ApolloScreen.prototype.mount;m.ApolloScreen.prototype.mount=function(...args){window.q=this;return mount.apply(this,args)}},new URL('/assets/'+chunk,base).href);
 await page.getByText('Misión 01: Apollo 11',{exact:true}).click();await page.getByRole('button',{name:'Comenzar operaciones',exact:true}).click();await page.getByRole('button',{name:'Omitir introducción'}).click();await capture('arrival');
 for(const language of['en','fr','es'])await changeMissionLanguage(language);
 await stand('sequence');await page.keyboard.press('m');await page.getByRole('button',{name:'Volver a operaciones',exact:true}).click();
 await openCurrent();await page.waitForFunction(()=>document.querySelector('.ap-inst-action')?.disabled===true);assert.equal(await page.locator('.ap-inst-action').isDisabled(),true);await page.locator('.ap-instrument').focus();await page.keyboard.press('Space');assert.equal((await snapshot()).checkpoint,0,'An unstable exposure cannot advance the mission.');await optics([[52,72,79]]);await checkpoint(1);await capture('orientation');
 await stand('flight-plan');await openCurrent();await optics([[26,62,83],[52,72,79],[82,48,86]]);await checkpoint(2);await capture('complex');
 await stand('telemetry');await stand('cables');await openCurrent();
 for(const[i,id]of['AS-506','LC-39A','09:32 EDT'].entries()){await page.locator('[data-card="'+id+'"]').click();await page.locator('.ap-inst-record-slot[data-slot="'+i+'"]').click();}
 await page.locator('.ap-inst-stamp').click();await checkpoint(3);await capture('documentation');
 await openCurrent();for(const[i,value]of[67,73].entries())await range(page.locator('.ap-inst-control input').nth(i),value);await page.waitForTimeout(1800);
 await page.locator('.ap-inst-telegraph').focus();for(const duration of[300,840,300]){await page.keyboard.down('Space');await page.waitForTimeout(duration);await page.keyboard.up('Space');await page.waitForTimeout(160)}
 await checkpoint(4);await capture('communications');await stand('crew-manifest');await openCurrent();
 await page.waitForFunction(()=>q.movie==='crew');await capture('crew-transfer');await checkpoint(5);await capture('crew-arrived');
 await stand('weather');await stand('beacons');await openCurrent();await optics([[61,57,79]]);await checkpoint(6);assert.equal(await page.evaluate(()=>q.world.player.z),5600);await capture('safe-observation');
 await page.locator('.ap-interact').click();await page.waitForFunction(()=>q.movie==='launch');await page.waitForTimeout(14000);await capture('liftoff');
 await page.waitForFunction(()=>q.state.checkpoint===7,undefined,{timeout:80000});await capture('epilogue');
 await page.getByRole('button',{name:'Completar misión y regresar',exact:true}).click();await page.getByText('Completada',{exact:true}).waitFor();
 await page.getByText('Misión 01: Apollo 11',{exact:true}).click();await page.getByRole('button',{name:'Ver informe de misión',exact:true}).click();
 for(const[language,heading]of[['es','Registro de apoyo terrestre'],['en','Ground-support log'],['fr','Registre de soutien au sol'],['es','Registro de apoyo terrestre']]){
   if(await page.evaluate(()=>document.documentElement.lang)!==language){await page.locator('.language-menu-trigger').click();await page.getByRole('option').filter({hasText:new RegExp('^'+language.toUpperCase()+' —')}).click();}
   await page.getByRole('heading',{name:heading,exact:true}).waitFor();assert.equal(await page.locator('.ap-report-operation[data-completed=true]').count(),15);await page.screenshot({path:resolve(out,'completed-report-'+language+'.png')});
 }
 await page.getByRole('button',{name:'Volver a misiones',exact:true}).click();
 await page.getByText('Misión 01: Apollo 11',{exact:true}).click();await page.getByRole('button',{name:'Ver epílogo',exact:true}).waitFor();
 const recovered=await snapshot();assert.equal(recovered.done,true);assert.equal(recovered.completed.length,8);assert.equal(recovered.bonusCompleted.length,7);
 await page.getByRole('button',{name:'Ver epílogo',exact:true}).click();await page.waitForFunction(()=>q.world?.standControlParts?.length===7);await controlAngle('power-lever',0,'Recovered power completion');await controlAngle('weather-heading',-225*Math.PI/180,'Recovered weather completion');await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.getByRole('button',{name:/Reiniciar misión/}).click();await page.getByRole('button',{name:'Reiniciar Apollo 11',exact:true}).click();await page.getByRole('button',{name:'Comenzar operaciones',exact:true}).waitFor();
 const reset=await snapshot();assert.equal(reset.checkpoint,0);assert.deepEqual(reset.bonusCompleted,[]);await page.getByRole('button',{name:'Comenzar operaciones',exact:true}).click();await page.getByRole('button',{name:'Omitir introducción'}).click();await page.waitForFunction(()=>q.world?.standControlParts?.length===7);await controlAngle('power-lever',.65,'Restart resets physical power');assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(networkErrors,[]);
 await writeFile(resolve(out,'report.json'),JSON.stringify({trace,controlChecks,recovered,reset,errors,consoleErrors,networkErrors,realInputTravel:true,completedAt:new Date().toISOString()},null,2));
 console.log('PASS: all 15 operations, held-input travel, launch, saved completion, reentry and reset.');
}catch(error){await page.screenshot({path:resolve(out,'failure.png')});await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),trace,controlChecks,state:await snapshot(),errors,consoleErrors,networkErrors,screen:await page.locator('body').innerText()},null,2));throw error}finally{await page.context().close();await browser.close()}
