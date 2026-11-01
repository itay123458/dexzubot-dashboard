// Local, unauthenticated Pages review. All URLs are fulfilled from dist or mocked.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve('dist'), output = path.resolve('.superpowers/public-signin');
await mkdir(output, { recursive:true });
const site = 'https://itay123458.github.io/dexzubot-dashboard/';
const backend = 'https://ik.tailce7102.ts.net/dashboard/';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2' };
const browser = await chromium.launch({ executablePath:process.env.CHROMIUM_PATH, headless:true });
try {
  for (const reducedMotion of ['no-preference','reduce']) {
    const context = await browser.newContext({ reducedMotion, viewport:{width:1440,height:900} });
    const assets = [], errors = [], privateRequests = [];
    await context.route(site+'**', async route => {
      const file = new URL(route.request().url()).pathname.slice('/dexzubot-dashboard/'.length) || 'index.html';
      assets.push(file);
      await route.fulfill({ contentType:mime[path.extname(file)], body:await readFile(path.join(root,file)) });
    });
    await context.route(backend+'**', async route => { privateRequests.push(route.request().url()); await route.fulfill({status:route.request().url().includes('auth/login?')?200:401,body:'Mock sign-in destination'}); });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
    await page.goto(site+'#overview');
    await page.locator('.story-enhanced').waitFor();
    await page.evaluate(async () => { await Promise.all(document.getAnimations().map(a => a.finished.catch(()=>{}))); });
    assert.equal(await page.locator('h1:visible').textContent(),'Manage your Discord server in one place.');
    assert.equal(await page.locator('[data-discord-signin]').count(),2);
    assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex,nofollow,noarchive');
    assert.deepEqual(privateRequests,[]);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.story-skip-link').evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#story-intro').evaluate(el=>el===document.activeElement),true);
    assert.equal(assets.includes('app.js'),false);
    assert.equal(assets.includes('motion.js'),false);
    assert.equal(assets.filter(file=>file.endsWith('.css')).length,2);
    assert.equal(assets.some(file=>file.endsWith('.woff2')),false);
    const favicon = await page.locator('link[rel=icon]').getAttribute('href');
    assert.ok(favicon.startsWith('/dexzubot-dashboard/'));
    assert.equal((await page.request.get(new URL(favicon,site).href)).status(),200);
    for (const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>scrollTo(0,0));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
      assert.ok(await page.locator('.story-access').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=13));
      for(const button of await page.locator('[data-discord-signin]').all()) assert.equal(await button.evaluate(el=>getComputedStyle(el).fontSize),'14px');
      assert.ok(await page.locator('.story-intro-copy').evaluate(el=>el.getBoundingClientRect().bottom<document.getElementById('pages-signin-button').getBoundingClientRect().top));
      await page.screenshot({path:path.join(output,`${width}-${reducedMotion}-fold.png`)});
      if(width===390 || width===1440) await page.screenshot({path:path.join(output,`${width}-${reducedMotion}-full.png`),fullPage:true});
    }
    // Every demo remains clearly labelled; static layouts show all three.
    assert.equal(await page.locator('.story-demo:visible').count(),3);
    for(const demo of await page.locator('.story-demo').all()) assert.match(await demo.locator('.sample-label').textContent(),/SAMPLE/);
    if(reducedMotion==='reduce') {
      assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
      assert.equal(assets.includes('command-core.js'),false);
    }
    await page.setViewportSize({width:1440,height:900});
    if(reducedMotion==='no-preference') {
      for(const step of ['0','1','2']) {
        const control=page.locator(`.story-step-button[data-step="${step}"]`);
        await control.click();
        await page.waitForFunction(step=>document.querySelector(`.story-step-button[data-step="${step}"]`).getAttribute('aria-pressed')==='true',step);
        assert.ok(await page.locator(`.story-demo[data-step="${step}"]`).isVisible());
      }
    }
    // Conservative contrast backgrounds: brightest surface behind each sample.
    const contrast = await page.evaluate(()=>{
      const luminance = rgb => rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
      return ['.story-access','.story-session-note','.story-intro-copy','.sample-label','.demo-log small','.demo-chart-days','#pages-signin-button','.story-step-button'].map(selector=>{
        const el=document.querySelector(selector), color=getComputedStyle(el).color.match(/[\d.]+/g).slice(0,3).map(Number);
        const bg=el.matches('[data-discord-signin]')?[101,180,255]:(el.closest('.story-demo')?[32,46,66]:[16,23,34]);
        const a=luminance(color),b=luminance(bg);
        return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
      });
    });
    for(const {selector,ratio} of contrast) assert.ok(ratio>=4.5,`${selector} contrast ${ratio}`);
    await page.locator('.story-brand').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.story-header-link').evaluate(el=>el===document.activeElement),true);
    assert.notEqual(await page.locator('.story-header-link').evaluate(el=>getComputedStyle(el).outlineStyle),'none');
    for(const button of await page.locator('[data-discord-signin]').all()) {
      await button.focus();
      assert.notEqual(await button.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
      assert.ok(await button.evaluate(el=>el.getBoundingClientRect().height>=44));
      await page.evaluate(()=>{
        window.originalStorageSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){if(key==='dexzu.pages.verifier.v1')throw Error('blocked');return window.originalStorageSet.call(this,key,value);};
      });
      await page.keyboard.press('Enter');
      for(const status of await page.locator('#pages-signin-status,#pages-signin-footer-status').all()) assert.match(await status.textContent(),/Allow storage/);
      assert.equal(await page.locator('[data-discord-signin]:disabled').count(),0);
      await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSet;});
    }
    // Hold PKCE generation to inspect both controls before navigation happens.
    await page.evaluate(()=>{
      const digest=crypto.subtle.digest.bind(crypto.subtle);
      crypto.subtle.digest=(...args)=>new Promise(resolve=>{window.finishDigest=()=>resolve(digest(...args));});
    });
    await page.locator('#pages-signin-footer-button').click();
    assert.equal(await page.locator('[data-discord-signin]:disabled').count(),2);
    assert.equal(await page.locator('[data-discord-signin][aria-busy=true]').count(),2);
    await page.evaluate(()=>window.finishDigest());
    await page.waitForURL(backend+'auth/login?**');
    const login = new URL(page.url());
    assert.equal(login.searchParams.get('pages'),'1');
    assert.equal(login.searchParams.get('challenge').length,43);
    assert.deepEqual(errors,[]);
    await context.close();
  }
  for (const failedAsset of ['style.css','navigation-motion.js']) {
    const context=await browser.newContext();
    const requested=[];
    await context.addInitScript(()=>localStorage.setItem('dexzu.pages.session.v1','s'.repeat(43)));
    await context.route(site+'**',async route=>{
      const file=new URL(route.request().url()).pathname.slice('/dexzubot-dashboard/'.length)||'index.html';
      requested.push(file);
      if(file===failedAsset)return route.abort('failed');
      await route.fulfill({contentType:mime[path.extname(file)],body:await readFile(path.join(root,file))});
    });
    await context.route(backend+'**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({public:true,user:{id:'123456789012345678',username:'Synthetic owner'}})}));
    const page=await context.newPage();
    await page.goto(site+'#greetings');
    await page.locator('#pages-signin-status').filter({hasText:'Refresh this page to try again'}).waitFor();
    assert.equal(await page.locator('.app-shell').isVisible(),false,'asset failure must keep the dashboard hidden');
    assert.equal(requested.includes('app.js'),false,'later scripts must not execute after a failed dependency');
    assert.equal(await page.locator('[data-discord-signin]:disabled').count(),0);
    await context.close();
  }
  console.log('PASS: public Pages at 1440/768/390/320, labelled demos, contrast/focus/touch, both sign-in states, reduced motion, favicon, deferred assets and load-failure recovery. No unexpected console errors; no real Discord session used.');
} finally { await browser.close(); }
