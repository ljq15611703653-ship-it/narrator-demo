import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require('C:/Users/27654/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}
const { chromium } = playwright;

const base = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const root = path.resolve(import.meta.dirname, '..');
const chromePath='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless:true, ...(fs.existsSync(chromePath)?{executablePath:chromePath}:{}) });
const page = await browser.newPage({ viewport:{ width:1440, height:1000 } });
const errors = [];
page.on('console', (message)=>{ if(message.type()==='error') errors.push(message.text()); });
page.on('pageerror', (error)=>errors.push(error.message));

await page.goto(base, { waitUntil:'networkidle' });
await page.waitForFunction(()=>window.__palmDemo?.DATA?.stats?.objects > 300);
assert.deepEqual(await page.evaluate(()=>window.__palmDemo.audit()), []);
assert.equal(await page.textContent('#tutorial-title'), '先试着走动');

await page.keyboard.down('d');
await page.waitForTimeout(500);
await page.keyboard.up('d');
await page.click('#tutorial-next');

await page.evaluate(()=>{
  const game=window.__palmDemo;
  game.state.x=190;game.state.y=330;game.select('thread_0');
});
await page.getByRole('button', { name:'拿起', exact:true }).click();
assert.equal(await page.evaluate(()=>window.__palmDemo.objectState.get('thread_0').holder), 'player');
await page.click('#tutorial-next');
await page.getByRole('button', { name:'放下', exact:true }).click();
await page.click('#tutorial-next');

await page.evaluate(()=>{
  const game=window.__palmDemo;
  game.state.x=415;game.state.y=180;game.select('bell_1');
});
await page.getByRole('button', { name:'摇响', exact:true }).click();
await page.click('#tutorial-next');

await page.evaluate(()=>{
  const game=window.__palmDemo;
  game.state.x=190;game.state.y=330;game.select('thread_0');
});
await page.getByRole('button', { name:/这条红线现在是完整的/ }).click();
await page.click('#tutorial-next');
assert.equal(await page.textContent('#tutorial-title'), '它有清楚的边界');
await page.click('#tutorial-next');
assert.equal(await page.textContent('#tutorial-title'), '声音负责过去');
await page.click('#tutorial-next');
await page.click('#tutorial-next');
assert.equal(await page.textContent('#tutorial-title'), '未来会完整发生');
assert.match(await page.textContent('#prophecy-text'), /第三次铃响/);
await page.click('#tutorial-next');
await page.click('#tutorial-next');
assert(await page.locator('#tutorial-card').evaluate((node)=>node.classList.contains('hidden')));

await page.keyboard.press('p');
const pausedBefore=await page.evaluate(()=>window.__palmDemo.state.time);
await page.waitForTimeout(250);
const pausedAfter=await page.evaluate(()=>window.__palmDemo.state.time);
assert(Math.abs(pausedAfter-pausedBefore)<0.05,'P must pause real time');
await page.keyboard.press('p');
assert.equal(await page.locator('#llm-enable').isVisible(),true,'fallback mode must expose the real local-LLM loader');

await page.keyboard.press('Enter');
assert.equal(await page.evaluate(()=>window.__palmDemo.state.typing), true);
const before = await page.evaluate(()=>window.__palmDemo.state.time);
await page.waitForTimeout(350);
const after = await page.evaluate(()=>window.__palmDemo.state.time);
assert(Math.abs(after-before) < 0.05, 'time must pause while typing');
await page.fill('#utterance-input', '这句话没有任何验证路径');
await page.keyboard.press('Enter');
assert.match(await page.locator('#event-log').textContent(), /没有透露目标状态/);

await page.screenshot({ path:path.join(root,'qa-desktop.png'), fullPage:true });
assert.equal(errors.length, 0, `browser errors: ${errors.join('; ')}`);

const mobile = await browser.newPage({ viewport:{ width:390, height:844 }, isMobile:true });
await mobile.goto(base, { waitUntil:'networkidle' });
const mobileBefore=await mobile.evaluate(()=>({x:window.__palmDemo.state.x,y:window.__palmDemo.state.y}));
await mobile.locator('#game').click({position:{x:12,y:150}});
const mobileAfter=await mobile.evaluate(()=>({x:window.__palmDemo.state.x,y:window.__palmDemo.state.y}));
assert.notDeepEqual(mobileAfter,mobileBefore,'tap on the scene must move the player on mobile');
await mobile.screenshot({ path:path.join(root,'qa-mobile.png'), fullPage:true });
assert.equal(await mobile.locator('#tutorial-card').isVisible(), true);

await browser.close();
console.log('PASS: tutorial, declaration, past collapse, prophecy, pause-on-input, desktop and mobile render');
