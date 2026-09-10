import test from 'node:test';
import assert from 'node:assert/strict';
import {channelRating,initialProjects,phaseCounts,projectMembers} from '../src/market.js';
import {skillRequest} from '../skill-api.js';
test('real linked accounts remain unverified until evidence is assessed',()=>{
 assert.equal(channelRating({demo:false,network:[{platform:'Website',confirmed:true}]},'Website').level,'unknown');
 assert.equal(channelRating({channelRatings:{Website:{level:'purple',reason:'Audited'}}},'Website').level,'purple');
});
test('project membership and exact stage counts preserve imported customers',()=>{
 const customers=[{id:'a',country:['英国','UK'],stage:'initial'},{id:'b',country:['英国','UK'],stage:'shortlist'},{id:'c',country:['德国','DE'],stage:'excluded'}];
 const projects=initialProjects(customers);assert.equal(projects.length,2);
 assert.deepEqual(phaseCounts(projectMembers(projects[0],customers)),[1,0,1,0]);
 assert.equal(projects[0].createdAt,null);
});
test('skill rules require authentication for both reads and writes',async()=>{
 let rules='private';const store={get:async()=>rules,put:async(_,v)=>{rules=v;}};
 const req=body=>new Request('https://example.com/api/skill',{method:'POST',body:JSON.stringify(body)});
 assert.equal((await skillRequest(req({password:'wrong',action:'save',rules:'changed'}),'test-secret',store)).status,401);
 assert.equal(rules,'private');
 assert.equal((await skillRequest(req({password:'test-secret',action:'read'}),null,store)).status,503);
 const saved=await skillRequest(req({password:'test-secret',action:'save',rules:'agreed rules'}),'test-secret',store);
 assert.equal(saved.headers.get('cache-control'),'no-store');assert.match((await saved.json()).rules,/^agreed rules[\s\S]*<scoring-config>/);
 const read=await skillRequest(req({password:'test-secret',action:'read'}),'test-secret',store);assert.equal((await read.json()).rules,rules);
});
test('skill endpoint rejects foreign origins',async()=>{
 const r=await skillRequest(new Request('https://example.com/api/skill',{method:'POST',headers:{origin:'https://other.com'},body:'{}'}),'secret',{});assert.equal(r.status,403);
});


test('invalid scoring weights cannot overwrite protected rules',async()=>{
 const req=new Request('https://example.com/api/skill',{method:'POST',body:JSON.stringify({password:'secret',action:'save',rules:'<scoring-config>{}</scoring-config>'})});let wrote=false;
 const response=await skillRequest(req,'secret',{get:async()=> 'original',put:async()=>{wrote=true;}});
 assert.equal(response.status,400);assert.equal(wrote,false);
});
