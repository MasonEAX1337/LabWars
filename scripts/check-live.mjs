import {createClient} from '@supabase/supabase-js';
// Explicit target required: this test creates eight guest identities and a QA room.
const base=process.env.BASE_URL?.replace(/\/$/, '');
if(!base)throw Error('Set BASE_URL to the hosted game to verify.');
const cfg=await fetch(base+'/api/game?config=1',{signal:AbortSignal.timeout(20000)}).then(r=>r.json());
if(cfg.mode!=='supabase')throw Error('Expected a configured Supabase backend.');
const clients=Array.from({length:8},()=>createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}}));
const tokens=await Promise.all(clients.map(async c=>{const {data,error}=await c.auth.signInAnonymously();if(error)throw error;return data.session.access_token;}));
async function request(i,body){const r=await fetch(base+'/api/game',{method:'POST',headers:{Authorization:'Bearer '+tokens[i],'Content-Type':'application/json',Origin:base},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
let v=await request(0,{type:'create',name:'Live QA 1'});const code=v.code;
await Promise.all(clients.slice(1).map((_,n)=>request(n+1,{type:'join',code,name:'Live QA '+(n+2)})));
let updates=0;
const channel=clients[0].channel('live-verification-'+code).on('postgres_changes',{event:'UPDATE',schema:'public',table:'labwars_room_signals',filter:'code=eq.'+code},()=>{updates++;});
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Realtime subscription timeout')),20000);channel.subscribe(status=>{if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}if(status==='CHANNEL_ERROR'){clearTimeout(timer);reject(Error('Realtime channel error'));}});});
await request(0,{type:'action',code,action:{type:'start'}});
const bids=await Promise.all(clients.map((_,i)=>request(i,{type:'action',code,action:{type:'bid',round:1,phase:'bid',bid:1}})));
const buildView=bids.find(x=>x.phase==='build');if(!buildView)throw Error('Auction did not resolve');
if(buildView.players.filter(p=>p.bonus).length!==4)throw Error('Expected four auction winners');
const builds=await Promise.all(clients.map((_,i)=>request(i,{type:'action',code,action:{type:'build',round:1,phase:'build',plan:{brief:0,model:'compact',data:2,training:1,evaluation:0,distill:false,release:'research'}}})));
v=builds.find(x=>x.phase==='reveal');if(!v||v.players.some(p=>p.impact!==4||p.results.length!==1))throw Error('Concurrent scoring mismatch');
await new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(updates>0){clearInterval(timer);resolve();}else if(Date.now()-start>10000){clearInterval(timer);reject(Error('No Realtime updates'));}},100);});
await Promise.all(clients.map(c=>c.removeAllChannels()));
await Promise.all(clients.map(c=>c.auth.signOut()));
console.log(JSON.stringify({players:8,auctionWinners:4,allScores:4,resultsPerPlayer:1,realtimeUpdates:updates,passed:true}));
process.exit(0);
