import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPlaces} from '../search-api.js';
test('search rejects missing credentials and invalid regions before outbound requests',async()=>{
 assert.equal((await searchPlaces({},null)).status,503);
 assert.equal((await searchPlaces({query:'kids',polygon:[]},'test')).status,400);
});
test('search returns mapped real provider records without exposing the key',async t=>{
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(url,'https://places.googleapis.com/v1/places:searchText');
  assert.equal(options.headers['X-Goog-Api-Key'],'test-only');
  return Response.json({places:[{id:'place-1',displayName:{text:'Business'},location:{latitude:1,longitude:2},websiteUri:'https://example.com'}]});
 });
 const r=await searchPlaces({query:'kids',polygon:[[0,0],[0,3],[3,3]]},'test-only');
 assert.equal(r.status,200);assert.equal(r.body.places[0].name,'Business');assert.ok(!JSON.stringify(r.body).includes('test-only'));
});
