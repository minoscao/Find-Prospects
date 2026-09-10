import records from './dubai-prospects.json' with {type:'json'};
const projectId='dubai-skill-partners-20260910';
function matches(c,r){if(c.demo)return false;if(c.id===r.id)return true;try{return new URL(c.website).hostname.replace(/^www\./,'')===new URL(r.sources[0].url).hostname.replace(/^www\./,'');}catch{return c.name===r.name;}}
export function mergeDubaiCustomers(customers){
 const result=[...customers];
 for(const r of records){const website=new URL(r.sources[0].url).origin+'/';const incoming={id:r.id,name:r.name,website,country:['阿联酋 · 迪拜服务范围','UAE · Serving Dubai'],area:[r.role,r.role],type:[r.role.split('；')[0],r.role.split('；')[0]],stage:'initial',demo:false,origin:'public-research',reviewedAt:r.reviewedAt,status:'uncontacted',notes:[],memo:'',tags:'',reason:[r.priority+'：'+r.fit,r.priority+'：'+r.fit],contacts:[{type:'Public contact',value:r.contact,source:r.sources[({'dubai-totally-teepee':2,'dubai-hafla':1,'dubai-ritz-jbr':1})[r.id]||0].url,verified:false}],sources:r.sources.map((s,i)=>({title:[s.title,s.title],text:[i===0?r.fact:'参考来源：'+s.title,i===0?r.fact:'Reference: '+s.title],url:s.url,evidenceId:s.evidence_id})),network:[{id:'web',platform:'Website',url:website,confirmed:true,evidence:['本轮官网研究；运营成熟度待核验','Website research; maturity unverified']}],research:{concern:[r.risk,r.risk],proposal:[r.brief,r.brief],questions:[r.question]},plan:{keywords:'',brief:r.brief,items:[],saved:false},skillResearch:r};
 const i=result.findIndex(c=>matches(c,r));if(i<0)result.push(incoming);else result[i]={...incoming,...result[i],skillResearch:result[i].skillResearch||r};
 }return result;
}
export function mergeDubaiProject(projects,customers){
 const old=projects.find(p=>p.id===projectId);if(old?.deleted)return projects;
 const ids=records.map(r=>customers.find(c=>matches(c,r))?.id).filter(Boolean);
 if(old)return projects.map(p=>p.id===projectId?{...p,customerIds:[...new Set([...p.customerIds,...ids])]}:p);
 return [...projects,{id:projectId,product:['儿童帐篷','Children’s tents'],region:['迪拜 · Skill 合作商调查','Dubai · Skill prospect research'],createdAt:'2026-09-10T00:00:00Z',demo:false,origin:'public-research',customerIds:ids}];
}
