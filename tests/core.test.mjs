import test from 'node:test';
import assert from 'node:assert/strict';
import {makeScale,quantity,report,csv,tiles,decodeYolo} from '../src/core.js';
test('calibration uses Euclidean distance and converts feet to meters',()=>{
 const s=makeScale({x:0,y:0},{x:300,y:400},10);assert.equal(s.pixelsPerMeter,50);
 const ft=makeScale({x:0,y:0},{x:100,y:0},10,'ft');assert.ok(Math.abs(ft.pixelsPerMeter-100/3.048)<1e-10);
 assert.throws(()=>makeScale({x:0,y:0},{x:0,y:0},10));assert.throws(()=>makeScale({x:0,y:0},{x:100,y:0},0));
});
test('length follows all vertices and recalibration; count follows markers',()=>{
 const item={kind:'length',geom:{points:[{x:0,y:0},{x:300,y:0},{x:300,y:400}]}};assert.equal(quantity(item,{confirmed:true,pixelsPerMeter:100}),7);assert.equal(quantity(item,{confirmed:true,pixelsPerMeter:50}),14);assert.equal(quantity(item,null),0);assert.equal(quantity({...item,kind:'count'},null),3);
});
test('report schema and CSV protect cells and preserve notes',()=>{const i={id:'a',kind:'count',group:'=BAD',label:'Basin, ceramic',geom:{points:[{x:1,y:2}]},source:'manual',note:'Check "size"\nnext'};const r=report([i],null);assert.deepEqual(Object.keys(r),['scale','items']);assert.equal(r.items[0].qty,1);assert.equal(r.items[0].unit,'ea');assert.match(csv(r),/"'=BAD"/);assert.match(csv(r),/"Check ""size""\nnext"/);});
test('overlapping tiles cover bounded sheets including edges',()=>{const t=tiles(2400,2400);assert.equal(t.length,25);assert.ok(t.every(p=>p.width<=640&&p.height<=640));assert.equal(t.at(-1).x+t.at(-1).width,2400);});
test('YOLO decoder applies confidence, class-aware NMS and tile offsets',()=>{const data=new Float32Array([20,21,200,30,31,100,20,20,20,20,20,20,.9,.8,.1]);const out=decodeYolo(data,[1,5,3],['Fixture'],{x:100,y:50});assert.equal(out.length,1);assert.equal(out[0].x,120);assert.equal(out[0].y,80);assert.throws(()=>decodeYolo(data,[1,6,3],['Fixture'],{x:0,y:0}));});
