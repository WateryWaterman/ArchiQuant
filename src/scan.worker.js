import {decodeYolo,tiles} from './core.js';
import {FIXTURE_NAMES,suppressBoxes,parseLegend,mergeOcr} from './scan-core.js';
const post=(type,data)=>self.postMessage({type,...data});
self.onmessage=async({data})=>{
 let session,ocr;const start=performance.now();
 try{
  const {width,height,pixels,scanOptions={}}=data;
  const rgba=new Uint8ClampedArray(pixels),source=new OffscreenCanvas(width,height),ctx=source.getContext('2d');ctx.putImageData(new ImageData(rgba,width,height),0,0);
  const rect=scanOptions.area||{x:0,y:0,width,height};
  let points=[],backend='Neural OCR · WASM CPU';
  if(scanOptions.symbols){
  const ort=await import('onnxruntime-web/webgpu');ort.env.wasm.wasmPaths='/ort/';ort.env.wasm.numThreads=1;
  post('progress',{progress:2,message:'Loading trained fixture model (12 MB)…'});
  const [response,labels]=await Promise.all([fetch('/models/floorcad-yolov8n.onnx',{signal:AbortSignal.timeout(25000)}),fetch('/models/floorcad-labels.json').then(r=>{if(!r.ok)throw new Error('Model labels unavailable');return r.json();})]);
  if(!response.ok)throw new Error('Fixture model unavailable ('+response.status+'). No substitute counts inserted.');
  const bytes=await response.arrayBuffer();
  try{if(!navigator.gpu)throw new Error('WebGPU unavailable');session=await ort.InferenceSession.create(bytes,{executionProviders:['webgpu']});backend='WebGPU';}
  catch(e){post('warning',{message:'Fixture detector is using WASM CPU: '+e.message});session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm']});backend='WASM CPU';}
  const size=scanOptions.tileSize||320,threshold=scanOptions.threshold||.35;
  const jobs=tiles(rect.width,rect.height,size,Math.round(size*.2));if(jobs.length>96)throw new Error('More than 96 scan tiles. Select a smaller analysis region.');
  const tileCanvas=new OffscreenCanvas(640,640),tc=tileCanvas.getContext('2d',{willReadFrequently:true});let boxes=[];
  for(let j=0;j<jobs.length;j++){
   if(performance.now()-start>150000)throw new Error('Scan exceeded the 150-second analysis budget. Select a smaller area. Existing quantities are preserved.');
   const tile=jobs[j],x=rect.x+tile.x,y=rect.y+tile.y,ratio=640/size;
   post('progress',{progress:8+Math.round(j/jobs.length*67),message:`${backend} · fixture tile ${j+1} / ${jobs.length}`,backend:'Scan AI · '+backend});
   tc.fillStyle='rgb(114,114,114)';tc.fillRect(0,0,640,640);tc.drawImage(source,x,y,tile.width,tile.height,0,0,tile.width*ratio,tile.height*ratio);
   const px=tc.getImageData(0,0,640,640).data,input=new Float32Array(3*640*640);
   for(let i=0;i<640*640;i++)for(let c=0;c<3;c++)input[c*640*640+i]=px[i*4+c]/255;
   const tensor=new ort.Tensor('float32',input,[1,3,640,640]);
   try{const output=await session.run({[session.inputNames[0]]:tensor});try{
    const t=output[session.outputNames[0]];
    boxes.push(...decodeYolo(t.data,t.dims,labels,{x:0,y:0},threshold).filter(b=>FIXTURE_NAMES[b.label]).map(b=>({...b,x:x+b.x/ratio,y:y+b.y/ratio,w:b.w/ratio,h:b.h/ratio,rawLabel:b.label,label:FIXTURE_NAMES[b.label]})).filter(b=>b.x>=x&&b.y>=y&&b.x<x+tile.width&&b.y<y+tile.height));
   }finally{for(const t of Object.values(output))t.dispose();}}finally{tensor.dispose();}
  }
  points=suppressBoxes(boxes).map(p=>({...p,analysis:{method:'Experimental FloorCAD YOLOv8n · raster symbol detection',classification:p.label,evidence:`The trained model recognized a "${p.rawLabel}" shape in image pixels. ${size}-pixel overlapping crops enlarged to 640; cross-tile overlapping boxes removed. Runtime: ${backend}.`,confidence:`Model score ${p.score.toFixed(3)}; cutoff ${threshold} (not calibrated accuracy)`,limitations:'This model failed our HSU scan test: high false positives and missed fixtures. Experimental only. It does not distinguish new/existing equipment, read sizes, or detect all plumbing accessories.',box:{x:p.x-p.w/2,y:p.y-p.h/2,width:p.w,height:p.h}}}));
  }
  if(scanOptions.ocr){
   post('progress',{progress:78,message:'Reading fixture tags with neural OCR…'});
   const {createWorker,PSM}=await import('tesseract.js');
   ocr=await createWorker('eng',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/models/ocr',workerBlobURL:false});
   await ocr.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT});
   const jobs=tiles(rect.width,rect.height,720,120),words=[];
   for(let i=0;i<jobs.length;i++){
    if(performance.now()-start>150000)throw new Error('OCR exceeded its work budget. Select a smaller analysis area.');
    const t=jobs[i],x=rect.x+t.x,y=rect.y+t.y;
    post('progress',{progress:(scanOptions.symbols?78:10)+Math.round(i/jobs.length*(scanOptions.symbols?19:87)),message:`Neural OCR · crop ${i+1} / ${jobs.length}`,backend});
    const canvas=new OffscreenCanvas(t.width*3,t.height*3),context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,x,y,t.width,t.height,0,0,canvas.width,canvas.height);
    const image=context.getImageData(0,0,canvas.width,canvas.height);for(let p=0;p<image.data.length;p+=4){const v=.299*image.data[p]+.587*image.data[p+1]+.114*image.data[p+2]>170?255:0;image.data[p]=image.data[p+1]=image.data[p+2]=v;}context.putImageData(image,0,0);
    const blob=await canvas.convertToBlob({type:'image/png'}),result=await ocr.recognize(new Uint8Array(await blob.arrayBuffer()),{}, {blocks:true});
    words.push(...(result.data.blocks||[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words))).map(w=>({...w,bbox:{x0:w.bbox.x0/3+x,y0:w.bbox.y0/3+y,x1:w.bbox.x1/3+x,y1:w.bbox.y1/3+y}})));
   }
   points=mergeOcr(points,words,parseLegend(scanOptions.legend));
  }
  post('done',{points,runs:[],backend:'Scan AI · '+backend+(scanOptions.symbols&&scanOptions.ocr?' + OCR':''),elapsed:(performance.now()-start)/1000,warning:(scanOptions.symbols?'Experimental symbol model: failed our scan accuracy test. ':'')+'Tag candidates require review and relocation to symbols. Unmapped tags need a legend. Pipe length remains unmeasured until you use Trace assist or Length. Check missed accessories, existing equipment, notes and duplicate views.'});
 }catch(e){post('error',{message:'Scan analysis failed: '+e.message});}
 finally{await ocr?.terminate();await session?.release();}
};
