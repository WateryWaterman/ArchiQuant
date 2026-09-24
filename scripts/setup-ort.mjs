import {mkdir,copyFile,readdir} from 'node:fs/promises';
await mkdir('public/ort',{recursive:true});
for(const file of await readdir('node_modules/onnxruntime-web/dist'))if(/\.wasm$|^ort-wasm.*\.mjs$/.test(file))await copyFile('node_modules/onnxruntime-web/dist/'+file,'public/ort/'+file);
