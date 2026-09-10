import {pageSignals} from './channel-verification.js';
import puppeteer from '@cloudflare/puppeteer';
import {publicURL,readPublicPage} from './collection-api.js';
export function browserPageError(url,html,status=200){
 if([401,403,429].includes(status)||/Error 1005|Access denied|cf-chl-|verify you are human|checking your browser/i.test(html))return 'BROWSER_ACCESS_RESTRICTED';
 if(status>=400)return 'BROWSER_HTTP_'+status;
 if(/\/accounts\/login|\/login\/?(?:\?|$)|\/checkpoint\//i.test(url)||/<title[^>]*>[^<]*(?:log\s*in|sign\s*in)/i.test(html))return 'LOGIN_REQUIRED';
 return null;
}
export function createBrowserReader(env,{direct=readPublicPage,launch=binding=>puppeteer.launch(binding)}={}){
 let browserPromise,count=0;const attempts=[];
 async function read(url){publicURL(url);try{const page=await direct(url);const signals=pageSignals(page.html,page.url);if(signals.restricted||signals.text.length<150)throw Error('DYNAMIC_PAGE');attempts.push({url,method:'http',status:'read'});return page;}catch(e){attempts.push({url,method:'http',status:'failed',code:e.message});if(!env.BROWSER)throw e;}
 if(count>=3){attempts.push({url,method:'browser',status:'deferred',code:'BROWSER_SCAN_LIMIT'});throw Error('BROWSER_SCAN_LIMIT');}count++;
 let page;try{browserPromise||=launch(env.BROWSER);const browser=await browserPromise;page=await browser.newPage();await page.setRequestInterception(true);page.on('request',request=>{try{publicURL(request.url());if(['image','media','font'].includes(request.resourceType()))return void request.abort().catch(()=>{});void request.continue().catch(()=>{});}catch{void request.abort().catch(()=>{});}});
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});let html=await page.content();let error=browserPageError(page.url(),html,response?.status()||200);if(error)throw Error(error);
 await page.waitForFunction(()=>document.body?.innerText?.length>200,{timeout:4000}).catch(()=>{});html=await page.content();publicURL(page.url());error=browserPageError(page.url(),html,response?.status()||200);if(error)throw Error(error);const finalSignals=pageSignals(html,page.url());if(finalSignals.restricted)throw Error('LOGIN_REQUIRED');if(finalSignals.text.length<150)throw Error('BROWSER_CONTENT_INCOMPLETE');if(html.length>1500000)throw Error('TOO_LARGE');
 attempts.push({url,method:'browser',status:'read',finalUrl:page.url()});return {url:page.url(),html};
 }catch(e){const code=/429|limit exceeded/i.test(e.message)?'BROWSER_QUOTA':/timeout/i.test(e.message)?'BROWSER_TIMEOUT':/^(LOGIN_REQUIRED|BROWSER_|TOO_LARGE|URL)/.test(e.message)?e.message:'BROWSER_UNAVAILABLE';attempts.push({url,method:'browser',status:'failed',code});throw Error(code);}finally{await page?.close().catch(()=>{});}
 }
 return {read,attempts,async close(){if(browserPromise)try{const browser=await browserPromise;await browser.close();}catch{}}};
}
