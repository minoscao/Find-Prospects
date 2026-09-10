import {readWorkspace} from './database-api.js';
import {assessCustomer} from './assessment-api.js';
import {verifyChannels} from './channel-verification.js';
import {createBrowserReader} from './browser-reader.js';
import {mergeVerification} from '../src/channel-verification.js';
export async function completeAssessment(input,env,{load=readWorkspace,verify=verifyChannels,readerFactory=createBrowserReader,assess=assessCustomer}={}){
 let customer=input;
 if(env.DB){const workspace=await load(env.DB);customer=workspace.customers.find(c=>c.id===input.id);if(!customer)return {status:404,body:{code:'CUSTOMER_NOT_FOUND'}};}
 if(customer.demo)return {status:400,body:{code:'DEMO_CUSTOMER'}};
 let verification,collectionIssue;
 const cached=customer.channelVerification;
 if(customer.website&&(!cached||cached.website!==customer.website||!(Date.parse(cached.nextCheckAt)>Date.now()))){
 const reader=readerFactory(env);try{const result=await verify({id:customer.id,website:customer.website},reader.read);if(result.status===200){verification={...result.body,readAttempts:reader.attempts};customer={...customer,...mergeVerification(customer,verification)};}else collectionIssue=result.body.code;}catch{collectionIssue='EVIDENCE_REFRESH_INCOMPLETE';}finally{await reader.close();}
 }
 const result=await assess({...customer,en:input.en,collectionIssue},env);
 if(result.status===200){result.body.evidenceRefresh=collectionIssue||'available';if(verification)result.body.verification=verification;}
 return result;
}
