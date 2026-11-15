import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const args=process.argv.slice(2);
const flag=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
const port=Number(flag('--port')||process.env.PORT||(args[0]&&!args[0].startsWith('--')?args[0]:4173));
const host=flag('--host')||'127.0.0.1';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
 try {
   const url=new URL(req.url,'http://localhost');
   let path=resolve(root,'.'+decodeURIComponent(url.pathname));
   if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
   if((await stat(path)).isDirectory()){
     if(!url.pathname.endsWith('/')){res.writeHead(308,{Location:url.pathname+'/'+url.search}).end();return;}
     path=resolve(path,'index.html');
   }
   const bytes=await readFile(path);
   res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});
   res.end(req.method==='HEAD'?undefined:bytes);
 } catch {res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'}).end(await readFile(resolve(root,'404.html')).catch(()=> '404'));}
}).listen(port,host,()=>console.log('http://localhost:'+port));
