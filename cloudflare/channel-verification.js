import {extractPage,collectWebsite} from '../src/collection.js';
import {readPublicPage,publicURL} from './collection-api.js';
const platforms=['Website','Email','WhatsApp','Instagram','Facebook','LinkedIn'];
const sameHost=(a,b)=>{try{return new URL(a).hostname.replace(/^www\./,'')===new URL(b).hostname.replace(/^www\./,'');}catch{return false;}};
const accountKey=u=>{try{const x=new URL(u);return x.hostname.replace(/^www\./,'')+x.pathname.replace(/\/$/,'').toLowerCase();}catch{return '';}};
export function pageSignals(html,url,now=Date.now(),ownerUrl=url){
 const p=extractPage(html,url),links=[];for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){try{const u=new URL(m[1].replaceAll('&amp;','&'),url);if(u.protocol==='https:')links.push({url:u.href,label:m[2].replace(/<[^>]*>/g,' ').trim()});}catch{}}
 const activities=[];let identity=false;
 const visit=v=>{if(!v||typeof v!=='object')return;if(Array.isArray(v)){v.forEach(visit);return;}const types=[v['@type']].flat();if(types.some(t=>['Organization','LocalBusiness','Store'].includes(t))&&v.name&&v.logo)identity=true;
 if(types.some(t=>['SocialMediaPosting','BlogPosting','Article','NewsArticle','VideoObject'].includes(t))){const itemUrl=v.url||v.mainEntityOfPage?.['@id'];const author=[v.author].flat().filter(Boolean);const attributable=author.some(a=>[a.url,...[a.sameAs||[]].flat()].some(u=>accountKey(u)===accountKey(ownerUrl)))||(ownerUrl===url&&itemUrl&&accountKey(itemUrl)===accountKey(url)&&sameHost(itemUrl,url));const date=Date.parse(v.datePublished||v.uploadDate);if(attributable&&Number.isFinite(date)&&date<=now&&date>0)activities.push({date:new Date(date).toISOString(),url:itemUrl||url});}
 Object.values(v).forEach(x=>{if(typeof x==='object')visit(x);});};
 for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{visit(JSON.parse(m[1]));}catch{}}
 const toolkit={};for(const l of links.filter(x=>sameHost(x.url,url))){const x=new URL(l.url).pathname+' '+l.label;for(const [key,re] of Object.entries({catalog:/\b(shop|catalog|products|collections|services)\b/i,contact:/\b(contact|enquir|consult)/i,booking:/\b(book|booking|reservation|checkout|cart)\b/i,policies:/\b(privacy|terms|returns|refund)\b/i}))if(re.test(x)&&!toolkit[key])toolkit[key]=l.url;}
 const restricted=/\/accounts\/login|\/login\/?(?:\?|$)|\/checkpoint\//i.test(url)||/log in to (?:continue|see)|login to (?:continue|see)|sign in to (?:continue|see)|verify you are human/i.test(p.text)||(/enable javascript/i.test(p.text)&&p.text.length<350);
 return {...p,url,links,identity,activities:[...new Map(activities.map(x=>[x.url+'|'+x.date,x])).values()],toolkit,restricted};
}
export function rateSignals(signals,platform,owned){
 const unknown={level:'unknown',reason:['公开内容不足以评定运营成熟度','Insufficient public evidence for operational maturity']};
 if(!owned||!signals.length||signals.some(s=>s.restricted))return unknown;
 const activities=[...new Map(signals.flatMap(s=>s.activities).map(a=>[a.url+'|'+a.date,a])).values()];
 const recent=activities.filter(a=>Date.now()-Date.parse(a.date)<=30*86400000);const substantial=signals.some(s=>s.text.length>=500);
 // A toolkit rating requires the linked destination pages to have actually been read.
 const toolkit=Object.assign({},...signals.map(s=>s.toolkit));const verifiedTools=Object.entries(toolkit).filter(([,url])=>signals.some(s=>accountKey(s.url)===accountKey(url)&&s.text.length>=200));
 if(platform==='Website'&&signals.some(s=>s.identity)&&verifiedTools.length===4&&substantial)return {level:'purple',reason:['已读取品牌标识、产品/服务、联系、订购及政策页面，具备完整公开营销工具；不代表已确认团队规模或采购意向','Read brand identity, catalog, contact, ordering and policy pages; public marketing toolkit confirmed, not team size or buying intent']};
 if(recent.length>=2&&substantial)return {level:'green',reason:['读取到至少两条可归属于此渠道的近30天发布内容，且公开内容较完整；维护团队人数未核实','At least two attributable publications within 30 days and substantial public content; team size unverified']};
 if(recent.length>=2)return {level:'orange',reason:['有至少两条近30天内容，但本轮可读取的内容较有限','At least two recent publications, with limited readable content']};
 return {...unknown,reason:[`已读取内容，但缺少足够的近期更新或完整工具证据；不将旧文章视为停更证明`,`Content read, but recent activity or toolkit evidence is insufficient; an old article does not prove inactivity`]};
}
export async function verifyChannels(input,read=readPublicPage){
 if(typeof input.website!=='string'||input.website.length>2000)return {status:400,body:{code:'NO_WEBSITE'}};try{publicURL(input.website);}catch{return {status:400,body:{code:'INVALID_WEBSITE'}};}
 const signals=[];const result=await collectWebsite(input.website,async url=>{const page=await read(url);if(!sameHost(page.url,input.website))throw Error('DOMAIN_CHANGED');const s=pageSignals(page.html,page.url);if(s.restricted)throw Error('ACCESS_RESTRICTED');signals.push(s);return page;});
 // Read up to three missing business-tool destinations, not merely the link labels.
 const extra=[...new Set(signals.flatMap(s=>Object.values(s.toolkit)))].filter(url=>!signals.some(s=>accountKey(s.url)===accountKey(url))).slice(0,3);
 await Promise.all(extra.map(async url=>{try{const page=await read(url);const s=pageSignals(page.html,page.url);if(s.restricted)throw Error('ACCESS_RESTRICTED');signals.push(s);result.pages.push({url:s.url,title:s.title,text:s.text,collectedAt:result.collectedAt});for(const l of extractPage(page.html,page.url).links)if(!result.links.some(x=>x.url===l.url))result.links.push(l);}catch(e){result.failures.push({url,code:e.message||'UNAVAILABLE'});}}));
 result.links=result.links.filter(l=>!['Instagram','Facebook','LinkedIn'].includes(l.platform)||!/^\/(?:share|sharer|sharer.php|intent|p|reel|reels)\b/i.test(new URL(l.url).pathname));
 const verifiedAt=new Date().toISOString(),checks=[],postJobs=[];
 for(const platform of platforms){const urls=platform==='Website'?[input.website]:[...new Map(result.links.filter(l=>l.platform===platform).map(l=>[accountKey(l.url)||l.url,l.url])).values()].slice(0,2);
 if(!urls.length){checks.push({platform,level:'unknown',ownership:'unconfirmed',access:'not_discovered',reason:['本轮官网未发现此渠道；不等于客户没有该渠道','Not found in this website scan; this does not prove absence'],updatedAt:verifiedAt,method:'automatic'});continue;}
 for(const url of urls){const officialLink=result.links.find(l=>l.platform===platform&&l.url===url);let pages=platform==='Website'?signals:[],access=pages.length?'read':'unread',failure;
 if(platform==='Website'&&!pages.length){failure=result.failures[0]?.code;access='restricted';}
 if(platform==='Email'||platform==='WhatsApp'){access='listed_not_tested';}
 else if(platform!=='Website'){try{const p=await read(url),s=pageSignals(p.html,p.url);if(s.restricted||accountKey(p.url)!==accountKey(url))throw Error('ACCESS_RESTRICTED');pages=[s];access='read';result.pages.push({url:s.url,title:s.title,text:s.text,collectedAt:verifiedAt});}catch(e){access='restricted';failure=e.message||'UNAVAILABLE';}}
  const owned=platform==='Website'?signals.length>0:!!officialLink;const rating=rateSignals(pages,platform,owned);checks.push({platform,url,...rating,ownership:owned?'official_link':'unconfirmed',access,failure,updatedAt:verifiedAt,source:officialLink?.sourceUrl||url,sourceUrls:pages.map(p=>p.url),latestObservedPublication:pages.flatMap(p=>p.activities).map(a=>a.date).sort().at(-1)||null,contactability:'not_tested',method:'automatic',ruleVersion:'public-channel-evidence-v1'});
 if(access==='read'&&['Instagram','Facebook'].includes(platform))postJobs.push({pages,url,platform,check:checks.at(-1)});
 }
 }
 for(const job of postJobs){const {pages,url,platform,check}=job;
 {
 const postURLs=[...new Set(pages.flatMap(s=>s.links).filter(l=>sameHost(l.url,url)&&/\/(?:p|reel|posts)\//.test(new URL(l.url).pathname)).map(l=>l.url))].slice(0,2);
 for(const postUrl of postURLs){try{const post=await read(postUrl),s=pageSignals(post.html,post.url,Date.now(),url);if(s.restricted)throw Error('LOGIN_REQUIRED');pages.push(s);result.pages.push({url:s.url,title:s.title,text:s.text,collectedAt:verifiedAt});}catch(e){result.failures.push({url:postUrl,code:e.message||'UNAVAILABLE'});}}
 }

 Object.assign(check,rateSignals(pages,platform,true),{sourceUrls:pages.map(p=>p.url),latestObservedPublication:pages.flatMap(p=>p.activities).map(a=>a.date).sort().at(-1)||null});
 }
 result.status=result.pages.length?(result.failures.length?'partial':'complete'):'failed';
 return {status:200,body:{customerId:input.id,verifiedAt,nextCheckAt:new Date(Date.now()+(result.status==='complete'&&!checks.some(c=>c.access==='restricted')?7*86400000:3600000)).toISOString(),checks,collection:result}};
}
