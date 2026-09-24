import {distance,pixelLength} from './core.js';

export const TAGS={WC:'Water closet',SH:'Shower',LAV:'Lavatory / laundry sink',KS:'Kitchen sink',WM:'Washing machine connection',FD:'Floor drain',CO:'Cleanout',FCO:'Floor cleanout',HYD:'Hydrant',BV:'Ball valve',GV:'Gate valve'};
const IDENTITY=[1,0,0,1,0,0];
export const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const point=(m,x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});
export function layerSystem(name=''){
 const n=name.toUpperCase().split('|').at(-1);
 if(/ANNO|TEXT|FIXT|JINT|GAS|STRM|FTDR|DIMS/.test(n))return null;
 if(/(?:^|[-_ ])(?:DCW|CW|COLD)(?:$|[-_ ])/.test(n))return 'Cold';
 if(/(?:^|[-_ ])(?:DHW|HW|HOT)(?:$|[-_ ])/.test(n))return 'Hot';
 if(/SAN[-_ ](?:BLCK|BLACK)|SOIL/.test(n))return 'Soil';
 if(/SAN[-_ ](?:GRAY|GREY)|WASTE/.test(n))return 'Waste';
 if(/VENT/.test(n)&&/^P[-_ ]/.test(n))return 'Vent';
 if(/FIRE|SPRINKLER/.test(n)&&/^P[-_ ]/.test(n))return 'Fire';
 return null;
}

// Read the actual PDF operator stream before rendering mutates path arrays into Path2D.
// Only open, straight, stroked paths on explicitly named plumbing layers are accepted.
export async function extractPdfEvidence(page,viewport,config,OPS){
 const content=await page.getTextContent();
 if(content.items.length>50000)throw new Error('PDF text exceeds the demo processing limit. Use a smaller sheet.');
 const texts=content.items.filter(i=>i.str?.trim()).map(i=>{
  const t=multiply(viewport.transform,i.transform),angle=Math.atan2(t[1],t[0]),h=Math.hypot(t[2],t[3]),w=i.width*viewport.scale;
  return {text:i.str.trim(),x:t[4]+Math.cos(angle)*w/2+Math.sin(angle)*h*.35,y:t[5]+Math.sin(angle)*w/2-Math.cos(angle)*h*.35,height:h};
 });
 const groups=Object.fromEntries([...config].map(([id,g])=>[id,{name:g.name,visible:g.visible}]));
 const ops=await page.getOperatorList(),paths=[],stack=[],layers=[];
 if(ops.fnArray.length>250000)throw new Error('PDF geometry exceeds the demo processing limit. Use a smaller sheet.');
 let ctm=IDENTITY.slice(),layer=null,skippedCurves=0,skippedClosed=0;
 for(let i=0;i<ops.fnArray.length;i++){
  const op=ops.fnArray[i],args=ops.argsArray[i];
  if(op===OPS.save)stack.push(ctm.slice());
  else if(op===OPS.restore)ctm=stack.pop()||IDENTITY.slice();
  else if(op===OPS.transform)ctm=multiply(ctm,args);
  else if(op===OPS.paintFormXObjectBegin){stack.push(ctm.slice());if(args[0])ctm=multiply(ctm,args[0]);}
  else if(op===OPS.paintFormXObjectEnd)ctm=stack.pop()||IDENTITY.slice();
  else if(op===OPS.beginMarkedContentProps){layers.push(layer);if(args[0]==='OC')layer=groups[args[1]?.id]||null;}
  else if(op===OPS.beginMarkedContent)layers.push(layer);
  else if(op===OPS.endMarkedContent)layer=layers.pop()||null;
  else if(op===OPS.constructPath&&layer?.visible!==false&&layerSystem(layer?.name)&&args[0]===OPS.stroke){
   const data=args[1]?.[0];if(!ArrayBuffer.isView(data)&&!Array.isArray(data))continue;
   const m=multiply(viewport.transform,ctm);let points=[],curved=false,closed=false;
   const finish=()=>{if(curved)skippedCurves++;else if(closed)skippedClosed++;else if(points.length>=2&&pixelLength(points)>=8&&points.every(p=>p.x>=0&&p.y>=0&&p.x<=viewport.width&&p.y<=viewport.height))paths.push({points,layer:layer.name,group:layerSystem(layer.name)});points=[];curved=false;closed=false;};
   for(let k=0;k<data.length;){const command=data[k++];if(command===0){finish();points.push(point(m,data[k++],data[k++]));}else if(command===1)points.push(point(m,data[k++],data[k++]));else if(command===2){curved=true;k+=6;}else if(command===3)closed=true;else break;}finish();
  }
 }
 return {texts,paths,layers:Object.values(groups).map(g=>g.name),skippedCurves,skippedClosed,version:1};
}

// Join only repeated, regular dash gaps on the same layer and straight axis.
// Isolated breaks (valves, diagram breaks, disconnected runs) remain separate.
export function joinRegularDashes(paths){
 const buckets=new Map(),other=[];
 for(const p of paths){const [a,b]=p.points;if(p.points.length!==2){other.push(p);continue;}const horizontal=Math.abs(a.y-b.y)<.15,vertical=Math.abs(a.x-b.x)<.15;if(!horizontal&&!vertical){other.push(p);continue;}
  const axis=horizontal?'x':'y',cross=horizontal?'y':'x',key=p.layer+'|'+axis+'|'+Math.round(a[cross]*2)/2;
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({...p,axis,cross,start:Math.min(a[axis],b[axis]),end:Math.max(a[axis],b[axis]),coordinate:a[cross]});
 }
 for(const rows of buckets.values()){
  rows.sort((a,b)=>a.start-b.start);const gaps=rows.slice(1).map((r,i)=>r.start-rows[i].end).filter(g=>g>2&&g<25);
  const gap=gaps.find(g=>gaps.filter(x=>Math.abs(x-g)<.35).length>=3);
  if(gap===undefined){other.push(...rows);continue;}
  let current=null;
  for(const r of rows){const d=current?r.start-current.end:Infinity;if(current&&Math.abs(d-gap)<.35){const a=current.points.at(-1),b=r.points[0][r.axis]<r.points.at(-1)[r.axis]?r.points[0]:r.points.at(-1);current.gaps.push([a,b]);current.inferredGapPixels+=d;current.end=r.end;current.strokes++;current.points=[current.points[0],{[r.axis]:r.end,[r.cross]:r.coordinate}];}
   else{if(current)other.push(current);current={...r,points:[{[r.axis]:r.start,[r.cross]:r.coordinate},{[r.axis]:r.end,[r.cross]:r.coordinate}],inferredGapPixels:0,gaps:[],strokes:1};}}
  if(current)other.push(current);
 }
 return other;
}

export function analyzePdf(evidence,{width,height,countArea='upper-left',pipeArea='full',bridgeDashes=true}={}){
 const inside=p=>countArea==='full'||countArea==='upper-left'?(countArea==='full'||p.x<width*.64&&p.y<height*.5):countArea==='lower-left'?p.x<width*.64&&p.y>=height*.5:true;
 const points=[];
 for(const t of evidence.texts){const tag=t.text.toUpperCase().trim();if(!TAGS[tag]||!inside(t))continue;
  if(points.some(p=>p.tag===tag&&distance(p,t)<Math.max(6,t.height)))continue;
  points.push({x:t.x,y:t.y,label:TAGS[tag],tag,analysis:{method:'PDF fixture label',classification:TAGS[tag],evidence:`Exact standalone label "${tag}" in the PDF text layer, inside the selected count area.`,confidence:'Rule match · not a probability',limitations:'Abbreviations depend on the sheet legend. A label is not independent visual recognition. Check repeated views and unlabelled fixtures.',area:countArea}});
 }
 const unique=[];
 for(const path of evidence.paths){if(pipeArea==='left-plans'&&path.points.some(p=>p.x>=width*.64))continue;if(unique.some(r=>r.layer===path.layer&&Math.abs(pixelLength(r.points)-pixelLength(path.points))<1&&(distance(r.points[0],path.points[0])<1&&distance(r.points.at(-1),path.points.at(-1))<1||distance(r.points[0],path.points.at(-1))<1&&distance(r.points.at(-1),path.points[0])<1)))continue;unique.push(path);}
 const runs=[];
 for(const path of bridgeDashes?joinRegularDashes(unique):unique){
  const reconstructed=path.inferredGapPixels>0;
  runs.push({...path,analysis:{method:'PDF CAD-layer geometry',classification:path.group+' pipe segment',inferredGapPixels:path.inferredGapPixels||0,gaps:path.gaps||[],evidence:`Open straight stroke on layer "${path.layer}". PDF transforms map its vertices onto this sheet.`+(reconstructed?` ${path.strokes} collinear strokes joined across regular dash gaps; ${path.inferredGapPixels.toFixed(2)} pixels of this length are inferred gaps.`:''),confidence:'Layer-name rule · not a probability',limitations:(reconstructed?'Regular dash gaps are inferred; confirm continuity. ':'')+'Curves, closed symbols, short strokes and irregular gaps are excluded. Schematic or offsite runs may not be to scale; check every segment. No vertical lengths or fittings inferred.'}});
 }
 return {points,runs,backend:'PDF rules · CPU',coverage:{countArea,pipeArea,bridgeDashes,inferredGapPixels:runs.reduce((n,r)=>n+(r.inferredGapPixels||0),0),skippedCurves:evidence.skippedCurves,skippedClosed:evidence.skippedClosed,layers:evidence.layers.filter(layerSystem)}};
}
