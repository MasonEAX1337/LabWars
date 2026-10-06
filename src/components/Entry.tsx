import { useState } from 'react';
import { FlaskConical, Users, Cpu } from 'lucide-react';
import type { View } from '../../shared/game';
import * as client from '../client';
export function Entry({ enter, rules }: { enter: (v: View) => void; rules: () => void }) {
  const [name, setName] = useState(sessionStorage.getItem('labwars.name') ?? '');
  const [code, setCode] = useState(new URLSearchParams(location.search).get('room') ?? '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function go(type: 'create' | 'join' | 'practice') {
    setBusy(true); setError('');
    try { const v = type === 'join' ? await client.join(code.toUpperCase(), name) : await client.create(name, type === 'practice'); sessionStorage.setItem('labwars.name', name); enter(v); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main className="entry"><div className="entry-copy"><div className="brand large">LAB <span>WARS</span><small>Neural Foundry</small></div><h1>A tiny lab.<br/>An unfair ambition.</h1><p>Build useful AI. Outthink rival labs. Discover why bigger doesn’t always mean better.</p><div className="entry-facts"><span><Users size={17}/>2–8 players</span><span><Cpu size={17}/>6 rounds</span><span><FlaskConical size={17}/>15–20 minutes</span></div><button className="text-button" onClick={rules}>Learn the rules</button></div>
    <section className="entry-form"><h2>Start something.</h2><p className="muted">One room code. Everyone brings their own device.</p><label htmlFor="name">Your lab name</label><input id="name" autoComplete="nickname" maxLength={20} placeholder="e.g. Gradient Garage" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && name.trim().length >= 2 && !busy) void go('create'); }}/><button className="primary" disabled={busy || name.trim().length < 2} onClick={() => go('create')}>Create room</button><div className="divider"><span>or join your friends</span></div><label htmlFor="code">Room code</label><div className="join-row"><input id="code" className="code-input" autoCapitalize="characters" maxLength={6} placeholder="ABC234" value={code} onChange={e => setCode(e.target.value.replace(/[^a-z2-9]/gi, '').toUpperCase())} onKeyDown={e => { if (e.key === 'Enter' && code.length === 6 && name.trim().length >= 2 && !busy) void go('join'); }}/><button disabled={busy || code.length !== 6 || name.trim().length < 2} onClick={() => go('join')}>Join room</button></div><button className="practice" disabled={busy || name.trim().length < 2} onClick={() => go('practice')}>Practice with two automated labs</button>{error ? <p role="alert" className="error">{error}</p> : null}{busy ? <p role="status" className="muted">Connecting to your lab…</p> : null}</section></main>;
}
