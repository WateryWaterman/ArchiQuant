import {createWorker,PSM} from 'tesseract.js';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {mergeOcr,parseLegend} from '../src/scan-core.js';
await mkdir('tmp',{recursive:true});
const start=performance.now(),w=await createWorker('eng',1,{langPath:'public/models/ocr',cachePath:'tmp'});
await w.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
let all=[];
for(let y=0;y<1600;y+=600)for(let x=0;x<2400;x+=600){
 const width=Math.min(720,2400-x),height=Math.min(720,1600-y);
 const input=await sharp('public/samples/hsu-house/hsu-p301-scan.jpg').extract({left:x,top:y,width,height}).resize(width*3).threshold(170).png().toBuffer();
 const {data}=await w.recognize(input,{}, {blocks:true});
 const words=(data.blocks||[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words))).map(w=>({...w,bbox:{x0:w.bbox.x0/3+x,y0:w.bbox.y0/3+y,x1:w.bbox.x1/3+x,y1:w.bbox.y1/3+y}}));all.push(...words);
 console.log(x,y,words.filter(w=>/^(P.?[1-4]|WC|LAV|SH|KS|FD|CO|WM)$/i.test(w.text)).map(w=>[w.text,w.confidence,w.bbox]));
}
const points=mergeOcr([],all,parseLegend());
const groundTruth=JSON.parse(await readFile('tests/hsu-scan-ground-truth.json','utf8'));
const matches=groundTruth.tags.filter(t=>points.some(p=>p.label.endsWith(t.tag)&&Math.hypot(p.x-t.x,p.y-t.y)<12));
const result={seconds:(performance.now()-start)/1000,backend:'Tesseract LSTM WASM / Node',input:'HSU image-only sample raster, 2400 x 1600',method:'720px crops, 120px overlap, 3x enlargement, luminance cutoff 170, OCR score >=60',tagLocalization:{visibleNumberedTags:groundTruth.tags.length,matchedTags:matches.length,missedTags:groundTruth.tags.filter(t=>!matches.includes(t)),totalCandidates:points.length},points};
await writeFile('tmp/scan-ocr-benchmark.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,points:undefined}));await w.terminate();
