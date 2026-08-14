import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||8765);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8'};

http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const target=path.resolve(root,relative);
  if(!target.startsWith(`${root}${path.sep}`)&&target!==path.join(root,'index.html')){response.writeHead(403);response.end('Forbidden');return;}
  fs.readFile(target,(error,data)=>{
    if(error){response.writeHead(error.code==='ENOENT'?404:500);response.end('Not found');return;}
    response.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});response.end(data);
  });
}).listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}/`));
