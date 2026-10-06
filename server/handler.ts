import { randomBytes, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRoom, newPlayer, act, tick, view, driveBots, type Action } from '../shared/game.js';
import { getStore, cloud } from './store.js';

let localKey: string;
function key() { if (localKey) return localKey; mkdirSync('.local-data', { recursive: true }); const f = '.local-data/session-key'; if (!existsSync(f)) writeFileSync(f, randomBytes(32).toString('hex'), { mode: 0o600 }); return localKey = readFileSync(f, 'utf8'); }
function signature(id: string) { return createHmac('sha256', key()).update(id).digest('hex'); }
async function identity(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, ''); if (!token) throw new Error('Session expired. Rejoin the room.');
  if (cloud) { const { data, error } = await cloud.auth.getUser(token); if (error || !data.user) throw new Error('Session expired. Rejoin the room.'); return data.user.id; }
  const [id, sig, extra] = token.split('.'); if (!id || extra || !/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{64}$/.test(sig ?? '')) throw new Error('Invalid session.');
  if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(signature(id), 'hex'))) throw new Error('Invalid session.'); return id;
}
function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
function code() { const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(randomBytes(6), b => alphabet[b % alphabet.length]).join(''); }
export async function handle(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.searchParams.get('config') === '1') return json({ mode: getStore().mode, url: process.env.SUPABASE_URL ?? '', publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? '' });
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
    if (request.method === 'POST') { const origin = request.headers.get('origin'); if (origin && origin !== url.origin) return json({ error: 'Cross-origin actions are not permitted.' }, 403); }
    const store = getStore();
    let body: { type?: string; code?: string; name?: string; action?: Action; practice?: boolean } = {};
    if (request.method === 'POST') {
      const raw = await request.text(); if (raw.length > 8192) return json({ error: 'Request too large.' }, 413); body = JSON.parse(raw);
      if (body.type === 'session' && store.mode === 'local') { const id = randomUUID(); return json({ token: `${id}.${signature(id)}` }); }
    }
    const id = await identity(request); const now = Date.now();
    if (body.type === 'create') {
      for (let attempt = 0; attempt < 5; attempt++) {
        const room = createRoom(code(), id, body.name ?? '', now);
        if (body.practice) { for (const name of ['Vector Labs', 'Gradient Works']) room.players.push({ ...newPlayer(randomUUID(), name, now), bot: true }); act(room, id, { type: 'start' }, now); driveBots(room, now); }
        if (await store.create(room)) return json(view(room, id, now, store.mode));
      } throw new Error('Could not create a room. Try again.');
    }
    const roomCode = (body.code ?? url.searchParams.get('room') ?? '').toUpperCase(); if (!/^[A-Z2-9]{6}$/.test(roomCode)) throw new Error('Enter a six-character room code.');
    for (let attempt = 0; attempt < 12; attempt++) {
      const room = await store.get(roomCode); if (!room || now - room.created > 48 * 60 * 60 * 1000) throw new Error('Room not found or expired. Create a new room.');
      const oldRevision = room.revision; const p = room.players.find(p => p.id === id);
      if (body.type !== 'join' && !p) return json({ error: 'Join this room first.' }, 403);
      let changed = tick(room, now);
      if (body.type === 'join') { act(room, id, { type: 'join', name: body.name }, now); changed = true; }
      else if (body.type === 'action') { if (!body.action) throw new Error('Action required.'); act(room, id, body.action, now); changed = true; }
      else if (p && now - p.lastSeen > 20000) { p.lastSeen = now; changed = true; }
      const beforeBots = JSON.stringify(room); driveBots(room, now); changed ||= beforeBots !== JSON.stringify(room);
      if (changed) { room.revision++; if (!await store.commit(room, oldRevision)) continue; }
      return json(view(room, id, now, store.mode));
    }
    return json({ error: 'The room is busy. Try again.' }, 409);
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Invalid request.' }, 400);
    const message = error instanceof Error ? error.message : '';
    const known = /^(Use |Join |That |This |Your |Choose |Unknown |Only |You |The |Upgrade |Room |Enter |Invalid |Session |Distillation |Improvement |Action |Could not|Multiplayer)/.test(message);
    if (!known) console.error('Lab Wars request failed', error);
    return json({ error: known ? message : 'The game service is unavailable. Your previous submission is preserved; try reconnecting.' }, message.startsWith('Multiplayer backend') ? 503 : known ? 400 : 503);
  }
}
