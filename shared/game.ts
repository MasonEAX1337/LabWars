export type Phase = 'lobby' | 'bid' | 'build' | 'reveal' | 'finished';
export type Upgrade = 'pipeline' | 'bench' | 'distillation';
export type Ratings = { accuracy: number; efficiency: number; reliability: number };
export type Plan = { brief: number; model: 'compact' | 'balanced' | 'large'; data: number; training: number; evaluation: number; distill: boolean; release: 'commercial' | 'research' };
export type Result = { round: number; brief: string; ratings: Ratings; cost: number; impact: number; success: boolean; stretch: boolean; release: Plan['release']; reasons: string[]; lesson: string };
export type Player = { id: string; name: string; credits: number; research: number; impact: number; completed: number; stretches: number; upgrades: Upgrade[]; bonus: boolean; bid?: number; bidPaid: number; plan?: Plan; ready: boolean; results: Result[]; lastSeen: number; bot?: boolean };
export type Room = { code: string; host: string; revision: number; round: number; phase: Phase; deadline: number; created: number; players: Player[]; discoveries: Record<string, number> };
export type Brief = { name: string; description: string; target: Ratings; stretch: { stat: keyof Ratings | 'cost'; value: number }; lesson: string; domain: string };
export const MODELS = {
  compact: { name: 'Compact', cost: 1, accuracy: 2, efficiency: 3, reliability: 1, description: 'Small footprint. More work on the data.' },
  balanced: { name: 'Balanced', cost: 2, accuracy: 3, efficiency: 2, reliability: 1, description: 'A versatile starting point.' },
  large: { name: 'Large', cost: 3, accuracy: 4, efficiency: 0, reliability: 1, description: 'More capability. Expensive to run.' },
} as const;
export const UPGRADES: Record<Upgrade, { name: string; description: string }> = {
  pipeline: { name: 'Data pipeline', description: 'First data level costs 1 instead of 2 credits each round.' },
  bench: { name: 'Test bench', description: 'First evaluation & fixes level is free each round.' },
  distillation: { name: 'Distillation', description: 'Spend 1 credit for +2 Efficiency. Rivals get access one round later.' },
};
export const ERAS = ['First light', 'Pattern recognition', 'Context window', 'General purpose', 'Tool time', 'Launch day'];
const names = [
  ['Photo organizer', 'Support assistant', 'Document search'],
  ['Wildlife camera', 'Campus help desk', 'Research archive'],
  ['Visual search', 'Conversation assistant', 'Context explorer'],
  ['Multimodal catalog', 'Adaptable assistant', 'Knowledge platform'],
  ['Inspection copilot', 'Tool-using assistant', 'Evidence navigator'],
  ['Accessible vision', 'Reliable agent', 'Enterprise knowledge'],
];
// Published round targets create changing capability, deployment, and budget tradeoffs.
const targets: [number, number, number, keyof Ratings | 'cost', number][][] = [
  [[5,2,2,'efficiency',3], [5,1,4,'reliability',5], [6,2,3,'cost',8]],
  [[6,3,3,'accuracy',7], [6,2,3,'accuracy',7], [6,2,4,'cost',8]],
  [[6,2,4,'efficiency',4], [6,3,4,'reliability',5], [7,2,3,'cost',8]],
  [[7,3,3,'reliability',5], [7,2,5,'efficiency',4], [7,2,4,'cost',9]],
  [[7,4,4,'accuracy',8], [8,2,4,'reliability',5], [7,4,4,'cost',9]],
  [[8,3,5,'efficiency',4], [8,2,5,'accuracy',9], [8,2,4,'accuracy',9]],
];
export function briefs(round: number): Brief[] {
  const n = Math.max(0, Math.min(5, round - 1));
  const cards: Omit<Brief, 'target' | 'stretch'>[] = [
    { name: names[n][0], domain: 'Vision', description: 'Recognize visual patterns on inexpensive devices.', lesson: 'Representative examples help a model recognize patterns beyond its training set. A larger model can still be the wrong fit for a small device.' },
    { name: names[n][1], domain: 'Language', description: 'Give dependable answers within an operating budget.', lesson: 'A benchmark is only part of the story. Evaluation and fixes help catch failures before customers encounter them. Tool-using systems also need boundaries.' },
    { name: names[n][2], domain: 'Knowledge', description: 'Find useful information and meet every deployment requirement.', lesson: 'Useful AI balances capability, cost, and dependable behavior. Distillation can transfer capabilities into smaller systems; these ratings are a simplified simulation.' },
  ];
  return cards.map((card, i) => {
    const [accuracy, efficiency, reliability, stat, value] = targets[n][i];
    return { ...card, target: { accuracy, efficiency, reliability }, stretch: { stat, value } };
  });
}
export function canDistill(room: Room, p: Player): boolean {
  return p.upgrades.includes('distillation') || (room.discoveries.distillation !== undefined && room.round >= room.discoveries.distillation);
}
export function calculate(p: Player, plan: Plan) {
  const m = MODELS[plan.model];
  const ratings: Ratings = { accuracy: m.accuracy + plan.data + plan.training + Number(p.bonus), efficiency: m.efficiency + (plan.distill ? 2 : 0), reliability: m.reliability + plan.data + plan.evaluation };
  const cost = m.cost + plan.data * 2 - (plan.data > 0 && p.upgrades.includes('pipeline') ? 1 : 0) + plan.training + plan.evaluation - (plan.evaluation > 0 && p.upgrades.includes('bench') ? 1 : 0) + Number(plan.distill);
  return { ratings, cost };
}
export function assess(room: Room, p: Player, plan: Plan): Result {
  const b = briefs(room.round)[plan.brief];
  const { ratings, cost } = calculate(p, plan);
  const reasons = (Object.keys(b.target) as (keyof Ratings)[]).filter(k => ratings[k] < b.target[k]).map(k => `${k[0].toUpperCase() + k.slice(1)} ${ratings[k]} needs to reach ${b.target[k]}.`);
  const success = reasons.length === 0;
  const stretch = success && (b.stretch.stat === 'cost' ? cost + p.bidPaid <= b.stretch.value : ratings[b.stretch.stat] >= b.stretch.value);
  return { round: room.round, brief: b.name, ratings, cost: cost + p.bidPaid, impact: success ? 3 + Number(stretch) : 0, success, stretch, release: plan.release, reasons, lesson: b.lesson };
}
function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export function newPlayer(id: string, name: string, now: number): Player {
  ensure(typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 20, 'Use a lab name with 2–20 characters.');
  return { id, name: name.trim(), credits: 12, research: 0, impact: 0, completed: 0, stretches: 0, upgrades: [], bonus: false, bidPaid: 0, ready: false, results: [], lastSeen: now };
}
export function createRoom(code: string, id: string, name: string, now: number): Room {
  return { code, host: id, revision: 0, round: 0, phase: 'lobby', deadline: 0, created: now, players: [newPlayer(id, name, now)], discoveries: {} };
}
function beginRound(room: Room, now: number) {
  room.round++; room.phase = 'bid'; room.deadline = now + 45000;
  for (const p of room.players) { if (room.round > 1) p.credits += 5; p.bid = undefined; p.bidPaid = 0; p.bonus = false; p.plan = undefined; p.ready = false; }
}
export function priority(room: Room): string[] {
  const ids = room.players.map(p => p.id); const offset = (room.round - 1) % ids.length;
  return [...ids.slice(offset), ...ids.slice(0, offset)];
}
function resolveAuction(room: Room, now: number) {
  const order = priority(room);
  const winners = [...room.players].filter(p => (p.bid ?? 0) > 0).sort((a, b) => (b.bid ?? 0) - (a.bid ?? 0) || order.indexOf(a.id) - order.indexOf(b.id)).slice(0, Math.ceil(room.players.length / 2));
  for (const p of winners) { p.bonus = true; p.bidPaid = p.bid!; p.credits -= p.bid!; }
  room.phase = 'build'; room.deadline = now + 120000;
}
function resolveBuilds(room: Room, now: number) {
  for (const p of room.players) {
    if (!p.plan) { p.results.push({ round: room.round, brief: 'No submission', ratings: { accuracy: 0, efficiency: 0, reliability: 0 }, cost: p.bidPaid, impact: 0, success: false, stretch: false, release: 'commercial', reasons: ['The build timer ended before a model was submitted.'], lesson: 'Your lab remains intact. Try another brief next round.' }); continue; }
    const result = assess(room, p, p.plan); p.results.push(result); p.credits -= calculate(p, p.plan).cost;
    if (result.success) { p.impact += result.impact; p.completed++; p.stretches += Number(result.stretch); p.credits += p.plan.release === 'commercial' ? 6 : 2; p.research += p.plan.release === 'commercial' ? 1 : 3; }
    p.ready = false;
  }
  room.phase = room.round === 6 ? 'finished' : 'reveal'; room.deadline = room.phase === 'finished' ? 0 : now + 90000;
}
export function tick(room: Room, now: number): boolean {
  if (!room.deadline || now < room.deadline) return false;
  if (room.phase === 'bid') resolveAuction(room, now);
  else if (room.phase === 'build') resolveBuilds(room, now);
  else if (room.phase === 'reveal') beginRound(room, now);
  return true;
}
export type Action = { type: string; round?: number; phase?: Phase; name?: string; bid?: number; plan?: Plan; upgrade?: Upgrade | null };
export function act(room: Room, id: string, action: Action, now: number) {
  if (action.type === 'join') {
    if (room.players.some(p => p.id === id)) return;
    ensure(room.phase === 'lobby', 'This match has started. Join the next match.'); ensure(room.players.length < 8, 'This room is full.');
    const p = newPlayer(id, action.name ?? '', now); ensure(!room.players.some(x => x.name.toLowerCase() === p.name.toLowerCase()), 'That lab name is already taken.'); room.players.push(p); return;
  }
  const p = room.players.find(p => p.id === id); ensure(p, 'Join this room first.'); p.lastSeen = now;
  if (action.type === 'claim-host') { const host = room.players.find(p => p.id === room.host); ensure(!host || now - host.lastSeen > 75000, 'The host is still connected.'); room.host = id; return; }
  if (action.type === 'rematch') { ensure(room.host === id && room.phase === 'finished', 'Only the host can start a rematch after the game ends.'); room.players = room.players.map(p => ({ ...newPlayer(p.id, p.name, now), bot: p.bot })); room.discoveries = {}; room.round = 0; room.phase = 'lobby'; room.deadline = 0; return; }
  if (action.type === 'start') { ensure(room.host === id, 'Only the host can start.'); ensure(room.phase === 'lobby' && room.players.length >= 2, 'You need at least two players.'); beginRound(room, now); return; }
  ensure(action.round === room.round && action.phase === room.phase, 'The phase changed. Refresh your choices and try again.');
  if (action.type === 'bid') {
    ensure(room.phase === 'bid', 'Bidding has closed.'); ensure(p.bid === undefined, 'Your bid is already locked.'); ensure(Number.isInteger(action.bid) && action.bid! >= 0 && action.bid! <= 3 && action.bid! <= p.credits, 'Choose an affordable bid from 0 to 3.');
    p.bid = action.bid; if (room.players.every(p => p.bid !== undefined)) resolveAuction(room, now); return;
  }
  if (action.type === 'build') {
    ensure(room.phase === 'build' && !p.plan, 'Your build is locked or the phase has ended.'); const plan = action.plan; ensure(plan, 'Choose a model plan.');
    ensure(Object.hasOwn(MODELS, plan.model), 'Unknown model.');
    for (const k of ['data', 'training', 'evaluation'] as const) ensure(Number.isInteger(plan[k]) && plan[k] >= 0 && plan[k] <= 2, 'Improvement levels must be 0, 1, or 2.');
    ensure(Number.isInteger(plan.brief) && plan.brief >= 0 && plan.brief < 3, 'Choose a valid brief.'); ensure(typeof plan.distill === 'boolean', 'Choose a valid technique.'); ensure(['commercial', 'research'].includes(plan.release), 'Choose a release.');
    ensure(!plan.distill || canDistill(room, p), 'Distillation has not been discovered.'); ensure(calculate(p, plan).cost <= p.credits, 'This build exceeds your credits.');
    p.plan = { ...plan }; if (room.players.every(p => p.plan)) resolveBuilds(room, now); return;
  }
  if (action.type === 'upgrade') {
    ensure(room.phase === 'reveal' && !p.ready, 'Your next-round choice is already locked.');
    if (action.upgrade) { ensure(Object.hasOwn(UPGRADES, action.upgrade), 'Unknown upgrade.'); ensure(!p.upgrades.includes(action.upgrade) && p.research >= 3, 'Upgrade unavailable or insufficient research.'); p.research -= 3; p.upgrades.push(action.upgrade);
      if (action.upgrade === 'distillation' && room.discoveries.distillation === undefined) room.discoveries.distillation = room.round + 2;
    }
    p.ready = true; if (room.players.every(p => p.ready)) beginRound(room, now); return;
  }
  throw new Error('Unknown action.');
}
export function ranked(room: Pick<Room, 'players'>) {
  return [...room.players].sort((a, b) => b.impact - a.impact || b.completed - a.completed || b.stretches - a.stretches);
}
export function winners(room: Room): string[] {
  const first = ranked(room)[0]; return room.players.filter(p => p.impact === first.impact && p.completed === first.completed && p.stretches === first.stretches).map(p => p.id);
}
export type View = Omit<Room, 'players'> & { players: Omit<Player, 'bid' | 'plan'>[]; me: Player; briefs: Brief[]; priority: string[]; bidLocked: string[]; buildLocked: string[]; winners: string[]; serverNow: number; mode: 'local' | 'supabase' };
export function view(room: Room, id: string, now: number, mode: View['mode']): View {
  const me = room.players.find(p => p.id === id); ensure(me, 'Join this room first.');
  return { ...room, players: room.players.map(({ bid: _bid, plan: _plan, ...p }) => p), me: structuredClone(me), briefs: briefs(room.round || 1), priority: priority({ ...room, round: Math.max(1, room.round) }), bidLocked: room.players.filter(p => p.bid !== undefined).map(p => p.id), buildLocked: room.players.filter(p => p.plan).map(p => p.id), winners: room.phase === 'finished' ? winners(room) : [], serverNow: now, mode };
}
// Practice uses the same engine as human matches. Bots submit legal, affordable plans.
export function botPlan(room: Room, p: Player): Plan {
  let best: Plan = { brief: 0, model: 'compact', data: 0, training: 0, evaluation: 0, distill: false, release: room.round % 2 ? 'research' : 'commercial' }; let bestScore = -Infinity;
  for (const model of Object.keys(MODELS) as Plan['model'][]) for (let brief = 0; brief < 3; brief++) for (let data = 0; data <= 2; data++) for (let training = 0; training <= 2; training++) for (let evaluation = 0; evaluation <= 2; evaluation++) for (const distill of [false, true]) {
    const plan = { ...best, brief, model, data, training, evaluation, distill }; if (distill && !canDistill(room, p)) continue;
    const cost = calculate(p, plan).cost; if (cost > p.credits) continue;
    const score = assess(room, p, plan).impact * 20 - cost + (brief === (room.round + room.players.indexOf(p)) % 3 ? 0.1 : 0);
    if (score > bestScore) { best = plan; bestScore = score; }
  } return best;
}
export function driveBots(room: Room, now: number) {
  for (let step = 0; step < 3; step++) {
    const phase = room.phase;
    for (const p of room.players.filter(p => p.bot)) {
      if (room.phase !== phase) break;
      if (phase === 'bid' && p.bid === undefined) act(room, p.id, { type: 'bid', round: room.round, phase, bid: Math.min(p.credits, (room.round + room.players.indexOf(p)) % 3) }, now);
      if (phase === 'build' && !p.plan) act(room, p.id, { type: 'build', round: room.round, phase, plan: botPlan(room, p) }, now);
      if (phase === 'reveal' && !p.ready) act(room, p.id, { type: 'upgrade', round: room.round, phase, upgrade: p.research >= 3 ? (['pipeline', 'bench', 'distillation'] as Upgrade[]).find(u => !p.upgrades.includes(u)) ?? null : null }, now);
    }
    if (room.phase === phase) break;
  }
}
