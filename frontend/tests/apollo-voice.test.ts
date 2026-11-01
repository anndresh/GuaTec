import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApolloVoice } from '../src/apollo/ApolloVoice';
import { APOLLO_TRANSLATIONS, apolloText } from '../src/apollo/ApolloLocale';
import { CHECKPOINTS, DIALOGUES } from '../src/apollo/ApolloState';

class FakeUtterance {
  lang='';voice:unknown;rate=1;pitch=1;volume=1;
  onend:((event:unknown)=>void)|null=null;
  onerror:((event:{error:string})=>void)|null=null;
  constructor(public text:string){}
}
class FakeEngine extends EventTarget {
  queue:FakeUtterance[]=[];cancels=0;pauses=0;resumes=0;voiceRequests=0;
  getVoices(){this.voiceRequests++;return [
    {name:'Spanish local',lang:'es-ES',localService:true},
    {name:'English narrator',lang:'en-US',localService:true},
    {name:'English Carter',lang:'en-GB',localService:true},
    {name:'French local',lang:'fr-FR',localService:true},
  ];}
  speak(utterance:FakeUtterance){this.queue.push(utterance);}
  cancel(){this.cancels++;this.queue=[];}
  pause(){this.pauses++;}
  resume(){this.resumes++;}
}
let engine:FakeEngine;
let storage:Map<string,string>;
const global=globalThis as unknown as Record<string,unknown>;
const originals=new Map(['window','localStorage','SpeechSynthesisUtterance'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
beforeEach(()=>{
  engine=new FakeEngine();storage=new Map();
  global.window={speechSynthesis:engine};global.SpeechSynthesisUtterance=FakeUtterance;
  global.localStorage={getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)};
});
afterEach(()=>{for(const [key,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete global[key];}});

test('all voices stay disabled despite saved preferences or enable requests',()=>{
  for(const preference of ['on','off','']) {
    storage.set('guatec.apollo11.voice',preference);
    const voice=new ApolloVoice();voice.setEnabled(true);voice.setVolume(1);
    voice.speak('Narración','Narrador');voice.speak('Diálogo','Daniel Carter');
    voice.pause(true);voice.pause(false);voice.stop();voice.dispose();
    assert.equal(voice.enabled,false);assert.equal(voice.isSpeaking,false);
    assert.equal(engine.queue.length,0);assert.equal(engine.voiceRequests,0);
    assert.equal(engine.cancels,0);assert.equal(engine.pauses,0);
    assert.match(voice.status(),/desactivada.*subtítulos/);
  }
});
test('every authored checkpoint, action and dialogue has complete English and French copy',()=>{
  const sources=[...CHECKPOINTS.flatMap(cp=>[cp.title,cp.objective,...cp.actions.flatMap(action=>[action.label,action.description])]),...DIALOGUES.map(line=>line.text)];
  for(const source of sources)for(const language of ['en','fr'] as const){assert.ok(APOLLO_TRANSLATIONS.has(source),`Missing ${language}: ${source}`);assert.notEqual(apolloText(source,language),source);}
});
test('dynamic progress, interaction and recovery labels retain their numbers in translation',()=>{
  assert.equal(apolloText('CHECKPOINT 3 COMPLETADO','en'),'CHECKPOINT 3 COMPLETE');
  assert.equal(apolloText('E · Examinar estación','fr'),'E · Examiner la station');
  assert.equal(apolloText('Registro recuperado · 4 de 8 checkpoints completados.','en'),'Log restored · 4 of 8 checkpoints complete.');
  assert.equal(apolloText('✓ Preparar la cámara','fr'),'✓ Préparer la caméra');
  assert.equal(apolloText('72 m · Documentación técnica','en'),'72 m · Technical documentation');
});
