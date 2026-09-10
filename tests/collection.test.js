import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPage,collectWebsite,mergeCollection} from '../src/collection.js';
test('extracts direct channels and evidence without treating lookalike hosts as official',()=>{
 const p=extractPage('<title>Business</title><script>secret code</script><p>Birthday parties</p><a href="mailto:hello@example.com">Email</a><a href="https://instagram.com/shop">IG</a><a href="https://instagram.com.attacker.test/shop">Fake</a><a href="/contact">Contact</a>','https://example.com/');
 assert.equal(p.links.length,2);assert.equal(p.pages[0],'https://example.com/contact');assert.ok(!p.text.includes('secret code'));
});
test('partial collection preserves failures and limits page reads',async()=>{
 const r=await collectWebsite('https://example.com/',async url=>{if(url.endsWith('contact'))throw Error('ACCESS_RESTRICTED');return {url,html:'<title>Shop</title><a href="/contact">Contact</a><a href="/about">About</a><a href="/parties">Parties</a>'};});
 assert.equal(r.status,'partial');assert.equal(r.pages.length,2);assert.equal(r.failures[0].code,'ACCESS_RESTRICTED');assert.equal(r.ratingStatus,'unverified');
});
test('refresh deduplicates collected evidence and preserves manual sources and ratings',()=>{
 const c={network:[],sources:[{url:'https://example.com',origin:'research',text:['Manual']}],channelRatings:{Website:{level:'green'}}};
 const r={pages:[{url:'https://example.com',title:'Site',text:'Collected',collectedAt:'2026-09-10'}],links:[{url:'mailto:hi@example.com',platform:'Email'}],collectedAt:'2026-09-10',status:'complete'};
 const once={...c,...mergeCollection(c,r)},twice={...once,...mergeCollection(once,r)};
 assert.equal(twice.sources.length,2);assert.equal(twice.network.length,1);assert.deepEqual(twice.channelRatings,c.channelRatings);
 const failed=mergeCollection(twice,{pages:[],links:[],status:'failed'});assert.equal(failed.sources.length,2);assert.ok(!('lastCollected' in failed));
});

test('placeholder mail links are not published contact addresses',()=>{const p=extractPage('<a href="mailto:#">template</a><a href="mailto:book@example.com">contact</a>','https://example.com');assert.equal(p.links.length,1);assert.equal(p.links[0].url,'mailto:book@example.com');});
