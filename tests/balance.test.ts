import { describe, expect, it } from 'vitest';
import { act, assess, botPlan, briefs, createRoom, MODELS, type Plan } from '../shared/game';
function plans(): Plan[] {
  const all: Plan[] = [];
  for (const model of Object.keys(MODELS) as Plan['model'][]) for (let brief=0;brief<3;brief++) for(let data=0;data<=2;data++) for(let training=0;training<=2;training++) for(let evaluation=0;evaluation<=2;evaluation++) for(const distill of [false,true]) all.push({model,brief,data,training,evaluation,distill,release:'commercial'});
  return all;
}
const recipes = plans();
describe('changing round tradeoffs', () => {
  it('makes every one of the 18 stretch goals attainable with legal techniques', () => {
    const r=createRoom('ABC234','a','Alpha',0), p=r.players[0];
    for(let round=1;round<=6;round++) {
      r.round=round; p.upgrades=round>1?['pipeline','bench','distillation']:[]; p.bonus=true; p.bidPaid=1;
      for(let brief=0;brief<3;brief++) expect(recipes.some(plan=>plan.brief===brief && (!plan.distill||round>1) && assess(r,p,plan).impact===4 && assess(r,p,plan).cost<=12), `${round}: ${briefs(round)[brief].name}`).toBe(true);
    }
  });
  it('allows an affordable adaptive route to win through final-round accelerator access', () => {
    const r=createRoom('ABC234','a','Alpha',0);act(r,'b',{type:'join',name:'Beta'},0);act(r,'a',{type:'start'},1);
    for(let round=1;round<=6;round++) {
      for(const p of r.players)act(r,p.id,{type:'bid',round,phase:'bid',bid:round===6&&p.id==='a'?1:0},2);
      for(const p of r.players)act(r,p.id,{type:'build',round,phase:'build',plan:{...botPlan(r,p),release:round===1?'research':'commercial'}},3);
      if(round<6)for(const p of r.players)act(r,p.id,{type:'upgrade',round,phase:'reveal',upgrade:round===1?'distillation':null},4);
    }
    expect(r.players.map(p=>p.impact)).toEqual([24,23]);
    expect(r.players.every(p=>p.credits>=0 && p.completed===6)).toBe(true);
  });
  it('blocks the original commercial language recipe from a perfect match', () => {
    const r=createRoom('ABC234','a','Alpha',0), p=r.players[0];
    const original: Plan={brief:1,model:'balanced',data:2,training:1,evaluation:2,distill:false,release:'commercial'};
    const points=Array.from({length:6},(_,i)=>{r.round=i+1;return assess(r,p,original).impact;});
    expect(points).toEqual([4,3,0,0,0,0]);
  });
  it('prevents any fixed recipe from sweeping six rounds, even with all upgrades and compute', () => {
    const r=createRoom('ABC234','a','Alpha',0), p=r.players[0];p.bonus=true;p.bidPaid=1;
    for(const recipe of recipes){let score=0;for(let round=1;round<=6;round++){r.round=round;p.upgrades=round>1?['pipeline','bench','distillation']:[];if(recipe.distill&&round===1)continue;score+=assess(r,p,recipe).impact;}expect(score).toBeLessThan(24);}
  });
  it('makes accelerator access necessary for every final-round stretch, even with every upgrade', () => {
    const r=createRoom('ABC234','a','Alpha',0), p=r.players[0];r.round=6;p.upgrades=['pipeline','bench','distillation'];
    expect(Math.max(...recipes.map(plan=>assess(r,p,plan).impact))).toBe(3);
    p.bonus=true;p.bidPaid=1;
    for(let brief=0;brief<3;brief++)expect(recipes.some(plan=>plan.brief===brief && assess(r,p,plan).impact===4)).toBe(true);
  });
});
