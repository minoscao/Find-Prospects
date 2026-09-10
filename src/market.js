export const phases=['initial','qualified','shortlist','finalist'];
export const phaseNames=[['候选','Candidates'],['初选','Qualified'],['重点','Priority'],['跟进','Follow-up']];
export const levels={gray:['无资料','Not found'],red:['内容极少或超过一年未更新','Sparse content or inactive over a year'],orange:['内容粗糙，但有人维护','Basic content, actively maintained'],green:['团队正常维护，近一个月更新','Team maintained; updated within a month'],purple:['完整的品牌工具与运营能力','Complete brand toolkit and operations'],unknown:['待核验','Unverified']};
export function channelRating(customer,platform){
  const evidence=customer.channelRatings?.[platform];
  if(evidence && levels[evidence.level])return evidence;
  // Example ratings are explicit fixtures, never inferred from a real account link.
  if(customer.demo){const colors={Email:'gray',WhatsApp:'gray',Website:'purple',Instagram:'green',Facebook:'orange',LinkedIn:'red'};return {level:colors[platform]||'unknown',demo:true};}
  return {level:'unknown'};
}
export function projectMembers(project,customers){return customers.filter(c=>project.customerIds.includes(c.id));}
export function phaseCounts(customers){return phases.map(stage=>customers.filter(c=>c.stage===stage).length);}
export function initialProjects(customers){
  return [...new Set(customers.map(c=>c.country?.[1]||'Unassigned'))].map((country,i)=>({id:'import-'+i,product:['儿童帐篷','Children’s tents'],region:customers.find(c=>c.country?.[1]===country)?.country||['未分区','Unassigned'],createdAt:null,demo:!!customers.find(c=>c.country?.[1]===country)?.demo,customerIds:customers.filter(c=>(c.country?.[1]||'Unassigned')===country).map(c=>c.id)}));
}
