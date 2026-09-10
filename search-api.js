export async function searchPlaces(input,key){
 const reply=(status,body)=>({status,body});
  if(!key)return reply(503,{code:'GOOGLE_NOT_CONFIGURED'});
  const {query,polygon,lang='zh-CN'}=input||{};
  if(typeof query!=='string'||!query.trim()||query.length>200||!Array.isArray(polygon)||polygon.length<3||polygon.length>100||polygon.some(p=>!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>90||Math.abs(p[1])>180))return reply(400,{code:'INVALID_REGION'});
  const lat=polygon.map(p=>p[0]),lng=polygon.map(p=>p[1]);
  try{const r=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.googleMapsUri,places.businessStatus'},body:JSON.stringify({textQuery:query,languageCode:lang,pageSize:20,locationRestriction:{rectangle:{low:{latitude:Math.min(...lat),longitude:Math.min(...lng)},high:{latitude:Math.max(...lat),longitude:Math.max(...lng)}}}})});
    if(!r.ok)return reply(502,{code:'GOOGLE_REQUEST_FAILED',upstreamStatus:r.status});
    const data=await r.json();return reply(200,{places:(data.places||[]).map(p=>({id:p.id,name:p.displayName?.text,address:p.formattedAddress,lat:p.location?.latitude,lng:p.location?.longitude,website:p.websiteUri,maps:p.googleMapsUri})),limited:true,collectedAt:new Date().toISOString()});
  }catch{return reply(502,{code:'COLLECTION_FAILED'});}
}
