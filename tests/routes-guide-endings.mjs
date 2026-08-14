import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require('C:/Users/27654/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
const {chromium}=playwright;const chromePath='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(fs.existsSync(chromePath)?{executablePath:chromePath}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',(error)=>errors.push(error.message));page.on('console',(message)=>{if(message.type()==='error')errors.push(message.text());});
const base=process.env.BASE_URL||'http://127.0.0.1:8765/';
await page.goto(base,{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__palmDemo?.DATA?.routeScenes?.length===120);

const routeChoices=await page.evaluate(()=>{
  const g=window.__palmDemo,s=g.state,e=g.engine;
  const reset=()=>{e.events.length=0;e.fixed.clear();s.playerOccupiedProphecies.clear();s.failedDeclarations=0;};
  const check=(setup)=>{reset();setup();return g.chooseStoryArc();};
  return {
    K:check(()=>['a','b','c','d'].forEach((id)=>s.playerOccupiedProphecies.add(id))),
    I:check(()=>e.events.push({type:'duplicate-value',key:'time'},{type:'clock-value'})),
    F:check(()=>e.events.push({type:'attribute-change',key:'identity'})),
    D:check(()=>e.fixed.set('screen.authentic',{value:true})),
    E:check(()=>{e.events.push({type:'line-connected'});s.playerOccupiedProphecies.add('x');}),
    B:check(()=>{e.events.push({type:'test-contact'});e.fixed.set('cup.toxic',{value:false});}),
    C:check(()=>e.fixed.set('gun.rounds',{value:true})),
    G:check(()=>e.events.push({type:'cross',material:'water',line:'blue'})),
    H:check(()=>e.events.push({type:'reflection'},{type:'reflection'})),
    J:check(()=>{e.fixed.set('red_line.intact',{value:true});e.events.push({type:'mark'},{type:'mark'},{type:'mark'});}),
    A:check(()=>{s.failedDeclarations=1;}),
    L:check(()=>{})
  };
});
assert.deepEqual(routeChoices,{K:'K',I:'I',F:'F',D:'D',E:'E',B:'B',C:'C',G:'G',H:'H',J:'J',A:'A',L:'L'});

const sceneAudit=await page.evaluate(()=>{
  const g=window.__palmDemo,s=g.state,e=g.engine;const result=[];
  s.tutorialDone=true;
  for(const scene of g.DATA.routeScenes){
    s.storyArc=scene.layer8;s.storyLockedAt=1;s.room=scene.room;
    const applied=g.applyRouteScene();const anchor=g.objectState.get(s.sceneAnchorId);const before=e.events.length;
    g.sceneAction(anchor);
    result.push({id:scene.id,matched:applied?.id===scene.id,anchor:!!anchor,event:e.events.length===before+1,hidden:s.sceneHidden.has(scene.missingFragment),plot:scene.plot});
  }
  return result;
});
assert.equal(sceneAudit.length,120);
assert(sceneAudit.every((entry)=>entry.matched&&entry.anchor&&entry.event&&entry.hidden),JSON.stringify(sceneAudit.filter((entry)=>!(entry.matched&&entry.anchor&&entry.event&&entry.hidden)).slice(0,3)));
assert.equal(new Set(sceneAudit.map((entry)=>entry.plot)).size,120);

const endings=await page.evaluate(()=>{
  const g=window.__palmDemo,s=g.state;const categories=[
    [...g.objectState.values()].find((o)=>o.tags.includes('gun')),
    [...g.objectState.values()].find((o)=>o.tags.includes('sound')),
    [...g.objectState.values()].find((o)=>o.template==='chalk'),
    [...g.objectState.values()].find((o)=>o.tags.includes('evidence')),
    [...g.objectState.values()].find((o)=>o.template==='prism')
  ];
  const found=[];
  for(let a=0;a<5;a+=1)for(let b=0;b<5;b+=1){
    for(const o of g.objectState.values())o.holder=null;
    categories[a].holder='player';s.hands=[categories[a].id];s.meaningfulDeclarations=b;s.ended=false;s.playing=true;g.finish();
    found.push(document.querySelector('#ending-title').textContent);
  }
  return found;
});
assert.deepEqual(endings,await page.evaluate(()=>window.__palmDemo.DATA.endings.map((ending)=>ending.title)));

await page.goto(new URL('guide.html',base).href,{waitUntil:'networkidle'});
await page.waitForTimeout(400);
assert.equal(errors.length,0,errors.join('; '));
assert.equal(await page.locator('#route-list .scene').count(),120);
assert.equal(await page.locator('#prophecy-list .prophecy').count(),30);
assert.equal(await page.locator('#object-list .object').count(),339);
assert.equal(await page.locator('#ending-list .card').count(),25);
assert.match(await page.textContent('#plain-rules'),/言出法随/);
await page.screenshot({path:path.resolve(import.meta.dirname,'..','qa-guide.png'),fullPage:true});
await browser.close();
console.log('PASS: 12 route selectors, 120 distinct interactive scenes, 25 reachable endings, complete guide indexes');
