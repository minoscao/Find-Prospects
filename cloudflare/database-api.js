const children={sources:'evidence',network:'channels',contacts:'contacts',assessmentRuns:'assessments',notes:'followups'};
export function validateWorkspace(d){
 if(!Number.isInteger(d.revision)||d.revision<0||!Array.isArray(d.customers)||!Array.isArray(d.projects)||!Array.isArray(d.drafts))return false;
 const ids=new Set();for(const c of d.customers){if(!c||typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.name!=='string')return false;ids.add(c.id);for(const key of Object.keys(children))if(c[key]!==undefined&&!Array.isArray(c[key]))return false;}
 const projects=new Set();for(const p of d.projects){if(!p||typeof p.id!=='string'||projects.has(p.id)||!Array.isArray(p.customerIds)||p.customerIds.some(id=>!ids.has(id)))return false;projects.add(p.id);}
 return d.drafts.every(x=>x&&typeof x.id==='string'&&ids.has(x.customerId))&&new Set(d.drafts.map(x=>x.id)).size===d.drafts.length;
}
export async function readWorkspace(db){
 const tables=['workspace_revision','customers','projects','project_customers',...Object.values(children),'material_briefs','drafts'];
 const results=await db.batch(tables.map(t=>db.prepare(`SELECT * FROM ${t}`)));
 const rows=Object.fromEntries(tables.map((t,i)=>[t,results[i].results]));
 const customers=rows.customers.map(r=>({...JSON.parse(r.data),id:r.id,name:r.name,website:r.website}));const byId=new Map(customers.map(c=>[c.id,c]));
 for(const [key,table] of Object.entries(children)){for(const c of customers)c[key]=[];for(const row of rows[table].sort((a,b)=>a.position-b.position))byId.get(row.customer_id)[key].push(JSON.parse(row.data));}
 for(const row of rows.material_briefs)byId.get(row.customer_id).plan=JSON.parse(row.data);
 return {revision:rows.workspace_revision[0].revision,customers,projects:rows.projects.map(p=>({...JSON.parse(p.data),id:p.id,customerIds:rows.project_customers.filter(x=>x.project_id===p.id).map(x=>x.customer_id)})),drafts:rows.drafts.map(r=>JSON.parse(r.data))};
}
export async function writeWorkspace(db,d){
 const q=(sql,...args)=>db.prepare(sql).bind(...args),json=JSON.stringify;
 const statements=[q('INSERT INTO write_guard(ok) SELECT CASE WHEN revision=? THEN 1 ELSE 0 END FROM workspace_revision WHERE id=1',d.revision)];
 for(const table of ['drafts','project_customers','projects','products',...Object.values(children),'material_briefs','customers'])statements.push(db.prepare(`DELETE FROM ${table}`));

 const rows={customers:[],products:[],projects:[],project_customers:[],evidence:[],channels:[],contacts:[],assessments:[],followups:[],material_briefs:[],drafts:[]};
 for(const c of d.customers){const core={...c};for(const key of [...Object.keys(children),'plan','id','name','website'])delete core[key];rows.customers.push([c.id,c.name,c.website||'',json(core)]);
 for(const [key,table] of Object.entries(children))(c[key]||[]).forEach((v,i)=>{rows[table].push(table==='evidence'?[c.id,i,v.url||null,json(v)]:table==='assessments'?[c.id,i,v.ruleVersion||null,v.generatedAt||null,json(v)]:[c.id,i,json(v)]);});
 if(c.plan)rows.material_briefs.push([c.id,json(c.plan)]);
 }
 const products=new Set();for(const p of d.projects){const product=json(p.product||'');if(!products.has(product)){products.add(product);rows.products.push([product,product]);}const data={...p};delete data.customerIds;delete data.id;rows.projects.push([p.id,product,json(data)]);for(const id of new Set(p.customerIds))rows.project_customers.push([p.id,id]);}
 for(const dft of d.drafts)rows.drafts.push([dft.id,dft.customerId,json(dft)]);
 for(const [table,values] of Object.entries(rows))if(values.length)statements.push(q('INSERT INTO '+table+' SELECT '+values[0].map((_,i)=>"json_extract(value, '$["+i+"]')").join(',')+' FROM json_each(?)',json(values)));

 statements.push(db.prepare('DELETE FROM write_guard'),db.prepare('UPDATE workspace_revision SET revision=revision+1 WHERE id=1'));
 await db.batch(statements);return d.revision+1;
}
const reply=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const enc=new TextEncoder();
async function signature(value,secret){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function authenticated(request,env){const token=request.headers.get('cookie')?.match(/(?:^|;\s*)fp_session=([^;]+)/)?.[1];if(!token||!env.SKILL_ADMIN_PASSWORD)return false;const [expires,sig]=token.split('.');return Number(expires)>Date.now()&&sig===await signature(expires,env.SKILL_ADMIN_PASSWORD);}
export async function databaseRequest(request,env){
 if(!env.DB||!env.SKILL_ADMIN_PASSWORD)return reply({code:'DATABASE_UNAVAILABLE'},503);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({code:'FORBIDDEN'},403);
 const path=new URL(request.url).pathname;
 if(path==='/api/session'&&request.method==='POST'){
 if(env.COLLECTION_LIMITER&&!((await env.COLLECTION_LIMITER.limit({key:'login:'+request.headers.get('CF-Connecting-IP')})).success))return reply({code:'RATE_LIMITED'},429);
 let d;try{d=await request.json();}catch{return reply({code:'INVALID_REQUEST'},400);}
 if(typeof d.password!=='string'||d.password.length>256||await signature(d.password,'password-check')!==await signature(env.SKILL_ADMIN_PASSWORD,'password-check'))return reply({code:'UNAUTHORIZED'},401);
 const expires=String(Date.now()+86400000);return reply({ok:true},200,{'Set-Cookie':`fp_session=${expires}.${await signature(expires,env.SKILL_ADMIN_PASSWORD)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`});
 }
 if(!await authenticated(request,env))return reply({code:'UNAUTHORIZED'},401);
 if(path==='/api/session'&&request.method==='DELETE')return reply({ok:true},200,{'Set-Cookie':'fp_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
 if(request.method==='GET')return reply(await readWorkspace(env.DB));
 if(request.method!=='PUT')return reply({code:'METHOD_NOT_ALLOWED'},405);
 let d;try{const text=await request.text();if(text.length>4000000)return reply({code:'INPUT_TOO_LARGE'},413);d=JSON.parse(text);if(!validateWorkspace(d))return reply({code:'INVALID_WORKSPACE'},400);}catch{return reply({code:'INVALID_REQUEST'},400);}
 try{return reply({revision:await writeWorkspace(env.DB,d)});}catch(e){if(String(e).includes('CHECK constraint failed'))return reply({code:'REVISION_CONFLICT'},409);return reply({code:'DATABASE_WRITE_FAILED'},500);}
}
