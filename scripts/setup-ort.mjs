import {mkdir,copyFile,readdir} from 'node:fs/promises';
await mkdir('public/ort',{recursive:true});
for(const file of await readdir('node_modules/onnxruntime-web/dist'))if(/\.wasm$|^ort-wasm.*\.mjs$/.test(file))await copyFile('node_modules/onnxruntime-web/dist/'+file,'public/ort/'+file);
await mkdir('public/ocr',{recursive:true});
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
for(const file of await readdir('node_modules/tesseract.js-core'))if(/\.wasm(?:\.js)?$/.test(file))await copyFile('node_modules/tesseract.js-core/'+file,'public/ocr/'+file);
