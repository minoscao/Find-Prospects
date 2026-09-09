import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/worker.js';

test('Cloudflare reports unavailable backend services honestly', async () => {
  const response = await worker.fetch(new Request('https://example.com/api/status'), {});
  assert.deepEqual(await response.json(), {google:false, website:false, social:false, ai:false, sending:false});
});

test('API requests return JSON instead of the SPA page', async () => {
  for (const [path, status] of [['/api/search',503], ['/api/enrich',503], ['/api/unknown',404], ['/api',404]]) {
    const response = await worker.fetch(new Request(`https://example.com${path}`, {method:'POST'}), {});
    assert.equal(response.status, status);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.ok((await response.json()).code);
  }
});

test('Page requests are forwarded to static assets', async () => {
  const request = new Request('https://example.com/');
  const response = await worker.fetch(request, {ASSETS:{fetch:async forwarded => {
    assert.equal(forwarded, request);
    return new Response('app');
  }}});
  assert.equal(await response.text(), 'app');
});
