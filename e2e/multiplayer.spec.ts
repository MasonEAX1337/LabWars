import { test, expect, type Page } from '@playwright/test';
import { act, botPlan, createRoom, MODELS, type Plan } from '../shared/game';
async function configureBuild(page: Page, plan: Plan) {
  await page.locator('.brief').nth(plan.brief).click();
  await page.getByRole('button', { name: new RegExp('^' + MODELS[plan.model].name) }).click();
  for(const [key,title] of [['data','Better data'],['training','More training'],['evaluation','Evaluation & fixes']] as const)
    for(let n=0;n<plan[key];n++) await page.getByRole('button',{name:`Increase ${title}`,exact:true}).click();
  if(plan.distill) await page.locator('.technique input').check();
  if(plan.release==='research') await page.getByRole('button',{name:/^Open research/}).click();
}
test('separate desktop and phone players complete six rounds, reconnect, and rematch', async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext({viewport:{width:1440,height:1000}}),browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})]);
  const [a,b] = await Promise.all(contexts.map(c=>c.newPage())); const errors:string[]=[];
  for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  await a.goto('http://localhost:5173');await a.getByLabel('Your lab name').fill('Gradient Garage');await a.getByRole('button',{name:'Create room',exact:true}).click();
  const code=await a.locator('.room-code strong').innerText();await b.goto('http://localhost:5173');await b.getByLabel('Your lab name').fill('Tensor Shed');await b.getByLabel('Room code',{exact:true}).fill(code);await b.getByRole('button',{name:'Join room',exact:true}).click();
  await expect(a.getByText('Tensor Shed',{exact:true})).toBeVisible();await a.getByRole('button',{name:'Start the match',exact:true}).click();
  const simulation=createRoom('ABC234','a','Gradient Garage',0);act(simulation,'b',{type:'join',name:'Tensor Shed'},0);act(simulation,'a',{type:'start'},1);
  for(let round=1;round<=6;round++){
    await Promise.all([a,b].map(p=>p.getByRole('button',{name:'Pass this auction',exact:true}).click()));
    for(const p of simulation.players) act(simulation,p.id,{type:'bid',round,phase:'bid',bid:0},2);
    const plans=simulation.players.map(p=>({...botPlan(simulation,p),release:round===1?'research' as const:'commercial' as const}));
    await Promise.all([a,b].map((page,i)=>configureBuild(page,plans[i])));
    for(let i=0;i<2;i++)act(simulation,simulation.players[i].id,{type:'build',round,phase:'build',plan:plans[i]},3);
    await a.getByRole('button',{name:'Submit model',exact:true}).click();
    if(round===1){await a.reload();await expect(a.getByRole('heading',{name:'Model submitted.'})).toBeVisible();}
    await b.getByRole('button',{name:'Submit model',exact:true}).click();
    if(round<6){
      if(round===1) await Promise.all([a,b].map(p=>p.getByRole('button',{name:/^Distillation/}).click()));
      else await Promise.all([a,b].map(p=>p.getByRole('button',{name:'Save research & continue',exact:true}).click()));
      for(const p of simulation.players)act(simulation,p.id,{type:'upgrade',round,phase:'reveal',upgrade:round===1?'distillation':null},4);
    }
  }
  await expect(a.getByRole('heading',{name:'Gradient Garage & Tensor Shed win.'})).toBeVisible();
  expect(await a.locator('.roster .player-score').allTextContents()).toEqual(simulation.players.map(p=>`${p.impact} Impact`));
  expect(simulation.players.every(p=>p.impact<24)).toBe(true);
  expect(await b.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect(errors).toEqual([]);
  await a.getByRole('button',{name:'Return to lobby',exact:true}).click();await expect(b.getByRole('heading',{name:'The lab is open.'})).toBeVisible();
  await Promise.all(contexts.map(c=>c.close()));
});
