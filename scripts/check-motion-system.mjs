import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('public'),output=path.resolve('.superpowers/motion-qa');await mkdir(output,{recursive:true});
const seed=await (await fetch('http://127.0.0.1:13301/dashboard/api/state')).json();
seed.server.aiVoiceOwner=true;
seed.categories.push({key:'serverstats',name:'Server Stats',enabled:true,enabledCommands:1,totalCommands:1,commands:[{name:'serverstats',description:'Synthetic counter command',enabled:true,protected:false}]});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
const routes=['overview','safety','greetings','leveling','logging','youtube','faith','ai-voice','operations','module-counting','module-economy','module-moderation','module-ticket','module-serverstats'];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif'};
async function setup({width=1440,reducedMotion='no-preference'}={}){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion});const errors=[];
 await context.addInitScript(()=>{
  window.__coreDraws=0;
  if(window.WebGLRenderingContext){const draw=WebGLRenderingContext.prototype.drawArrays;WebGLRenderingContext.prototype.drawArrays=function(...args){window.__coreDraws++;return draw.apply(this,args);};}
 });
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!=='http://dashboard.test')return route.fulfill({status:204});
  if(u.pathname==='/dashboard/api/state')return route.fulfill({json:structuredClone(seed)});
  // Complete synthetic feature states, so every route is reviewed with working
  // controls as well as the failure/empty states covered by feedback checks.
  if(u.pathname==='/dashboard/api/ai-voice')return route.fulfill({json:{settings:{enabled:false,webResearch:false,allowedRoleIds:[],allowedChannelIds:[],voice:'en_US-ljspeech-high',maxSessionSeconds:600},helper:{ready:false},session:{state:'idle'},roles:[],channels:[],voices:[]}});
  if(u.pathname==='/dashboard/api/faith')return route.fulfill({json:{config:{enabled:false,channelId:null,discussionChannelId:null,time:'08:00',timezone:'Asia/Jerusalem',translation:'WEB'},channels:[],verse:{text:'Synthetic verse preview for interface checks.',reference:'QA preview',source:'https://example.com/'},today:'2026-10-19',collectionSize:31,delivery:{lastError:null,entries:[]}}});
  if(u.pathname.startsWith('/dashboard/api/')||u.pathname.startsWith('/dashboard/auth/')){
   if(route.request().method()!=='GET')return route.fulfill({status:403,json:{error:'Writes are blocked in motion QA'}});
   const r=await fetch('http://127.0.0.1:13301'+u.pathname+u.search);return route.fulfill({status:r.status,body:await r.text(),contentType:'application/json'});
  }
  const file=path.resolve(root,u.pathname.replace(/^\/dashboard\//,'')||'index.html');if(!file.startsWith(root+path.sep))return route.abort();
  try{return route.fulfill({body:await readFile(file),contentType:mime[path.extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404});}
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.goto('http://dashboard.test/dashboard/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.body.dataset.dashboardReady==='true');
 return {context,page,errors};
}
try{
 const f=await setup(),p=f.page;
 for(const route of routes){
  await p.locator(`[data-page="${route}"]`).click();
  await p.waitForFunction(r=>document.body.dataset.motionRoute===r,route);
  const panel=route.startsWith('module-')?'module':route;
  assert.equal(await p.locator(`[data-panel="${panel}"]`).isVisible(),true,route);
  assert.equal(await p.locator('[data-panel].active').count(),1);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,route+' overflow');
  await p.waitForTimeout(500);
  await p.screenshot({path:path.join(output,route+'-desktop.png')});
  console.log('PASS route: '+route);
 }
 await p.locator('[data-page="safety"]').click();await p.waitForFunction(()=>location.hash==='#safety');
 await p.evaluate(()=>document.querySelector('[data-page="leveling"]').click());
 assert.equal(await p.locator('[data-panel="safety"]').isVisible(),true,'exit keeps the old route mounted');
 await p.waitForFunction(()=>document.body.dataset.motionRoute==='leveling');
 await p.locator('[data-page="safety"]').click();await p.waitForFunction(()=>document.body.dataset.motionRoute==='safety');
 await p.locator('[data-page="leveling"]').click();await p.waitForFunction(()=>location.hash==='#leveling');
 await p.goBack();await p.waitForFunction(()=>document.querySelector('[data-panel="safety"]').classList.contains('active'));
 await p.goForward();await p.waitForFunction(()=>document.querySelector('[data-panel="leveling"]').classList.contains('active'));
 await p.evaluate(()=>location.hash='dashboard-main');await p.waitForTimeout(50);
 assert.equal(await p.locator('[data-panel="leveling"]').isVisible(),true,'native anchors must not change routes');
 await p.evaluate(()=>{document.querySelector('[data-page="safety"]').click();document.querySelector('[data-page="logging"]').click();document.querySelector('[data-page="greetings"]').click();});
 await p.waitForFunction(()=>document.body.dataset.motionRoute==='greetings');
 await p.evaluate(()=>{document.querySelector('[data-page="safety"]').click();document.querySelector('[data-page="greetings"]').click();});
 await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>document.body.dataset.motionRoute),'greetings','returning to current route cancels an in-flight exit');
 await p.waitForTimeout(600);
 await p.locator('#open-control-search').click();await p.locator('#control-search-input').fill('leveling');await p.keyboard.press('Escape');
 await p.waitForFunction(()=>!document.querySelector('#control-search-dialog').open);
 assert.equal(await p.evaluate(()=>document.querySelectorAll('.motion-closing').length),0);
 await p.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
 await p.locator('[data-page="overview"]').click();await p.waitForFunction(()=>document.body.dataset.motionRoute==='overview');
 await p.waitForTimeout(700);
 const before=await p.evaluate(()=>{const c=document.querySelector('#metrics .metric');window.__metric=c;return c.getAnimations().length;});assert.equal(before,0);
 await p.evaluate(()=>render(state));await p.waitForTimeout(100);
 assert.equal(await p.evaluate(()=>window.__metric===document.querySelector('#metrics .metric')&&window.__metric.getAnimations().length===0),true,'refresh keeps metric identity and does not replay entrances');
 await p.locator('[data-page="leveling"]').click();await p.waitForFunction(()=>document.body.dataset.motionRoute==='leveling');
 assert(await p.evaluate(()=>{
  state.roles.push({id:'123456789012345678',name:'QA role',color:'#c3a0f0'});
  levelRewardDraft=[{level:5,roleId:'123456789012345678'},{level:10,roleId:'123456789012345678'}];renderLevelRewards();
  const row=document.querySelector('[data-reward-key="5"]');
  levelRewardDraft.push({level:1,roleId:'123456789012345678'});renderLevelRewards();
  return row===document.querySelector('[data-reward-key="5"]')&&document.querySelector('[data-reward-key]').dataset.rewardKey==='1';
 }),'sorted rewards preserve row identity');
 await p.locator('[data-page="logging"]').click();await p.waitForFunction(()=>document.body.dataset.motionRoute==='logging');
 const group=p.locator('.logging-group').first();const summary=group.locator('summary');
 await summary.click();await summary.click();await p.waitForTimeout(400);assert.equal(await group.getAttribute('open'),'');
 assert.equal(await group.evaluate(el=>el.style.height),'','rapid details toggles leave no fixed height');
 await p.locator('[data-page="greetings"]').click();await p.waitForFunction(()=>document.body.dataset.motionRoute==='greetings');
 await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(350);
 const draws=await p.evaluate(()=>window.__coreDraws);await p.waitForTimeout(300);
 assert.equal(await p.evaluate(()=>window.__coreDraws),draws,'offscreen command cores pause rendering');
 await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
 assert.equal(await p.locator('.command-core-canvas').count(),0,'page exit releases canvases');
 assert.equal(await p.locator('.motion-enter').count(),0,'page exit clears transient motion classes');
 assert.deepEqual(f.errors,[]);await f.context.close();
 const mobile=await setup({width:390});
 for(const route of routes){
  await mobile.page.locator('#mobile-navigation').click();await mobile.page.locator(`[data-page="${route}"]`).click();
  await mobile.page.waitForFunction(r=>document.body.dataset.motionRoute===r&&!document.body.classList.contains('navigation-open'),route);
  await mobile.page.waitForTimeout(500);
  assert(await mobile.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' mobile overflow');
  await mobile.page.screenshot({path:path.join(output,route+'-mobile.png')});
 }
 await mobile.page.locator('#mobile-navigation').click();await mobile.page.locator('[data-page="leveling"]').click();await mobile.page.waitForTimeout(700);
 await mobile.page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});assert.deepEqual(mobile.errors,[]);await mobile.context.close();
 const reduced=await setup({reducedMotion:'reduce'});await reduced.page.locator('[data-page="logging"]').click();await reduced.page.waitForFunction(()=>document.body.dataset.motionRoute==='logging');
 assert.equal(await reduced.page.locator('.command-core-canvas').count(),0);assert.deepEqual(reduced.errors,[]);await reduced.context.close();
 console.log('PASS: all routes, history, rapid navigation, dialog cleanup, stable refresh, mobile and reduced motion.');
}finally{await browser.close();}
