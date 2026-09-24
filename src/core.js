export const SYSTEMS = {Cold:'#297fc1',Hot:'#df6953',Soil:'#9864ba',Waste:'#338b6c',Vent:'#bb922e',Fire:'#cb4353',Pipe:'#526479',Fixtures:'#7762bb'};
export const POINT_CLASSES=['Fixture','Valve','Floor drain','Hydrant','Cleanout'];
export const POINT_COLORS=[[174,54,179],[242,150,30],[20,168,163],[217,42,83],[98,70,200]];
export const PIPE_COLORS=[[41,127,193],[223,105,83],[152,100,186],[51,139,108],[187,146,46],[203,67,83]];
export const PIPE_SYSTEMS=['Cold','Hot','Soil','Waste','Vent','Fire'];
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const pixelLength=points=>points.slice(1).reduce((sum,p,i)=>sum+distance(p,points[i]),0);
export function makeScale(a,b,real,unit='m') {
  if(!Number.isFinite(real)||real<=0||distance(a,b)<5)throw new Error('Choose two distinct points and a positive real distance.');
  return {pixelsPerMeter:distance(a,b)/(real*(unit==='ft'?0.3048:1)),reference:{points:[a,b],distance:real,unit},confirmed:true};
}
export function quantity(item,scale) {return item.kind==='count'?item.geom.points.length:scale?.confirmed?pixelLength(item.geom.points)/scale.pixelsPerMeter:0;}
export function report(items,scale) {
  return {scale,items:items.map(i=>({id:i.id,kind:i.kind,group:i.group,label:i.label,qty:Number(quantity(i,scale).toFixed(3)),unit:i.kind==='count'?'ea':'m',geom:i.geom,source:i.source,note:i.note||''}))};
}
export function csv(data) {
 const cell=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 return '\uFEFF'+[['id','kind','group','label','qty','unit','source','note'],...data.items.map(i=>[i.id,i.kind,i.group,i.label,i.qty,i.unit,i.source,i.note])].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function newItem(kind,points,group='Pipe',label=kind==='count'?'Fixture':'Pipe run',source='manual',note='') {
 return {id:crypto.randomUUID(),kind,group,label,geom:{points},source,note};
}
export function tiles(width,height,size=640,overlap=64) {
 const out=[];for(let y=0;y<height;y+=size-overlap)for(let x=0;x<width;x+=size-overlap)out.push({x,y,width:Math.min(size,width-x),height:Math.min(size,height-y)});return out;
}
export function dedupe(points,radius=15) {const out=[];for(const p of points)if(!out.some(q=>q.label===p.label&&distance(p,q)<radius))out.push(p);return out;}
export function decodeYolo(data,dims,labels,offset,threshold=.35) {
 if(dims.length!==3||dims[0]!==1||dims[1]!==labels.length+4)throw new Error('Expected YOLO detect output [1, 4 + classes, candidates]. Export with nms=False and supply matching labels.');
 const n=dims[2],boxes=[];for(let i=0;i<n;i++){let cls=0,score=0;for(let j=0;j<labels.length;j++)if(data[(j+4)*n+i]>score){score=data[(j+4)*n+i];cls=j;}if(score<threshold)continue;
 const w=data[2*n+i],h=data[3*n+i];boxes.push({x:data[i]+offset.x,y:data[n+i]+offset.y,w,h,label:labels[cls],score});}
 boxes.sort((a,b)=>b.score-a.score);const keep=[];
 for(const b of boxes){if(!keep.some(a=>{if(a.label!==b.label)return false;const inter=Math.max(0,Math.min(a.x+a.w/2,b.x+b.w/2)-Math.max(a.x-a.w/2,b.x-b.w/2))*Math.max(0,Math.min(a.y+a.h/2,b.y+b.h/2)-Math.max(a.y-a.h/2,b.y-b.h/2));return inter/(a.w*a.h+b.w*b.h-inter)>.45;}))keep.push(b);}return keep;
}
