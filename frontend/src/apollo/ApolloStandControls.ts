import type {StandControlChannel} from './ApolloStandModels';
import {restoreStandDraft, TELEMETRY_REFERENCE} from './ApolloStandRules';

/** Presentation only: drafts move hardware but never grant mission completion. */
export function stationControlAngle(channel: StandControlChannel, saved: unknown, completed = false): number {
  if(channel==='power-lever')return completed?0:.65;
  if(channel==='power-meter')return completed?0:1.15;
  if(channel.startsWith('telemetry-')){
    const draft=restoreStandDraft('telemetry',saved),index=Number(channel.slice(-1));
    const value=completed?TELEMETRY_REFERENCE[index]:(draft.controls??[24,42,82])[index];
    return (130-value*2.6)*Math.PI/180;
  }
  const draft=restoreStandDraft('weather',saved),values=completed?[225,35]:draft.controls??[65,75];
  return channel==='weather-heading'?-values[0]*Math.PI/180:(.5-values[1]/100)*2.3;
}
