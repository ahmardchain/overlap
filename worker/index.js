const CATALOG = {btc:1,eth:1027,sol:5426,link:1975};
const DAY=86400000;
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export function validateSettings(s,now=Date.now()) {
 if(!s||!Array.isArray(s.ids)||s.ids.length<2||s.ids.length>4||new Set(s.ids).size!==s.ids.length||s.ids.some(id=>!CATALOG[id])) fail('Choose two to four supported assets.');
 for(const key of ['start','end']) if(typeof s[key]!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s[key])||!Number.isFinite(Date.parse(s[key]))||new Date(s[key]).toISOString().slice(0,10)!==s[key]) fail('Use valid calendar dates.');
 const n=(Date.parse(s.end)-Date.parse(s.start))/DAY+1;
 if(n<1||n>366||s.start<new Date(now-365*DAY).toISOString().slice(0,10)||s.end>=new Date(now).toISOString().slice(0,10)) fail('Choose completed UTC days within the past year.');
 if(s.currency!=='USD'||!['Daily','Weekly'].includes(s.interval)) fail('Use USD and daily or weekly sampling.');
 return {ids:s.ids,start:s.start,end:s.end,currency:s.currency,interval:s.interval};
}
export function buildStudy(settings,series){
 const count=(Date.parse(settings.end)-Date.parse(settings.start))/DAY+1;
 const all=Array.from({length:count},(_,i)=>new Date(Date.parse(settings.start)+i*DAY).toISOString().slice(0,10));
 const days=settings.interval==='Weekly'?all.filter((_,i)=>i%7===0):all;
 const maps={};
 for(const id of settings.ids){
  const data=series[id];if(!data||Number(data.id)!==CATALOG[id]||!Array.isArray(data.quotes)) fail('Unexpected CoinMarketCap response. No comparison was created.',502);
  maps[id]={};
  for(const q of data.quotes){const d=q.timestamp?.slice(0,10);const v=q.quote?.USD?.price;
   if(!all.includes(d))continue;
   if(Object.hasOwn(maps[id],d)) fail('Duplicate daily observations returned. No comparison was created.',502);
   if(typeof v==='number'&&Number.isFinite(v)&&v>0)maps[id][d]=v;
  }
 }
 const sharedDates=days.filter(d=>settings.ids.every(id=>maps[id][d]!==undefined));
 const baseline=sharedDates[0]??null;
 const missing=days.filter(d=>!sharedDates.includes(d));
 const rows=days.map((date,index)=>({date,index,missing:missing.includes(date),...Object.fromEntries(settings.ids.map(id=>[id,baseline&&!missing.includes(date)?maps[id][date]/maps[id][baseline]*100:null]))}));
 return {days,all,missing,shared:sharedDates.length,baseline,rows,counts:Object.fromEntries(settings.ids.map(id=>[id,days.filter(d=>maps[id][d]!==undefined).length])),raw:maps,sharedDates,excluded:missing.map(date=>({date,missingAssets:settings.ids.filter(id=>maps[id][date]===undefined)}))};
}
async function upstream(url,options={}){
 let r;try{r=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});}catch{fail('Provider unavailable or timed out. Try again; no data was substituted.',502);}
 if(!r.ok)fail(r.status===429?'Provider rate limit reached. Please retry later.':r.status===401?'Provider rejected the API key.':r.status===403?'This API key cannot access the requested data or date range.':`Provider request failed (${r.status}).`,r.status===429?429:502);
 let body;try{body=await r.json();}catch{fail('Provider returned an unreadable response.',502);}return body;
}
export async function handleApi(request,env){
 const path=new URL(request.url).pathname;
 if(path==='/api/status'&&request.method==='GET')return json({cmcConfigured:!!env.CMC_API_KEY,jevConfigured:!!env.TYPESAFE_API_KEY});
 if(!['/api/research','/api/interpret'].includes(path))return json({error:'Not found'},404);
 if(request.method!=='POST')return json({error:'Use POST'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Origin rejected'},403);
 try{
  const text=await request.text();if(text.length>5000)fail('Request too long.',413);let body;try{body=JSON.parse(text);}catch{fail('Invalid JSON.');}
  if(path==='/api/research'){
   const settings=validateSettings(body);
   if(!env.CMC_API_KEY)fail('CoinMarketCap is not connected. Add CMC_API_KEY to enable historical comparisons.',503);
   const series={};const statuses=[];
   for(const id of settings.ids){
    const firstInterval=new Date(Date.parse(settings.start)-DAY).toISOString().slice(0,10);
    const params=new URLSearchParams({id:String(CATALOG[id]),time_start:firstInterval+'T23:59:00.000Z',time_end:settings.end+'T23:59:59.999Z',interval:'24h',convert:'USD',skip_invalid:'false'});
    const r=await upstream('https://pro-api.coinmarketcap.com/v3/cryptocurrency/quotes/historical?'+params,{headers:{'X-CMC_PRO_API_KEY':env.CMC_API_KEY}});
    if(r.status?.error_code)fail('CoinMarketCap could not fulfill this request. Check API permissions and date coverage.',502);
    series[id]=r.data?.id?r.data:r.data?.[CATALOG[id]];statuses.push({asset:id,timestamp:r.status?.timestamp,credits:r.status?.credit_count});
   }
   return json({...buildStudy(settings,series),settings,provenance:{provider:'CoinMarketCap',endpoint:'/v3/cryptocurrency/quotes/historical',fetchedAt:new Date().toISOString(),statuses,method:'Positive USD historical quotes requested near 23:59 UTC; shared UTC dates only; index=price/first shared price*100. Weekly means every seventh day from selected start, not weekly candles.'}});
  }
  if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>1000)fail('Enter a research question under 1,000 characters.');
  const current=validateSettings(body.current);
  if(!env.TYPESAFE_API_KEY)fail('Jev is not connected. Add TYPESAFE_API_KEY, or use the manual controls.',503);
  const combinations={other:'Unsupported asset, fewer than two assets, ambiguous or unspecified selection'};
  const ids=Object.keys(CATALOG);for(let mask=1;mask<16;mask++){const group=ids.filter((_,i)=>mask&(1<<i));if(group.length>=2)combinations[group.join(',')]='Exactly '+group.join(', ').toUpperCase();}
  const questions={assets:{type:'choice',instructions:'Which exact supported asset set does the user want to compare? BTC is Bitcoin, ETH Ethereum, SOL Solana, LINK Chainlink. Choose other if any requested asset is unsupported or unspecified.',criteria:combinations},window:{type:'choice',instructions:'What trailing duration in completed UTC days is explicitly requested? Keep current only if unspecified. Use other for calendar months, absolute dates or durations not listed.',criteria:{'7':'Last seven days / one week','30':'Last thirty days','90':'Last ninety days','180':'Last 180 days','365':'Last 365 days',keep:'No duration specified',other:'Any other requested duration or absolute date range'}},interval:{type:'choice',instructions:'What sampling does the user request?',criteria:{Daily:'Daily near-end-of-day quotes',Weekly:'One near-end-of-day quote every seven days',keep:'Unspecified',other:'Any other sampling'}},supported:{type:'choice',instructions:'Can this entire request be satisfied by comparing normalized USD historical price quotes near 23:59 UTC on completed days of supported assets within the past year? No exact closing prices, forecasts, trading, correlations, volume, other currencies or other metrics are available.',criteria:{yes:'Only the supported comparison',no:'Other functionality requested'}}};
  const r=await upstream('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:'Bearer '+env.TYPESAFE_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'jev-latest',state:{request:body.prompt,current},questions})});
  const a=r.answers;for(const key of Object.keys(questions))if(!a?.[key]||!Object.hasOwn(questions[key].criteria,a[key].choice)||!Number.isFinite(a[key].confidence))fail('Unexpected Jev response. Use manual controls.',502);
  if(a.supported.choice!=='yes'||[a.assets,a.window,a.interval].some(v=>v.choice==='other'))fail('This request needs manual settings. Supported: BTC, ETH, SOL, LINK; USD quotes near 23:59 UTC within the past year; daily or every-seven-day sampling.');
  const proposal={...current,ids:a.assets.choice.split(','),interval:a.interval.choice==='keep'?current.interval:a.interval.choice};
  if(a.window.choice!=='keep'){proposal.end=new Date(Date.now()-DAY).toISOString().slice(0,10);proposal.start=new Date(Date.parse(proposal.end)-(Number(a.window.choice)-1)*DAY).toISOString().slice(0,10);}
  return json({proposal:validateSettings(proposal),answers:a,model:r.model,needsReview:true,warning:Math.min(...Object.values(a).map(v=>v.confidence))<.8?'Jev is uncertain. Check every proposed setting.':'Check every setting before applying. Model confidence is not a guarantee.'});
 }catch(e){return json({error:e.status?e.message:'Unable to process this request.'},e.status||500);}
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith("/api/")) return handleApi(request,env);
    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
