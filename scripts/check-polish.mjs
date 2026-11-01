// Synthetic browser verification. The preview must use scripts/fixtures/dashboard-server.mjs.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/dashboard/api/**', route => route.request().method() === 'GET' ? route.continue() : route.abort());
  await page.goto(process.env.DASHBOARD_QA_URL || 'http://127.0.0.1:13302/dashboard/');
  await page.waitForFunction(() => document.body.dataset.dashboardReady === 'true');
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const switches = await page.locator('.page.active .switch').evaluateAll(labels => labels.filter(label => label.getClientRects().length).map(label => {
      const track = label.querySelector('span'), input = label.querySelector('input');
      const trackBox = track.getBoundingClientRect(), labelBox = label.getBoundingClientRect();
      const thumb = getComputedStyle(track, '::after');
      const shift = thumb.transform === 'none' ? 0 : new DOMMatrix(thumb.transform).m41;
      return { checked: input.checked, trackWidth: trackBox.width, trackHeight: trackBox.height, labelWidth: labelBox.width,
        left: parseFloat(thumb.left) + shift, right: parseFloat(thumb.left) + shift + parseFloat(thumb.width),
        top: parseFloat(thumb.top), bottom: parseFloat(thumb.top) + parseFloat(thumb.height) };
    }));
    assert.ok(switches.length);
    for (const item of switches) {
      assert.ok(item.left >= 1 && item.right <= item.trackWidth - 1, `Switch thumb stays inside track at ${width}px: ${JSON.stringify(item)}`);
      assert.ok(item.top >= 1 && item.bottom <= item.trackHeight - 1, `Switch thumb fits vertically at ${width}px`);
      assert.ok(item.trackWidth <= item.labelWidth, 'The track fits its click target');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await page.locator('#overview-setup-list [data-setup-row]').count(), 3);
  assert.equal(await page.locator('#overview-welcome-status').textContent(), 'Off');
  assert.equal(await page.locator('#overview-logging-status').textContent(), 'Off');
  assert.equal(await page.locator('#overview-spam-status').textContent(), 'Off');
  assert.match(await page.locator('#overview-health-summary').textContent(), /5 checks need attention/);
  assert.ok(await page.locator('#overview-updated').getAttribute('datetime'));
  const fetchedAt = await page.locator('#overview-updated').getAttribute('datetime');
  await page.evaluate(() => {
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [NativeDate.now() + 7200000])); }
      static now() { return NativeDate.now() + 7200000; }
    };
    try { render(state); } finally { window.Date = NativeDate; }
  });
  assert.equal(await page.locator('#overview-updated').getAttribute('datetime'), fetchedAt, 'Local rerenders never claim a new server refresh');
  await page.evaluate(() => {
    const next = structuredClone(state);
    next.greetings.welcomeEnabled = true; next.greetings.welcomeChannelId = null;
    next.logging.enabled = true; next.logging.moderationChannelId = null; next.logging.serverChannelId = null;
    next.operations.health = null;
    window.dispatchEvent(new CustomEvent('dexzu-state', { detail: next }));
  });
  assert.equal(await page.locator('#overview-welcome-status').textContent(), 'Choose a channel');
  assert.equal(await page.locator('#overview-logging-status').textContent(), 'Choose a channel');
  assert.equal(await page.locator('#overview-health-summary').textContent(), 'Diagnostics not checked yet');
  await page.evaluate(() => {
    const next = structuredClone(state);
    next.greetings.welcomeEnabled = true; next.greetings.welcomeChannelId = '123456789012345678';
    next.logging.enabled = true; next.logging.serverChannelId = '123456789012345678';
    next.safetyAdvanced.antiSpam = true;
    next.operations.health = { failed: 0, warnings: 0 };
    window.dispatchEvent(new CustomEvent('dexzu-state', { detail: next }));
  });
  for (const id of ['overview-welcome-status', 'overview-logging-status', 'overview-spam-status']) assert.equal(await page.locator('#' + id).textContent(), 'On');
  assert.equal(await page.locator('#overview-health-summary').textContent(), 'All checks passed');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('dexzu-state', { detail: state })));
  await page.locator('#overview-quick-actions [data-open-page="greetings"]').click();
  await page.waitForFunction(() => location.hash === '#greetings');
  await page.locator('[data-page="overview"]').click();
  await page.waitForFunction(() => location.hash === '#overview');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const normal = await page.locator('.modules-card').evaluate(element => {
    element.classList.add('motion-enter');
    return getComputedStyle(element).animationName;
  });
  assert.equal(normal, 'motion-enter', 'Section entrance is enabled for normal motion');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.modules-card').evaluate(element => getComputedStyle(element).animationName), 'none');
  assert.deepEqual(errors, []);
  console.log('PASS: fitted switches at five widths, real setup/diagnostic summaries, quick navigation, entrances and reduced motion.');
} finally { await browser.close(); }
