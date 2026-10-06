import { it, expect } from 'vitest';
import { handle } from '../server/handler';
import { LocalStore } from '../server/store';
import { createRoom } from '../shared/game';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
async function post(body: unknown, token?: string) { const res=await handle(new Request('http://localhost/api/game',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)})); return { status:res.status, data:await res.json() }; }
it('separate sessions join, race bids, preserve privacy, and cannot forge sessions',async()=>{
  const a=(await post({type:'session'})).data.token, b=(await post({type:'session'})).data.token;
  const created=await post({type:'create',name:'API Alpha'},a);expect(created.status).toBe(200);const code=created.data.code;
  expect((await post({type:'join',code,name:'API Beta'},b)).status).toBe(200);
  await post({type:'action',code,action:{type:'start'}},a);
  const replies=await Promise.all([post({type:'action',code,action:{type:'bid',round:1,phase:'bid',bid:2}},a),post({type:'action',code,action:{type:'bid',round:1,phase:'bid',bid:2}},b)]);
  expect(replies.every(r=>r.status===200)).toBe(true);
  const snapshot=await handle(new Request(`http://localhost/api/game?room=${code}`,{headers:{Authorization:`Bearer ${b}`}}));const state=await snapshot.json();expect(state.phase).toBe('build');expect(state.players.filter((p:any)=>p.bonus)).toHaveLength(1);expect(state.players[0]).not.toHaveProperty('bid');
  const plan={brief:0,model:'compact',data:2,training:1,evaluation:0,distill:false,release:'research'};
  const locked=await post({type:'action',code,action:{type:'build',round:1,phase:'build',plan}},a);expect(locked.status).toBe(200);
  const duplicate=await post({type:'action',code,action:{type:'build',round:1,phase:'build',plan}},a);expect(duplicate.status).toBe(400);
  const theirs=await handle(new Request(`http://localhost/api/game?room=${code}`,{headers:{Authorization:`Bearer ${b}`}}));expect((await theirs.json()).players[0]).not.toHaveProperty('plan');
  expect((await post({type:'join',code,name:'Forged'},a.slice(0,-1)+'x')).status).toBe(400);
  const c=(await post({type:'session'})).data.token;const foreign=await handle(new Request(`http://localhost/api/game?room=${code}`,{headers:{Authorization:`Bearer ${c}`}}));expect(foreign.status).toBe(403);
  const cors=await handle(new Request('http://localhost/api/game',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}));expect(cors.status).toBe(403);
});
it('local persistence compares revisions so concurrent updates cannot overwrite one another',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'labwars-'));try{const store=new LocalStore(dir),r=createRoom('ABC234','a','Test Lab',1);await store.create(r);const a=await store.get(r.code),b=await store.get(r.code);a!.revision=1;b!.revision=1;a!.players[0].credits=8;b!.players[0].credits=4;expect(await store.commit(a!,0)).toBe(true);expect(await store.commit(b!,0)).toBe(false);const restarted=new LocalStore(dir);expect((await restarted.get(r.code))!.players[0].credits).toBe(8);}finally{rmSync(dir,{recursive:true,force:true})}
});
it('eight simultaneous players resolve one shared auction and one shared scoring update',async()=>{
 const tokens:string[]=[];for(let n=0;n<8;n++)tokens.push((await post({type:'session'})).data.token);
 const code=(await post({type:'create',name:'Eight Alpha'},tokens[0])).data.code;
 await Promise.all(tokens.slice(1).map((t,n)=>post({type:'join',code,name:`Eight Lab ${n+1}`},t)));
 await post({type:'action',code,action:{type:'start'}},tokens[0]);
 const bids=await Promise.all(tokens.map(t=>post({type:'action',code,action:{type:'bid',round:1,phase:'bid',bid:1}},t)));expect(bids.every(r=>r.status===200)).toBe(true);
 const plan={brief:0,model:'compact',data:2,training:1,evaluation:0,distill:false,release:'commercial'};
 const submissions=await Promise.all(tokens.map(t=>post({type:'action',code,action:{type:'build',round:1,phase:'build',plan}},t)));expect(submissions.every(r=>r.status===200)).toBe(true);
 const res=await handle(new Request(`http://localhost/api/game?room=${code}`,{headers:{Authorization:`Bearer ${tokens[0]}`}}));const r=await res.json();expect(r.phase).toBe('reveal');expect(r.players).toHaveLength(8);expect(r.players.filter((p:any)=>p.bonus)).toHaveLength(4);expect(r.players.every((p:any)=>p.impact===4&&p.results.length===1)).toBe(true);
});
