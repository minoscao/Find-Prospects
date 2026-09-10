export async function skillRequest(request, password, store, modelConnected=false){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply({code:'METHOD_NOT_ALLOWED'},405);
 if(!password||!store)return reply({code:'SKILL_NOT_CONFIGURED'},503);
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return reply({code:'FORBIDDEN'},403);
 let body;try{body=await request.json();}catch{return reply({code:'INVALID_REQUEST'},400);}
 if(typeof body.password!=='string'||body.password.length>256)return reply({code:'UNAUTHORIZED'},401);
 const digest=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 const [a,b]=await Promise.all([digest(body.password),digest(password)]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 if(diff)return reply({code:'UNAUTHORIZED'},401);
 if(body.action==='save'){
  if(typeof body.rules!=='string'||body.rules.length>30000)return reply({code:'INVALID_RULES'},400);
  await store.put('rules',body.rules);
 }else if(body.action!=='read')return reply({code:'INVALID_ACTION'},400);
 return reply({rules:await store.get('rules')||'',modelConnected});
}
