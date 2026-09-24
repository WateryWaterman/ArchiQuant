// Shared, deterministic post-processing. No sample annotations are used here.
export const FIXTURE_NAMES={bath:'Bath symbol',bath_tub:'Bathtub',toilet:'Water closet',squat_toilet:'Squat toilet',urinal:'Urinal',sink:'Sink',washing_machine:'Washing machine'};
export function hasPdfEvidence(doc){return !!doc?.realPlan||!!doc?.pdfEvidence?.texts?.length||!!doc?.pdfEvidence?.paths?.length;}
export function detectionMode(configured,doc){return configured!=='auto'?configured:doc?.sample?'sample':hasPdfEvidence(doc)?'pdf':'scan';}
export function suppressBoxes(boxes,threshold=.4){
 const keep=[];
 for(const b of [...boxes].sort((a,b)=>b.score-a.score)){
  if(!keep.some(a=>{const overlap=Math.max(0,Math.min(a.x+a.w/2,b.x+b.w/2)-Math.max(a.x-a.w/2,b.x-b.w/2))*Math.max(0,Math.min(a.y+a.h/2,b.y+b.h/2)-Math.max(a.y-a.h/2,b.y-b.h/2));return overlap/(a.w*a.h+b.w*b.h-overlap)>threshold||Math.hypot(a.x-b.x,a.y-b.y)<Math.min(a.w,a.h,b.w,b.h)*.4;}))keep.push(b);
 }return keep;
}
export function parseLegend(text=''){
 const defaults={WC:'Water closet',LAV:'Lavatory',SH:'Shower',KS:'Kitchen sink',WM:'Washing machine',FD:'Floor drain',CO:'Cleanout',FCO:'Floor cleanout',HYD:'Hydrant',BV:'Ball valve',GV:'Gate valve'};
 for(const line of text.split('\n')){const [tag,...rest]=line.split('=');if(tag?.trim()&&rest.join('=').trim())defaults[tag.trim().toUpperCase()]=rest.join('=').trim().slice(0,80);}
 return defaults;
}
export function mergeOcr(points,words,legend,minConfidence=60){
 const out=[...points];
 const seen=[];
 for(const word of [...words].sort((a,b)=>b.confidence-a.confidence)){const tag=word.text.trim().toUpperCase(),meaning=legend[tag]||(/^P-\d{1,2}$/.test(tag)?'Unmapped fixture tag '+tag:null);if(!meaning||word.confidence<minConfidence)continue;
  const {x0,y0,x1,y1}=word.bbox,p={x:(x0+x1)/2,y:(y0+y1)/2};
  if(seen.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<8))continue;seen.push(p);
  // OCR labels near symbols add evidence, never a second quantity.
  const near=out.filter(q=>q.rawLabel).map(q=>({q,d:Math.hypot(q.x-p.x,q.y-p.y)})).filter(v=>v.d<35).sort((a,b)=>a.d-b.d)[0]?.q;
  if(near){near.analysis={...near.analysis,evidence:near.analysis.evidence+` Nearby OCR text "${tag}" (${word.confidence}% OCR score); interpreted as ${meaning}. Check that the leader refers to this symbol.`};continue;}
  out.push({...p,label:meaning,score:word.confidence/100,analysis:{method:'Neural OCR + exact legend rule',classification:meaning+' (tag candidate)',evidence:`Tesseract LSTM read "${tag}" from image pixels using overlapping enlarged crops and a dark-ink threshold. ${legend[tag]?'The legend maps this exact token to '+meaning+'.':'No legend mapping supplied; the fixture type is unknown.'} Marker is at the text, not a verified fixture center.`,confidence:`OCR score ${word.confidence}% (not probability of a fixture)`,limitations:'Check the label leader, relocate to the symbol, and remove notes, legend entries or duplicate views. OCR alone does not verify physical equipment.'}});
 }return out;
}
const pointDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
function simplify(ps){if(ps.length<3)return ps;let max=1.4,index=0;for(let i=1;i<ps.length-1;i++){const d=pointDistance(ps[i],ps[0],ps.at(-1));if(d>max){max=d;index=i;}}return index?[...simplify(ps.slice(0,index+1)).slice(0,-1),...simplify(ps.slice(index))]:[ps[0],ps.at(-1)];}
// Dijkstra search in a bounded corridor; user chooses the run and its bends.
// This is raster geometry assistance, not a learned pipe classifier.
export function traceInk(rgba,width,height,start,end){
 const direct=Math.hypot(end.x-start.x,end.y-start.y);if(direct<5)throw new Error('Choose endpoints at least 5 pixels apart.');
 const margin=28,left=Math.max(0,Math.floor(Math.min(start.x,end.x)-margin)),top=Math.max(0,Math.floor(Math.min(start.y,end.y)-margin)),right=Math.min(width-1,Math.ceil(Math.max(start.x,end.x)+margin)),bottom=Math.min(height-1,Math.ceil(Math.max(start.y,end.y)+margin)),w=right-left+1,h=bottom-top+1,n=w*h;
 if(n>350000)throw new Error('Trace a shorter section using an intermediate bend.');
 const darkness=new Uint8Array(n);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((top+y)*width+left+x)*4;darkness[y*w+x]=Math.round(.299*rgba[i]+.587*rgba[i+1]+.114*rgba[i+2]);}
 const snap=p=>{let best=-1,score=Infinity;for(let y=Math.max(0,Math.round(p.y-top)-9);y<=Math.min(h-1,Math.round(p.y-top)+9);y++)for(let x=Math.max(0,Math.round(p.x-left)-9);x<=Math.min(w-1,Math.round(p.x-left)+9);x++){const d=Math.hypot(x+left-p.x,y+top-p.y);if(darkness[y*w+x]<170&&d<score){best=y*w+x;score=d;}}if(best<0)throw new Error('No dark pipe ink near an endpoint. Zoom in and click the pipe, or use Length.');return best;};
 const a=snap(start),b=snap(end),cost=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),heap=[];
 const push=(i,c)=>{let k=heap.length;heap.push({i,c});while(k){const p=(k-1)>>1;if(heap[p].c<=c)break;heap[k]=heap[p];k=p;}heap[k]={i,c};};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length){let c=k*2+1;if(c+1<heap.length&&heap[c+1].c<heap[c].c)c++;if(heap[c].c>=last.c)break;heap[k]=heap[c];k=c;}heap[k]=last;}return first;};
 cost[a]=0;push(a,0);while(heap.length){const {i,c}=pop();if(c!==cost[i])continue;if(i===b)break;const x=i%w,y=Math.floor(i/w);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const j=ny*w+nx,d=pointDistance({x:nx+left,y:ny+top},start,end);if(d>margin)continue;const next=c+(dx&&dy?1.414:1)*(darkness[j]<170?1:darkness[j]<220?8:30)+d*.015;if(next<cost[j]){cost[j]=next;prev[j]=i;push(j,next);}}}
 if(!Number.isFinite(cost[b]))throw new Error('No ink route found. Add a bend or trace manually.');
 const indices=[];for(let i=b;i!==-1;i=prev[i]){indices.push(i);if(i===a)break;}indices.reverse();let gap=0,maxGap=0,white=0;for(const i of indices){if(darkness[i]>220){white++;maxGap=Math.max(maxGap,++gap);}else gap=0;}
 if(maxGap>8||white/indices.length>.15||indices.length>direct*2.2)throw new Error('The route crosses too much blank space or detours. Add closer waypoints, or use Length for dashed/obscured pipes.');
 return {points:simplify(indices.map(i=>({x:i%w+left,y:Math.floor(i/w)+top}))),gapPixels:white};
}
