import type { SupabaseClient } from '@supabase/supabase-js';
import type { Action, View } from '../shared/game';
let supabase: SupabaseClient | null = null;
let localToken = '';
let initialized: Promise<void> | undefined;
let mode: 'local' | 'supabase' = 'local';
export function initialize() {
  return initialized ??= (async () => {
    const response = await fetch('/api/game?config=1');
    const config = await response.json();
    if (!response.ok) throw new Error(config.error ?? 'The game service is unavailable.');
    mode = config.mode;
    if (mode === 'supabase') {
      if (!config.url || !config.publishableKey) throw new Error('The hosted game is missing its public Supabase configuration.');
      const { createClient } = await import('@supabase/supabase-js'); supabase = createClient(config.url, config.publishableKey);
      const { data } = await supabase.auth.getSession();
      if (!data.session) { const { error } = await supabase.auth.signInAnonymously(); if (error) throw new Error('Guest sessions are unavailable. Enable anonymous sign-ins in the Lab Wars project.'); }
    } else {
      localToken = sessionStorage.getItem('labwars.session.v1') ?? '';
      if (!localToken) { const r = await fetch('/api/game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'session' }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); localToken = data.token; sessionStorage.setItem('labwars.session.v1', localToken); }
    }
  })();
}
async function token() { await initialize(); if (!supabase) return localToken; const { data } = await supabase.auth.getSession(); if (!data.session) throw new Error('Your guest session expired. Reload to reconnect.'); return data.session.access_token; }
async function request(body?: unknown, code?: string): Promise<View> {
  const response = await fetch(code ? `/api/game?room=${code}` : '/api/game', { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${await token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Could not connect to the game.'); return data;
}
export const create = (name: string, practice = false) => request({ type: 'create', name, practice });
export const join = (code: string, name: string) => request({ type: 'join', code, name });
export const refresh = (code: string) => request(undefined, code);
export const send = (code: string, action: Action) => request({ type: 'action', code, action });
export function subscribe(code: string, callback: () => void) {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client.channel(`room-${code}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'labwars_room_signals', filter: `code=eq.${code}` }, callback).subscribe(status => { if (status === 'SUBSCRIBED') callback(); });
  return () => { void client.removeChannel(channel); };
}
export function connectionMode() { return mode; }
