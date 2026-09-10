// Public website evidence only. No social activity or buying intent is inferred.
export function extractPage(html,url){
 const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
 const text=clean(html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,''));
 const title=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||new URL(url).hostname);
 const links=[],pages=[];
 for(const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)){
  try{const u=new URL(m[1].replaceAll('&amp;','&'),url);let platform;
   if(u.protocol==='mailto:'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decodeURIComponent(u.pathname)))platform='Email';
   else if(u.protocol==='tel:')platform='Phone';
   else if(u.protocol==='https:'){
    platform=[['facebook.com','Facebook'],['instagram.com','Instagram'],['linkedin.com','LinkedIn'],['youtube.com','YouTube'],['tiktok.com','TikTok'],['wa.me','WhatsApp'],['api.whatsapp.com','WhatsApp']].find(([h])=>u.hostname===h||u.hostname.endsWith('.'+h))?.[1];
    if(u.origin===new URL(url).origin&&/contact|about|parties|birthday|catalog/i.test(u.pathname)&&!pages.includes(u.href))pages.push(u.href);
   }
   if(platform&&!links.some(l=>l.url===u.href))links.push({platform,url:u.href,source:'auto-website',sourceUrl:url,confirmed:true,evidence:['官网直接列出的联系方式或账号；归属与可达性待核验','Listed directly on the website; ownership and reachability unverified']});
  }catch{}
 }
 return {title,text:text.slice(0,1600),links:links.slice(0,30),pages:pages.slice(0,2)};
}
export async function collectWebsite(website,read){
 const collectedAt=new Date().toISOString(),pages=[],links=[],failures=[];
 const queue=[website];
 for(let i=0;i<queue.length&&i<3;i++){
  const url=queue[i];
  try{const result=await read(url);const p=extractPage(result.html,result.url);pages.push({url:result.url,title:p.title,text:p.text,collectedAt});for(const l of p.links)if(!links.some(x=>x.url===l.url))links.push({...l,id:'auto-'+links.length,collectedAt});if(i===0)queue.push(...p.pages.filter(x=>x!==result.url));}
  catch(e){failures.push({url,code:e.message||'UNAVAILABLE'});}
 }
 return {collectedAt,pages,links,failures,status:pages.length?(failures.length?'partial':'complete'):'failed',scope:'public_website_pages',ratingStatus:'unverified'};
}
export function mergeCollection(customer,result){
 const network=[...(customer.network||[])];
 for(const link of result.links||[])if(!network.some(n=>n.url===link.url))network.push({...link,id:'collected-'+encodeURIComponent(link.url)});
 const sources=[...(customer.sources||[])];
 for(const p of result.pages||[]){const record={title:[p.title,p.title],text:[p.text,p.text],url:p.url,collectedAt:p.collectedAt,origin:'auto-website'};const i=sources.findIndex(s=>s.origin==='auto-website'&&s.url===p.url);if(i<0)sources.push(record);else sources[i]=record;}
 return {network,sources,collection:result,...(result.pages?.length?{lastCollected:result.collectedAt}:{})};
}
