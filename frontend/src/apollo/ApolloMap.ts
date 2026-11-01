import {ApolloState,CHECKPOINTS,BONUS_CHECKPOINTS} from './ApolloState';
import {SITE_BUILDINGS,SITE_ROADS,SITE_WALKWAYS,SITE_ZONES,zoneBounds} from './ApolloSiteLayout';
import {apolloText} from './ApolloLocale';

export type MapStationStatus='active'|'completed'|'available'|'locked';
export type MapStation={id:string;code:string;title:string;target:{x:number;z:number};kind:'story'|'support';status:MapStationStatus};
export const MAP_STATUS_COPY:Record<MapStationStatus,string>={active:'Destino activo',completed:'Completado',available:'Disponible',locked:'Pendiente de autorización'};
/** Shared with the HUD: a pending dependency is the next destination. */
export function apolloDestination(state:ApolloState){return state.requiredStand??state.current;}
export function apolloMapStations(state:ApolloState):MapStation[]{
  const destination=state.done?null:apolloDestination(state).id;
  return [
    ...CHECKPOINTS.slice(0,6).map((station,index)=>({id:station.id,code:`C${index+1}`,title:station.title,target:station.target,kind:'story' as const,status:state.completed.includes(station.id)?'completed' as const:destination===station.id?'active' as const:station.id===state.current.id&&state.current.actions.some(action=>state.canAct(action.id))?'available' as const:'locked' as const})),
    ...BONUS_CHECKPOINTS.map((station,index)=>({id:station.id,code:`S${index+1}`,title:station.title,target:station.target,kind:'support' as const,status:state.bonusCompleted.includes(station.id)?'completed' as const:destination===station.id?'active' as const:state.canStartBonus(station.id)?'available' as const:'locked' as const})),
  ];
}
/** Earned legacy checks remain earned; only pending actions impose dependencies. */
export function apolloMapRequirements(state:ApolloState){
  const target=apolloDestination(state),bonus=BONUS_CHECKPOINTS.find(station=>station.id===target.id);
  const ids=bonus?[...(bonus.afterCheckpoint?[bonus.afterCheckpoint]:[]),...(bonus.requires??[])]:[...state.current.requirements,...state.current.actions.filter(action=>!state.checks.includes(action.id)).flatMap(action=>action.requiresBonus??[])];
  return [...new Set(ids)].flatMap(id=>{const station=[...CHECKPOINTS,...BONUS_CHECKPOINTS].find(entry=>entry.id===id);return station?[{id,title:station.title,complete:state.completed.includes(id)||state.bonusCompleted.includes(id)}]:[]});
}
/** A single scale preserves metres in both axes on every canvas aspect ratio. */
export function apolloMapProjection(width:number,height:number,compact=false,remote=false,remoteInsetHeight=76){
  const pad=compact?10:44,bottom=remote&&!compact?138+remoteInsetHeight-76:pad+(!compact?32:0);
  const scale=Math.min((width-pad*2)/330,(height-pad-bottom)/525);
  const ox=(width-330*scale)/2,oy=pad+(height-pad-bottom-525*scale)/2;
  return{scale,point:(x:number,z:number)=>({x:ox+(x+165)*scale,y:oy+(z+105)*scale})};
}
export function apolloRemotePosition(position:{z:number}){return position.z>5000;}
/** Canvas resolution must not make labels shrink below readable CSS pixels. */
export function apolloMapAnnotations(width:number,cssWidth:number){
  const units=width/(cssWidth||width),font=(base:number)=>Math.max(base,11*units);
  const fonts={code:font(24),north:font(24),restricted:font(22),scale:font(20),insetTitle:font(22),insetDetail:font(20)};
  return{units,fonts,fontsCss:Object.fromEntries(Object.entries(fonts).map(([key,size])=>[key,size/units]))};
}

export function drawApolloMap(canvas:HTMLCanvasElement,state:ApolloState,player:{x:number;z:number},yaw:number){
  const c=canvas.getContext('2d');if(!c)return;
  const w=canvas.width,h=canvas.height,compact=w<=300,remote=apolloRemotePosition(player),annotations=apolloMapAnnotations(w,canvas.clientWidth),fonts=annotations.fonts,remoteInsetHeight=Math.max(76,56*annotations.units),projection=apolloMapProjection(w,h,compact,remote,remoteInsetHeight),s=projection.scale,p=projection.point;
  let insetTextFits=true;
  const colors={active:'#f2cf83',completed:'#b4d7ae',available:'#d8c49b',locked:'#819c9b'};
  c.fillStyle='#10272b';c.fillRect(0,0,w,h);
  c.save();c.strokeStyle='#a1b3a315';c.lineWidth=1;
  for(let x=-150;x<=150;x+=50){const a=p(x,-105),b=p(x,420);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
  for(let z=-100;z<=400;z+=50){const a=p(-165,z),b=p(165,z);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
  const restricted=p(0,0);c.fillStyle='#bc776317';c.strokeStyle='#cd8f78';c.lineWidth=compact?1:2;c.setLineDash(compact?[3,3]:[8,6]);c.beginPath();c.arc(restricted.x,restricted.y,90*s,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);
  const segment=(a:{x:number;z:number},b:{x:number;z:number},width:number,color:string)=>{const from=p(a.x,a.z),to=p(b.x,b.z);c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(from.x,from.y);c.lineTo(to.x,to.y);c.stroke();};
  c.lineCap='butt';
  for(const road of SITE_ROADS){segment(road.from,road.to,Math.max(2,road.shoulder*s),'#092024');segment(road.from,road.to,Math.max(1.5,road.width*s),'#a8a383');}
  c.fillStyle='#42534b';
  for(const zone of SITE_ZONES){const area=zoneBounds(zone.members),a=p(area.x-area.width/2,area.z-area.depth/2);c.fillRect(a.x,a.y,area.width*s,area.depth*s);}
  c.lineCap='round';for(const path of SITE_WALKWAYS)for(let i=1;i<path.length;i++)segment(path[i-1],path[i],Math.max(1,2.2*s),'#bbc5a6');
  c.lineWidth=compact?1:1.5;c.fillStyle='#27464a';c.strokeStyle='#8caba2';
  for(const building of SITE_BUILDINGS){const a=p(building.x-building.width/2,building.z-building.depth/2);c.fillRect(a.x,a.y,building.width*s,building.depth*s);c.strokeRect(a.x,a.y,building.width*s,building.depth*s);}
  const stations=apolloMapStations(state);
  const marker=(x:number,y:number,station:MapStation)=>{
    const r=compact?3:Math.max(10,5*annotations.units),color=colors[station.status];c.fillStyle=station.status==='locked'?'#193236':color;c.strokeStyle=color;c.lineWidth=compact?1:2;c.beginPath();if(station.kind==='support')c.rect(x-r,y-r,r*2,r*2);else c.arc(x,y,r,0,Math.PI*2);c.fill();c.stroke();
    if(station.status==='active'){c.lineWidth=compact?1:2;c.beginPath();if(station.kind==='support')c.rect(x-r-4,y-r-4,(r+4)*2,(r+4)*2);else c.arc(x,y,r+5,0,Math.PI*2);c.stroke();}
    if(!compact&&station.status==='completed'){c.strokeStyle='#142e29';c.lineWidth=2.5;c.beginPath();c.moveTo(x-5,y);c.lineTo(x-1,y+4);c.lineTo(x+5,y-4);c.stroke();}
    if(!compact&&station.status==='locked'){c.strokeStyle=color;c.lineWidth=1.6;c.strokeRect(x-3,y,6,5);c.beginPath();c.arc(x,y,3,Math.PI,Math.PI*2);c.stroke();}
  };
  for(const station of stations){const q=p(station.target.x,station.target.z);marker(q.x,q.y,station);}
  // Codes identify a station; chronology stays in the mission's destination panel.
  if(!compact){
    for(const left of [true,false]){
      const labels=stations.filter(station=>(station.target.x<0)===left).map(station=>({...station,position:p(station.target.x,station.target.z)})).sort((a,b)=>a.position.y-b.position.y);
      let previous=-Infinity;const ys=labels.map(station=>{const y=Math.max(station.position.y,previous+fonts.code+5*annotations.units);previous=y;return y;});
      for(let i=ys.length-1;i>=0;i--)ys[i]=Math.min(ys[i],i===ys.length-1?h-(remote?84+remoteInsetHeight:72):ys[i+1]-fonts.code-5*annotations.units);
      labels.forEach((station,index)=>{const x=left?48:w-48,y=ys[index],a=station.position;c.strokeStyle=colors[station.status]+'80';c.lineWidth=1;c.beginPath();c.moveTo(a.x+(left?-14:14),a.y);c.lineTo(x+(left?30:-30),y);c.lineTo(x+(left?18:-18),y);c.stroke();c.font=`600 ${fonts.code}px sans-serif`;c.textAlign=left?'left':'right';c.textBaseline='middle';c.fillStyle=colors[station.status];c.fillText(station.code,x,y);});
    }
  }
  const arrow=(x:number,y:number)=>{const r=compact?7:Math.max(13,8*annotations.units);c.save();c.translate(x,y);c.rotate(-yaw);c.fillStyle='#f6f1d9';c.strokeStyle='#102124';c.lineWidth=compact?1.5:3;c.beginPath();c.moveTo(0,-r);c.lineTo(r*.75,r*.7);c.lineTo(0,r*.3);c.lineTo(-r*.75,r*.7);c.closePath();c.fill();c.stroke();c.restore();};
  if(!remote){const q=p(player.x,player.z);arrow(q.x,q.y);}
  c.textBaseline='alphabetic';c.textAlign='center';c.font=`600 ${compact?9:fonts.restricted}px sans-serif`;c.fillStyle='#e6cfa0';c.fillText(compact?'39A':apolloText('39A · RESTRINGIDO'),restricted.x,restricted.y+(compact?3:6));
  c.textAlign='left';c.fillStyle='#d7dfce';c.font=`600 ${compact?9:fonts.north}px sans-serif`;c.fillText(apolloText('N ↑'),compact?9:fonts.north,compact?16:Math.max(31,fonts.north+8*annotations.units));
  if(!compact){
    const x=44,y=h-(remote?remoteInsetHeight+49:40),length=50*s;c.strokeStyle='#c8cfaf';c.lineWidth=2;c.beginPath();c.moveTo(x,y-5);c.lineTo(x,y+5);c.moveTo(x,y);c.lineTo(x+length,y);c.moveTo(x+length,y-5);c.lineTo(x+length,y+5);c.stroke();c.font=`${fonts.scale}px sans-serif`;c.fillStyle='#c1cebc';c.fillText('50 m',x+length+10,y+5);
    c.textAlign='right';c.font=`${fonts.scale}px sans-serif`;c.fillText(apolloText('Escala del escenario'),w-44,y+5);
    if(remote){
      const top=h-20-remoteInsetHeight;c.fillStyle='#193b38';c.fillRect(24,top,w-48,remoteInsetHeight);c.strokeStyle='#bcc7a155';c.strokeRect(24,top,w-48,remoteInsetHeight);arrow(55,top+remoteInsetHeight/2);
      c.textAlign='left';c.fillStyle='#efd09a';c.font=`600 ${fonts.insetTitle}px sans-serif`;insetTextFits=c.measureText(apolloText('Observación remota · 5,6 km')).width<=w-108;c.fillText(apolloText('Observación remota · 5,6 km'),84,top+remoteInsetHeight*.4);
      c.fillStyle='#c5d2c1';c.font=`${fonts.insetDetail}px sans-serif`;insetTextFits=insetTextFits&&c.measureText(apolloText('Tu posición')+' · '+apolloText('Fuera del plano del complejo')).width<=w-108;c.fillText(apolloText('Tu posición')+' · '+apolloText('Fuera del plano del complejo'),84,top+remoteInsetHeight*.76);
    }
  }else if(remote){c.fillStyle='#183b39f0';c.fillRect(0,h-30,w,30);arrow(14,h-15);c.textAlign='left';c.font='9px sans-serif';c.fillStyle='#f2d292';c.fillText(apolloText('5,6 km')+' · '+apolloText('Tu posición'),28,h-12);}
  c.restore();
  return{fontsCss:compact?null:annotations.fontsCss,cssWidth:canvas.clientWidth,insetTextFits,playerArea:remote?'remote':'complex',projectionScale:s};
}
