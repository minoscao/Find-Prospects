import {integrationRequest,configuredEnv} from './integrations.js';
import {createBrowserReader} from './browser-reader.js';
import {verifyChannels} from './channel-verification.js';
import {databaseRequest,authenticated} from './database-api.js';
import {completeAssessment} from './complete-assessment.js';
import {enrichWebsite} from './collection-api.js';
import {searchPlaces} from '../search-api.js';
import {skillRequest} from '../skill-api.js';
export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if(pathname === '/api/workspace'||pathname === '/api/session')return databaseRequest(request,env);
    if(env.DB&&['/api/search','/api/enrich','/api/assess','/api/verify-channels'].includes(pathname)&&!await authenticated(request,env))return Response.json({code:'UNAUTHORIZED'},{status:401});
    if(pathname === '/api/integrations')return integrationRequest(request,env);
    if(['/api/status','/api/search','/api/assess','/api/enrich'].includes(pathname)){try{env=await configuredEnv(env);}catch{return Response.json({code:'CONFIG_REQUEST_FAILED'},{status:503});}}
    if(pathname === '/api/skill')return skillRequest(request,env.SKILL_ADMIN_PASSWORD,env.SKILL_STORE,!!env.AI);
    if (pathname === '/api/status') {
      return Response.json({google:!!env.GOOGLE_MAPS_API_KEY, website:true, social:false, ai:!!env.AI, sending:false});
    }
    if(pathname === '/api/search'){
      if(request.method!=='POST')return Response.json({code:'METHOD_NOT_ALLOWED'},{status:405});
      const origin=request.headers.get('origin');
      if(origin&&origin!==new URL(request.url).origin)return Response.json({code:'ORIGIN_REJECTED'},{status:403});
      try{const text=await request.text();if(text.length>10000)return Response.json({code:'INPUT_TOO_LARGE'},{status:413});const result=await searchPlaces(JSON.parse(text),env.GOOGLE_MAPS_API_KEY);return Response.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}catch{return Response.json({code:'INVALID_REQUEST'},{status:400});}
    }
    if (pathname === '/api/enrich' || pathname === '/api/assess' || pathname === '/api/verify-channels') {
      if(request.method!=='POST')return Response.json({code:'METHOD_NOT_ALLOWED'},{status:405});
      if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({code:'ORIGIN_REJECTED'},{status:403});
      if(env.COLLECTION_LIMITER){const limit=await env.COLLECTION_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});if(!limit.success)return Response.json({code:'RATE_LIMITED'},{status:429});}
      try{const text=await request.text();if(text.length>50000)return Response.json({code:'INPUT_TOO_LARGE'},{status:413});const result=await (pathname==='/api/verify-channels'?async value=>{const reader=createBrowserReader(env);try{const result=await verifyChannels(value,reader.read);if(result.status===200)result.body.readAttempts=reader.attempts;return result;}finally{await reader.close();}}:pathname==='/api/assess'?completeAssessment:enrichWebsite)(JSON.parse(text),env);return Response.json(result.body,{status:result.status,headers:{'Cache-Control':'no-store'}});}catch{return Response.json({code:'COLLECTION_FAILED'},{status:502});}
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return Response.json({code:'NOT_FOUND'}, {status:404});
    }
    return env.ASSETS.fetch(request);
  }
};
