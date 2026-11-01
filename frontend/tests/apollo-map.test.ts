import test from 'node:test';
import assert from 'node:assert/strict';
import {ApolloState} from '@/apollo/ApolloState';
import {apolloDestination,apolloMapStations,apolloMapProjection,apolloRemotePosition,apolloMapAnnotations,apolloMapRequirements} from '@/apollo/ApolloMap';

test('map preserves a single metre scale and contains the restricted circle on wide, tall and compact canvases',()=>{
  for(const[width,height]of[[1100,460],[780,860],[240,200]]){
    const map=apolloMapProjection(width,height,width<=300),a=map.point(0,0),x=map.point(100,0),z=map.point(0,100);
    assert.ok(Math.abs((x.x-a.x)-(z.y-a.y))<1e-8,'Distance must not depend on the map axis.');
    const top=map.point(0,-90),left=map.point(-90,0),right=map.point(90,0),bottom=map.point(0,90);
    assert.ok(top.y>=0&&left.x>=0&&right.x<=width&&bottom.y<=height,'The whole perimeter is visible.');
  }
});

test('map and HUD select the same real dependency and distinguish locked and completed stations',()=>{
  const state=new ApolloState();assert.equal(apolloDestination(state).id,'power-bus');
  let stations=apolloMapStations(state);assert.equal(stations.find(station=>station.status==='active')?.id,'power-bus');assert.equal(stations.find(station=>station.id==='orientation')?.status,'available');assert.equal(stations.find(station=>station.id==='flight-record')?.status,'locked');
  assert.equal(state.completeBonus('power-bus'),true);stations=apolloMapStations(state);
  assert.equal(apolloDestination(state).id,'orientation');assert.equal(stations.find(station=>station.id==='power-bus')?.status,'completed');assert.equal(stations.find(station=>station.id==='orientation')?.status,'active');
  for(const action of state.current.actions)assert.equal(state.act(action.id),true);
  assert.equal(apolloDestination(state).id,'flight-record');assert.equal(apolloMapStations(state).find(station=>station.id==='flight-record')?.status,'active');
  assert.equal(new Set(stations.map(station=>station.code)).size,13,'Station identifiers remain unique, independent of chronology.');
});

test('remote observation is explicitly outside the site projection and never clamped onto a station',()=>{
  assert.equal(apolloRemotePosition({z:5600}),true);assert.equal(apolloRemotePosition({z:379}),false);
  const map=apolloMapProjection(780,860,false,true);assert.ok(map.point(0,5600).y>860,'A remote position cannot look like a point in the complex.');
});


test('full-plan annotation fonts remain at least eleven CSS pixels after resize',()=>{
  for(const cssWidth of [263,333,560,900])for(const size of Object.values(apolloMapAnnotations(780,cssWidth).fontsCss))assert.ok(size>=11-1e-8);
});


test('an available current activity is not locked just because a support destination is pending',()=>{
  const state=new ApolloState();assert.equal(state.canAct('map'),true);assert.equal(state.canAct('landmark'),true);assert.equal(state.canAct('arrive'),false);
  assert.equal(apolloMapStations(state).find(station=>station.id==='orientation')?.status,'available');
  while(state.checkpoint<4){while(state.requiredStand)assert.equal(state.completeBonus(state.requiredStand.id),true);for(const action of [...state.current.actions])assert.equal(state.act(action.id),true);}
  assert.equal(state.requiredStand?.id,'crew-manifest');assert.equal(state.current.actions.some(action=>state.canAct(action.id)),false);assert.equal(apolloMapStations(state).find(station=>station.id==='crew')?.status,'locked');
});

test('legacy earned arrival does not impose a retroactive power-bench map requirement',()=>{
  const state=new ApolloState({version:'apollo11-v1',checkpoint:0,completed:[],checks:['arrive'],dialogues:[],elapsed:10,done:false,bonusCompleted:[]});
  assert.deepEqual(state.checks,['arrive']);assert.equal(apolloDestination(state).id,'orientation');assert.equal(apolloMapRequirements(state).some(requirement=>requirement.id==='power-bus'),false);
  assert.equal(state.canAct('map'),true);assert.equal(state.act('map'),true);assert.equal(state.act('landmark'),true);assert.equal(state.checkpoint,1);
});
