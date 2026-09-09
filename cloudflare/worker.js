export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api/status') {
      return Response.json({google:false, website:false, social:false, ai:false, sending:false});
    }
    if (pathname === '/api/search' || pathname === '/api/enrich') {
      return Response.json({code:pathname === '/api/search' ? 'GOOGLE_NOT_CONFIGURED' : 'BACKEND_NOT_CONFIGURED'}, {status:503});
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return Response.json({code:'NOT_FOUND'}, {status:404});
    }
    return env.ASSETS.fetch(request);
  }
};
