import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stationControlAngle} from '../src/apollo/ApolloStandControls';

test('saved station readouts share starting values and direction with their instruments',()=>{
  assert.ok(Math.abs(stationControlAngle('telemetry-0',undefined)-(130-24*2.6)*Math.PI/180)<1e-12);
  assert.ok(Math.abs(stationControlAngle('weather-heading',undefined)+65*Math.PI/180)<1e-12);
  const draft={version:1,kind:'weather',controls:[90,0]};
  assert.equal(stationControlAngle('weather-heading',draft),-Math.PI/2);
  assert.equal(stationControlAngle('weather-cloud',draft),1.15);
  assert.deepEqual(draft.controls,[90,0]);
});

test('fitted drafts cannot energize power without verified completion',()=>{
  const fitted={version:1,kind:'sequence',slots:[1,3,0,2]};
  assert.equal(stationControlAngle('power-lever',fitted),.65);
  assert.equal(stationControlAngle('power-meter',fitted),1.15);
  assert.equal(stationControlAngle('power-lever',fitted,true),0);
  assert.equal(stationControlAngle('power-meter',fitted,true),0);
});

test('completed stations recover reference poses after drafts are removed',()=>{
  const invalid={version:1,kind:'telemetry',controls:[0,100,0]};
  for(const[i,value]of[62,74,58].entries())assert.equal(stationControlAngle(`telemetry-${i}` as 'telemetry-0',invalid,true),(130-value*2.6)*Math.PI/180);
  assert.equal(stationControlAngle('weather-heading',undefined,true),-225*Math.PI/180);
  assert.ok(Math.abs(stationControlAngle('weather-cloud',undefined,true)-.345)<1e-12);
});

test('malformed and out-of-range readings never create invalid transforms',()=>{
  for(const value of[null,{version:1,kind:'telemetry',controls:[NaN,3,4]},{version:1,kind:'weather',controls:[Infinity,1]}]){
    for(const key of ['telemetry-0','telemetry-1','telemetry-2','weather-heading','weather-cloud'] as const)assert.ok(Number.isFinite(stationControlAngle(key,value)));
  }
  const bounds={version:1,kind:'telemetry',controls:[-500,1000,50]};
  assert.equal(stationControlAngle('telemetry-0',bounds),130*Math.PI/180);
  assert.equal(stationControlAngle('telemetry-1',bounds),-130*Math.PI/180);
});
