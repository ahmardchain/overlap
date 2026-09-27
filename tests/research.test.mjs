import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStudy,validateSettings,handleApi} from '../worker/index.js';
const settings={ids:['btc','eth'],start:'2026-01-01',end:'2026-01-03',currency:'USD',interval:'Daily'};
const q=(d,price)=>({timestamp:d+'T23:59:00Z',quote:{USD:{price}}});
test('shared dates use the first shared baseline and preserve gaps',()=>{
 const result=buildStudy(settings,{btc:{id:1,quotes:[q('2026-01-01',10),q('2026-01-02',20),q('2026-01-03',30)]},eth:{id:1027,quotes:[q('2026-01-02',100),q('2026-01-03',80)]}});
 assert.equal(result.baseline,'2026-01-02');assert.equal(result.shared,2);assert.equal(result.rows[0].btc,null);assert.equal(result.rows[1].btc,100);assert.equal(result.rows[2].btc,150);assert.equal(result.rows[2].eth,80);assert.deepEqual(result.excluded,[{date:'2026-01-01',missingAssets:['eth']}]);
});
test('invalid dates, future periods, unsupported IDs and oversized requests fail',()=>{
 for(const patch of [{start:'2026-02-30'},{end:'2099-01-01'},{ids:['btc','unknown']},{start:'2010-01-01'}])assert.throws(()=>validateSettings({...settings,...patch}));
});
test('invalid provider shape cannot become apparent market gaps',()=>{assert.throws(()=>buildStudy(settings,{btc:{id:1,quotes:[]}}));});
test('no credentials returns configuration error instead of synthetic data',async()=>{const r=await handleApi(new Request('https://example.test/api/research',{method:'POST',body:JSON.stringify(settings)}),{});assert.equal(r.status,503);assert.match((await r.json()).error,/not connected/);});
test('historical quotes adapter includes the first requested date and retains source metadata',async()=>{
 const original=global.fetch;const urls=[];global.fetch=async(url)=>{urls.push(new URL(url));const id=Number(new URL(url).searchParams.get('id'));return Response.json({data:{id,quotes:[q('2026-01-01',10),q('2026-01-02',20)]},status:{error_code:0,timestamp:'2026-01-04T00:00:00Z',credit_count:1}})};
 try{const r=await handleApi(new Request('https://example.test/api/research',{method:'POST',body:JSON.stringify(settings)}),{CMC_API_KEY:'fixture'});const body=await r.json();assert.equal(r.status,200);assert.equal(urls[0].pathname,'/v3/cryptocurrency/quotes/historical');assert.equal(urls[0].searchParams.get('time_start'),'2025-12-31T23:59:00.000Z');assert.equal(urls[0].searchParams.get('interval'),'24h');assert.equal(body.shared,2);assert.equal(body.provenance.statuses.length,2);}finally{global.fetch=original}
});
test('Jev returns a review proposal, never runs a market request',async()=>{
 const original=global.fetch;let n=0;global.fetch=async(url,options)=>{n++;assert.equal(url,'https://api.typesafe.ai/v1/systemone');const payload=JSON.parse(options.body);assert.equal(payload.model,'jev-latest');return Response.json({model:'jev-test',answers:Object.fromEntries(Object.entries({assets:'btc,eth',window:'keep',interval:'Weekly',supported:'yes'}).map(([key,choice])=>[key,{type:'choice',choice,confidence:.9}]))})};
 try{const r=await handleApi(new Request('https://example.test/api/interpret',{method:'POST',body:JSON.stringify({prompt:'Compare BTC and ETH weekly',current:settings})}),{TYPESAFE_API_KEY:'fixture'});const result=await r.json();assert.equal(result.needsReview,true);assert.equal(result.proposal.interval,'Weekly');assert.equal(n,1);}finally{global.fetch=original}
});
