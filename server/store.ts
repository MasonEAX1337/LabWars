import { createClient } from '@supabase/supabase-js';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Room } from '../shared/game.js';

export interface Store { mode: 'local' | 'supabase'; get(code: string): Promise<Room | null>; create(room: Room): Promise<boolean>; commit(room: Room, expected: number): Promise<boolean> }
export const cloud = process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
export class LocalStore implements Store {
  mode = 'local' as const;
  constructor(private directory = resolve('.local-data/rooms')) { mkdirSync(directory, { recursive: true }); }
  private file(code: string) { if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error('Invalid room code.'); return resolve(this.directory, `${code}.json`); }
  async get(code: string) { const path = this.file(code); return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) as Room : null; }
  async create(room: Room) { try { writeFileSync(this.file(room.code), JSON.stringify(room), { flag: 'wx', mode: 0o600 }); return true; } catch (e) { if ((e as NodeJS.ErrnoException).code === 'EEXIST') return false; throw e; } }
  async commit(room: Room, expected: number) {
    const path = this.file(room.code); const old = JSON.parse(readFileSync(path, 'utf8')) as Room;
    if (old.revision !== expected) return false;
    writeFileSync(path + '.tmp', JSON.stringify(room), { mode: 0o600 }); renameSync(path + '.tmp', path); return true;
  }
}
export class SupabaseStore implements Store {
  mode = 'supabase' as const;
  async get(code: string) { const { data, error } = await cloud!.from('labwars_rooms').select('state').eq('code', code).maybeSingle(); if (error) throw error; return (data?.state as Room) ?? null; }
  async create(room: Room) { const { data, error } = await cloud!.rpc('labwars_create', { p_code: room.code, p_state: room }); if (error) throw error; return Boolean(data); }
  async commit(room: Room, expected: number) { const { data, error } = await cloud!.rpc('labwars_commit', { p_code: room.code, p_expected: expected, p_state: room }); if (error) throw error; return Boolean(data); }
}
let store: Store | undefined;
export function getStore(): Store {
  if (store) return store;
  if (cloud) return store = new SupabaseStore();
  // Never silently deploy ephemeral/local storage to a serverless host.
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('Multiplayer backend is not configured. Set the Supabase server environment variables.');
  return store = new LocalStore();
}
