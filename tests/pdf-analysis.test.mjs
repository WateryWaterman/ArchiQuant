import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {extractPdfEvidence,analyzePdf,layerSystem,joinRegularDashes} from '../src/pdf-analysis.js';
import {explainItem,explanationNote} from '../src/explanations.js';

test('actual rotated P-1 PDF produces positioned fixture labels and only supported pipe layers',async()=>{
 const doc=await pdfjs.getDocument({data:new Uint8Array(await fs.readFile('public/samples/real-plan/residential-asbuilt-p1.pdf')),isEvalSupported:false}).promise;
 try{const page=await doc.getPage(1),v=page.getViewport({scale:2400/2384}),e=await extractPdfEvidence(page,v,await doc.getOptionalContentConfig(),pdfjs.OPS);
 const r=analyzePdf(e,{width:2400,height:1696,countArea:'upper-left',pipeArea:'left-plans'});
 assert.equal(r.points.length,12);assert.equal(r.points.filter(p=>p.tag==='FD').length,3);
 const reference=JSON.parse(await fs.readFile('public/samples/real-plan/example.json','utf8')).items.filter(i=>i.kind==='count').slice(0,6);
 for(const p of r.points)assert.ok(reference.some(i=>i.label===p.label&&i.geom.points.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<12)),p.label+' must align with an independently traced tag');
 assert.ok(r.runs.length>100);assert.deepEqual([...new Set(r.runs.map(p=>p.group))].sort(),['Cold','Hot','Soil','Vent','Waste']);
 assert.ok(r.runs.every(r=>r.points.every(p=>p.x>=0&&p.y>=0&&p.x<=2400&&p.y<=1696)));
 assert.ok(r.runs.every(r=>r.analysis.evidence.includes(r.layer)));assert.ok(r.runs.every(r=>r.points.every(p=>p.x<2400*.64)),'exclude right-side legend strokes');
 assert.ok(r.coverage.skippedCurves>0);
 assert.equal(analyzePdf(e,{width:2400,height:1696,countArea:'full'}).points.length,27,'full-sheet counts deliberately include duplicate views/legend; area selection matters');
 }finally{await doc.destroy();}
});
test('unknown layers and unsupported symbols do not acquire invented quantities',()=>{
 for(const name of ['A-WALL','P-GAS','P-STRM','P-FTDR','P-ANNO-TEXT','P-PIPE-JINT','0'])assert.equal(layerSystem(name),null);
 const r=analyzePdf({texts:[{text:'WC SCHEDULE',x:10,y:10},{text:'VALVE?',x:20,y:20}],paths:[],layers:[]},{width:100,height:100,countArea:'full'});assert.equal(r.points.length,0);assert.equal(r.runs.length,0);
});
test('element descriptions carry evidence, measurement basis and manual-edit provenance into report notes',()=>{
 const item={kind:'length',label:'Cold pipe',source:'manual',geom:{points:[{x:0,y:0},{x:30,y:40}]},analysis:{method:'PDF CAD-layer geometry',classification:'Cold pipe segment',evidence:'Layer P-DCW',confidence:'Rule match',limitations:'Check gaps'}};
 const a=explainItem(item,{pixelsPerMeter:10,confirmed:true});assert.equal(a.edited,true);assert.match(a.measurement,/5.000 m/);assert.match(explanationNote(item,{pixelsPerMeter:10,confirmed:true}),/Layer P-DCW/);
});
test('dash reconstruction requires repeated regular gaps and leaves isolated breaks alone',()=>{
 const line=(x,end,layer='P-DCW')=>({layer,group:'Cold',points:[{x,y:20},{x:end,y:20}]});
 const joined=joinRegularDashes([line(0,10),line(15,25),line(30,40),line(45,55),line(70,80)]);
 assert.equal(joined.length,2);assert.equal(joined[0].inferredGapPixels,15);assert.equal(joined[0].gaps.length,3);assert.equal(joined[0].points.at(-1).x,55);
 assert.equal(joinRegularDashes([line(0,10),line(15,25)]).length,2);
 assert.equal(joinRegularDashes([line(0,10),line(15,25,'P-DHW')]).length,2);
});
