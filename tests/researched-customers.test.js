import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeResearchedCustomers,mergeResearchProject} from '../src/researched-customers.js';
import {scoreFor,exportPlan} from '../src/domain.js';
test('research import is idempotent and preserves team edits',()=>{
 const imported=mergeResearchedCustomers([]);assert.equal(imported.length,4);
 imported[0].memo='Keep my note';imported[0].stage='excluded';
 const next=mergeResearchedCustomers(imported);assert.equal(next.length,4);assert.equal(next[0].memo,'Keep my note');assert.equal(next[0].stage,'excluded');
 assert.ok(next.every(c=>!c.demo&&scoreFor(c)===null&&c.origin==='public-research'&&c.contacts.length));
 assert.equal(exportPlan(next[0]).origin,'public-research');
});
test('existing real website identity keeps its id and gets no duplicate',()=>{
 const rows=mergeResearchedCustomers([{id:'existing',name:'Orange Wheels',website:'https://orangewheels.com/',demo:false,memo:'Existing'}]);
 assert.equal(rows.length,4);assert.equal(rows[0].id,'existing');
 const projects=mergeResearchProject([],rows);assert.ok(projects[0].customerIds.includes('existing'));assert.equal(mergeResearchProject(projects,rows).length,1);
});
test('demo businesses are not merged into real research',()=>{
 const rows=mergeResearchedCustomers([{id:'demo-orange',name:'Orange Wheels',demo:true}]);assert.equal(rows.length,5);assert.equal(rows[0].demo,true);
});
