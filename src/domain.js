export const stageOrder=['initial','qualified','shortlist','finalist'];
export function pointInPolygon(point, polygon){
  if(!polygon?.length) return true;
  let inside=false;const [x,y]=point;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [xi,yi]=polygon[i], [xj,yj]=polygon[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }return inside;
}
export function nextStage(customer){
  const i=stageOrder.indexOf(customer.stage);return stageOrder[Math.min(i+1,3)];
}
export function scoreFor(c){if(!c.demo)return c.assessmentRuns?.at(-1)?.scoring?.score??null;return c.scores.reduce((a,b)=>a+b,0);}
export function counts(customers){return Object.fromEntries(stageOrder.map((s,i)=>[s,customers.filter(c=>c.stage!=='excluded'&&stageOrder.indexOf(c.stage)>=i).length]));}
export function exportPlan(c){return {schemaVersion:1,customer:{id:c.id,name:c.name,website:c.website},origin:c.demo?'demonstration':c.origin||'api',sources:c.sources,network:c.network,materialPlan:c.plan,generatedAt:new Date().toISOString()};}
