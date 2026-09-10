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
app.get('/api/status',(_,res)=>res.json({google:!!process.env.GOOGLE_MAPS_API_KEY,website:true,social:false,ai:false,sending:false}));
app.post('/api/search',async(req,res)=>{
  if(!process.env.GOOGLE_MAPS_API_KEY)return res.status(503).json({code:'GOOGLE_NOT_CONFIGURED'});
  const {query,polygon,lang='zh-CN'}=req.body;
  if(typeof query!=='string'||!query.trim()||query.length>200||!Array.isArray(polygon)||polygon.length<3||polygon.length>100||polygon.some(p=>!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>90||Math.abs(p[1])>180))return res.status(400).json({code:'INVALID_REGION'});
  const lat=polygon.map(p=>p[0]),lng=polygon.map(p=>p[1]);
  try{const r=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json','X-Goog-Api-Key':process.env.GOOGLE_MAPS_API_KEY,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.googleMapsUri,places.businessStatus'},body:JSON.stringify({textQuery:query,languageCode:lang,pageSize:20,locationRestriction:{rectangle:{low:{latitude:Math.min(...lat),longitude:Math.min(...lng)},high:{latitude:Math.max(...lat),longitude:Math.max(...lng)}}}})});
    if(!r.ok)return res.status(502).json({code:'GOOGLE_REQUEST_FAILED',upstreamStatus:r.status});
    const data=await r.json();res.json({places:(data.places||[]).map(p=>({id:p.id,name:p.displayName?.text,address:p.formattedAddress,lat:p.location?.latitude,lng:p.location?.longitude,website:p.websiteUri,maps:p.googleMapsUri})),limited:true,collectedAt:new Date().toISOString()});
  }catch{res.status(502).json({code:'COLLECTION_FAILED'});}
});
// Pin a public IPv4 DNS result when fetching a business website; never follow redirects.
function publicIPv4(ip){if(isIP(ip)!==4)return false;const [a,b]=ip.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19));}
async function readWebsite(raw){const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443')throw Error('URL');const ips=await lookup(url.hostname,{all:true,family:4});const address=ips.find(x=>publicIPv4(x.address));if(!address)throw Error('DNS');
  return new Promise((resolve,reject)=>{const req=https.get(url,{lookup:(_h,opts,cb)=>opts?.all?cb(null,[address]):cb(null,address.address,4),headers:{'User-Agent':'TentGrowth/0.1 (+business-public-link-discovery)','Accept':'text/html'}},r=>{if(r.statusCode!==200||!r.headers['content-type']?.includes('text/html')){r.resume();reject(Error('RESPONSE'));return;}let body='';let bytes=0;r.on('data',chunk=>{bytes+=chunk.length;if(bytes>1500000){req.destroy(Error('TOO_LARGE'));return;}body+=chunk.toString();});r.on('end',()=>resolve(body));});req.setTimeout(12000,()=>req.destroy(Error('TIMEOUT')));req.on('error',reject);});
}
app.post('/api/enrich',async(req,res)=>{const website=req.body.website;if(typeof website!=='string'||website.length>2000)return res.status(400).json({code:'NO_WEBSITE'});
  try{const html=await readWebsite(website);const platforms=[['facebook.com','Facebook'],['instagram.com','Instagram'],['linkedin.com','LinkedIn'],['youtube.com','YouTube'],['tiktok.com','TikTok']];const links=[];const re=/href\s*=\s*["']([^"']+)["']/gi;let m;
    while((m=re.exec(html))){try{const url=new URL(m[1].replaceAll('&amp;','&'),website);if(url.protocol!=='https:')continue;const platform=platforms.find(([host])=>url.hostname===host||url.hostname.endsWith('.'+host));if(platform&&!links.some(l=>l.url===url.href))links.push({id:'social-'+links.length,platform:platform[1],url:url.href,source:'web',confirmed:true,evidence:['商家官网直接链接；账号归属需进一步核验','Linked by business website; account ownership needs further checks']});}catch{}}
    res.json({links:links.slice(0,20),source:website,collectedAt:new Date().toISOString(),scope:'website_links_only'});
  }catch{res.status(502).json({code:'WEBSITE_UNAVAILABLE'});}
});
app.use('/api',(_,res)=>res.status(404).json({code:'NOT_FOUND'}));
if(process.argv.includes('--production')){app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(_,res)=>res.sendFile(path.join(root,'dist/index.html')));}else{const vite=await createViteServer({root,server:{middlewareMode:true,host:'127.0.0.1'},appType:'spa'});app.use(vite.middlewares);}
app.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log('Tent Growth: http://127.0.0.1:'+(process.env.PORT||4173)));
