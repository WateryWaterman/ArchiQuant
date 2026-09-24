import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm','.onnx':'application/octet-stream','.pdf':'application/pdf'};
const server = http.createServer(async (req,res) => {
  if(req.url === '/health') {res.writeHead(200,{'Content-Type':'application/json'}); return res.end('{"status":"ok"}');}
  if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405);return res.end('Uploads stay in your browser.');}
  try {
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep)) {res.writeHead(403);return res.end();}
    const info=await stat(file);if(!info.isFile()) throw new Error('not found');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':info.size,'X-Content-Type-Options':'nosniff','Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'});
    if(req.method==='HEAD')return res.end();createReadStream(file).pipe(res);
  } catch {res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('ArchiQuant ready on port '+(process.env.PORT||3000)));
