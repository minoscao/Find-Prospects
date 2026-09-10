import {searchPlaces} from './search-api.js';
import {collectWebsite} from './src/collection.js';
import {skillRequest} from './skill-api.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import express from 'express';
import {createServer as createViteServer} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {lookup} from 'node:dns/promises';
import https from 'node:https';
import {isIP} from 'node:net';
import {existsSync,readFileSync} from 'node:fs';
const root=path.dirname(fileURLToPath(import.meta.url));
if(existsSync(path.join(root,'.env')))for(const line of readFileSync(path.join(root,'.env'),'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'');}
const app=express();app.use(express.json({limit:'100kb'}));
app.use('/api',(req,res,next)=>{const origin=req.get('origin');if(origin&&!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))return res.status(403).json({code:'ORIGIN_REJECTED'});res.set('Cache-Control','no-store');next();});
app.post('/api/skill',async(req,res)=>{try{const store={get:async()=>{const f=path.join(root,'.private','rules.txt');return existsSync(f)?readFileSync(f,'utf8'):'';},put:async(_,value)=>{mkdirSync(path.join(root,'.private'),{recursive:true});writeFileSync(path.join(root,'.private','rules.txt'),value);}};const r=await skillRequest(new Request('http://'+req.get('host')+req.originalUrl,{method:'POST',headers:{'Content-Type':'application/json',...(req.get('origin')?{origin:req.get('origin')}:{})},body:JSON.stringify(req.body)}),process.env.SKILL_ADMIN_PASSWORD,store);res.status(r.status).json(await r.json());}catch{res.status(500).json({code:'STORAGE_ERROR'});}});
// Optional fixed deployment bridge for this local workspace.
app.use(['/api/enrich','/api/status','/api/search'],async(req,res,next)=>{
 if(!process.env.CLOUD_API_ORIGIN)return next();
 try{const base=new URL(process.env.CLOUD_API_ORIGIN);if(base.protocol!=='https:')return next();const r=await fetch(new URL(req.originalUrl,base),{method:req.method,headers:{'Content-Type':'application/json'},...(req.method==='POST'?{body:JSON.stringify(req.body)}:{}),signal:AbortSignal.timeout(90000)});res.status(r.status).json(await r.json());}catch{res.status(502).json({code:'CLOUD_CONNECTION_FAILED'});}
});
app.get('/api/status',(_,res)=>res.json({google:!!process.env.GOOGLE_MAPS_API_KEY,website:true,social:false,ai:false,sending:false}));
app.post('/api/search',async(req,res)=>{const r=await searchPlaces(req.body,process.env.GOOGLE_MAPS_API_KEY);res.status(r.status).json(r.body);});

// Pin a public IPv4 DNS result when fetching a business website; never follow redirects.
function publicIPv4(ip){if(isIP(ip)!==4)return false;const [a,b]=ip.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19));}
async function readWebsite(raw,redirects=0){const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443')throw Error('URL');const ips=await lookup(url.hostname,{all:true,family:4});const address=ips.find(x=>publicIPv4(x.address));if(!address)throw Error('DNS');
  return new Promise((resolve,reject)=>{const req=https.get(url,{lookup:(_h,opts,cb)=>opts?.all?cb(null,[address]):cb(null,address.address,4),headers:{'User-Agent':'TentGrowth/0.1 (+business-public-link-discovery)','Accept':'text/html'}},r=>{if([301,302,303,307,308].includes(r.statusCode)){r.resume();if(redirects>=3||!r.headers.location){reject(Error('REDIRECT_LIMIT'));return;}readWebsite(new URL(r.headers.location,url).href,redirects+1).then(resolve,reject);return;}if(r.statusCode!==200||!r.headers['content-type']?.includes('text/html')){r.resume();reject(Error([401,403,429].includes(r.statusCode)?'ACCESS_RESTRICTED':'HTTP_'+r.statusCode));return;}let body='';let bytes=0;r.on('data',chunk=>{bytes+=chunk.length;if(bytes>1500000){req.destroy(Error('TOO_LARGE'));return;}body+=chunk.toString();});r.on('end',()=>/Error 1005|cf-chl-|Access denied/i.test(body)?reject(Error('ACCESS_RESTRICTED')):resolve({html:body,url:url.href}));r.on('error',reject);});req.setTimeout(12000,()=>req.destroy(Error('TIMEOUT')));req.on('error',reject);});
}
app.post('/api/enrich',async(req,res)=>{const website=req.body.website;if(typeof website!=='string'||website.length>2000)return res.status(400).json({code:'NO_WEBSITE'});res.json(await collectWebsite(website,readWebsite));});
app.use('/api',(_,res)=>res.status(404).json({code:'NOT_FOUND'}));
if(process.argv.includes('--production')){app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(_,res)=>res.sendFile(path.join(root,'dist/index.html')));}else{const vite=await createViteServer({root,server:{middlewareMode:true,host:'127.0.0.1'},appType:'spa'});app.use(vite.middlewares);}
app.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('Tent Growth: http://127.0.0.1:'+(process.env.PORT||4173)));
