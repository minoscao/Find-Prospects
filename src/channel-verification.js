import {mergeCollection} from './collection.js';
export function mergeVerification(customer,result){
 const patch=mergeCollection(customer,result.collection),channelRatings={...(customer.channelRatings||{})};
 for(const check of result.checks){const existing=channelRatings[check.platform];if(existing&&existing.method!=='automatic')continue;if(!channelRatings[check.platform]||check.level!=='unknown'||channelRatings[check.platform].method==='automatic')channelRatings[check.platform]=check;}
 return {...patch,channelRatings,channelVerification:{verifiedAt:result.verifiedAt,nextCheckAt:result.nextCheckAt,checks:result.checks,readAttempts:result.readAttempts||[],website:customer.website}};
}
