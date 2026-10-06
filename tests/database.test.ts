import { it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { createRoom, act } from '../shared/game';
it('migration enforces member-only signals, service-only state writes, and atomic compare-and-swap',async()=>{
 const db=new PGlite(); await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; create publication supabase_realtime;`);
 const files=readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql'));for(const file of files)await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';const r=createRoom('ABC234',a,'Alpha',1);
 await db.exec('set role service_role');expect((await db.query<{ok:boolean}>('select public.labwars_create($1,$2) as ok',[r.code,JSON.stringify(r)])).rows[0].ok).toBe(true);
 act(r,b,{type:'join',name:'Beta'},2);r.revision=1;expect((await db.query<{ok:boolean}>('select public.labwars_commit($1,$2,$3) as ok',[r.code,0,JSON.stringify(r)])).rows[0].ok).toBe(true);expect((await db.query<{ok:boolean}>('select public.labwars_commit($1,$2,$3) as ok',[r.code,0,JSON.stringify(r)])).rows[0].ok).toBe(false);
 await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${a}';`);expect((await db.query('select * from public.labwars_room_signals')).rows).toHaveLength(1);expect((await db.query('select * from public.labwars_memberships')).rows).toHaveLength(1);
 await expect(db.query('select * from public.labwars_rooms')).rejects.toThrow('permission denied');await expect(db.query('select public.labwars_commit($1,$2,$3)',[r.code,1,JSON.stringify({...r,revision:2})])).rejects.toThrow('permission denied');
 await db.exec(`set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';`);expect((await db.query('select * from public.labwars_room_signals')).rows).toHaveLength(0);await expect(db.query("update public.labwars_room_signals set revision=100")).rejects.toThrow('permission denied');await db.close();
},30000);
