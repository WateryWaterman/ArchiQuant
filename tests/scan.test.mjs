import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {detectionMode,suppressBoxes,parseLegend,mergeOcr,traceInk} from '../src/scan-core.js';
import {pixelLength,quantity,report} from '../src/core.js';
import {explanationNote} from '../src/explanations.js';
import sharp from 'sharp';
test('image-only PDF routes to neural scan analysis, never the color demo or empty PDF rules',async()=>{
 const pdf=await getDocument({data:new Uint8Array(await readFile('public/samples/hsu-house/hsu-p301-scan.pdf')),isEvalSupported:false,standardFontDataUrl:fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url)).replaceAll('\\','/')}).promise;
 try{assert.equal(pdf.numPages,1);const p=await pdf.getPage(1),text=await p.getTextContent();assert.equal(text.items.length,0);assert.equal(detectionMode('auto',{pdfEvidence:{texts:[],paths:[]}}),'scan');assert.equal(detectionMode('auto',{sample:true}),'sample');assert.equal(detectionMode('auto',{pdfEvidence:{texts:[{str:'WC'}]}}),'pdf');assert.equal(detectionMode('scan',{realPlan:true}),'scan');}finally{await pdf.destroy();}
});
test('OCR exact tags are deduplicated across crops but adjacent fixtures remain distinct',()=>{
 const word=(text,x,confidence=85)=>({text,confidence,bbox:{x0:x,y0:20,x1:x+15,y1:30}});
 const points=mergeOcr([],[word('P-2',10,60),word('P-2',10,90),word('P-2',40),word('P-301.00',100),word('FD',150,40),word('CO',180)],parseLegend('P-2=Lavatory'));
 assert.equal(points.length,3);assert.equal(points[0].label,'Lavatory');assert.equal(points[1].label,'Lavatory');assert.equal(points[2].label,'Cleanout');assert.match(points[0].analysis.evidence,/not a verified fixture center/);
 const unknown=mergeOcr([],[word('P-4',10)],parseLegend());assert.equal(unknown[0].label,'Unmapped fixture tag P-4');
 const empty=mergeOcr([],[],parseLegend());assert.deepEqual(empty,[]);
});
test('cross-tile model suppression removes overlapping competing boxes, retains nearby separate fixtures',()=>{
 const b={x:100,y:100,w:25,h:25,label:'Sink',score:.8};assert.equal(suppressBoxes([b,{...b,x:101,label:'Water closet',score:.5},{...b,x:130}]).length,2);
});
test('guided tracing follows a real bend, scales measured pixels, and rejects an empty corridor',()=>{
 const w=160,h=100,pixels=new Uint8ClampedArray(w*h*4).fill(255);
 const black=(x,y)=>{for(let c=0;c<3;c++)pixels[(y*w+x)*4+c]=0;};
 for(let x=20;x<=100;x++)black(x,40);for(let y=40;y<=60;y++)black(100,y);
 const result=traceInk(pixels,w,h,{x:20,y:40},{x:100,y:60});assert.ok(pixelLength(result.points)>95&&pixelLength(result.points)<102);assert.ok(result.points.length>=3);assert.ok(result.gapPixels<3);
 const item={id:'trace',kind:'length',group:'Pipe',label:'Reviewed route',source:'manual',geom:{points:result.points},note:'Checked'};
 assert.ok(quantity(item,{confirmed:true,pixelsPerMeter:10})>9.5);const exported=report([{...item,note:explanationNote(item,{confirmed:true,pixelsPerMeter:10})}],{confirmed:true,pixelsPerMeter:10});assert.equal(exported.items[0].source,'manual');assert.match(exported.items[0].note,/drawing pixels/);
 assert.throws(()=>traceInk(new Uint8ClampedArray(w*h*4).fill(255),w,h,{x:20,y:40},{x:100,y:60}),/No dark pipe ink/);
});
test('guided tracing refuses long white gaps instead of inventing a connection',()=>{
 const w=160,h=100,pixels=new Uint8ClampedArray(w*h*4).fill(255);for(const [start,end] of [[20,40],[90,110]])for(let x=start;x<=end;x++)for(let c=0;c<3;c++)pixels[(40*w+x)*4+c]=0;
 assert.throws(()=>traceInk(pixels,w,h,{x:20,y:40},{x:110,y:40}),/blank space/);
});
test('HSU raster: user-guided two-leg water pipe measures the independently selected 88-pixel route',async()=>{
 const {data,info}=await sharp('public/samples/hsu-house/hsu-p301-scan.jpg').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const a=traceInk(data,info.width,info.height,{x:618,y:468},{x:666,y:468});
 const b=traceInk(data,info.width,info.height,a.points.at(-1),{x:666,y:508});
 assert.equal(a.gapPixels+b.gapPixels,0);
 const length=pixelLength([...a.points,...b.points.slice(1)]);assert.equal(length,88);
 assert.ok(Math.abs(length/(2400/36*.25/.3048)-1.609344)<1e-6);
});
