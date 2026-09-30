// Synthetic browser regression: start the backend scripts/fixtures/dashboard-server.mjs first.
// PLAYWRIGHT_MODULE and CHROMIUM_PATH may point to an existing QA installation.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const fixtureOrigin = process.env.DASHBOARD_QA_API || 'http://127.0.0.1:13301';
const writes = [], errors = [];
let canEdit = true, failSave = false, failRead = false;
const initial = { alertChannelId: null, trustedUserIds: [], raid: { enabled: false, mode: 'contain', joinThreshold: 10, windowSeconds: 10, accountAgeDays: 7, timeoutMinutes: 10 }, nuke: { enabled: false, mode: 'contain', actionThreshold: 3, windowSeconds: 10 } };
let settings = structuredClone(initial);
const payload = workspace => workspace !== 'beta' ? { available: false, canEdit: false, settings: null, readiness: null, incidents: [] } : {
  available: true, canEdit, settings,
  readiness: { raid: { ready: true, missingPermissions: [] }, nuke: { ready: false, missingPermissions: ['ViewAuditLog'] }, warnings: ['Roles above DexzuBot cannot be removed.'] },
  incidents: [{ id: 'qa-incident', feature: 'nuke', createdAt: new Date().toISOString(), status: 'partial', actorId: '123456789012345678', evidence: { count: 3 }, actions: [{ userId: '123456789012345678', type: 'remove-role', roleId: '123456789012345679', status: 'failed', reason: '<img src=x onerror="window.securityInjected=true">' }], notification: { status: 'failed', reason: 'Missing channel access' } }],
};
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const json = (data, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
  try {
    if (url.pathname.startsWith('/dashboard/api/security')) {
      if (req.method === 'POST') {
        let body = ''; for await (const chunk of req) body += chunk;
        writes.push({ path: url.pathname, workspace: url.searchParams.get('workspace'), body: JSON.parse(body) });
        if (url.pathname.endsWith('/preview')) return json({ synthetic: true, summary: 'Synthetic example only. No Discord changes.', raid: { action: 'timeout' }, nuke: { action: 'remove dangerous roles' } });
        if (failSave) { failSave = false; return json({ error: 'Save unavailable. Try again.' }, 503); }
        if (!canEdit) return json({ error: 'Only the current server owner can edit protection.' }, 403);
        settings = JSON.parse(body);
      } else if (failRead) return json({ error: 'Protection status unavailable. Try again.' }, 503);
      return json(payload(url.searchParams.get('workspace')));
    }
    if (url.pathname.startsWith('/dashboard/api/') || url.pathname.startsWith('/dashboard/auth/')) {
      if (req.method !== 'GET') return json({ ok: true });
      const upstream = await fetch(fixtureOrigin + req.url);
      const data = await upstream.json();
      if (url.pathname.endsWith('/state')) data.channels = [{ id: '222222222222222222', name: 'alerts <script>unsafe</script>' }];
      return json(data, upstream.status);
    }
    const target = path.resolve(root, url.pathname.replace(/^\/dashboard\/?/, '') || 'index.html');
    if (!target.startsWith(root + path.sep)) return json({ error: 'Invalid path' }, 403);
    const body = await readFile(target); res.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream' }); res.end(body);
  } catch (error) { json({ error: error.message }, 404); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/dashboard/`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  let navigation = 0;
  const open = async (workspace = 'beta') => {
    await page.goto(`${base}?workspace=${workspace}&fixture=${++navigation}#safety`);
    await page.waitForFunction(() => state?.server);
    await page.locator('#security-status').waitFor();
    await page.waitForFunction(() => !document.getElementById('security-section').hasAttribute('aria-busy'));
  };
  await open();
  assert.equal(await page.locator('#security-save').isDisabled(), false);
  assert.equal(await page.locator('#security-raid-enabled').isChecked(), false);
  assert.equal(await page.locator('#security-nuke-enabled').isChecked(), false);
  assert.match(await page.locator('#security-readiness').textContent(), /ViewAuditLog/);
  assert.equal(await page.locator('#security-incidents img').count(), 0);
  assert.match(await page.locator('#security-incidents').textContent(), /<img/);
  assert.equal(await page.evaluate(() => window.securityInjected), undefined);
  assert.equal(await page.locator('#security-alert-channel script').count(), 0);
  await page.locator('#security-raid-threshold').fill('4');
  await page.locator('#security-save').click();
  assert.equal(writes.length, 0, 'Invalid threshold must not be posted');
  await page.locator('#security-raid-threshold').fill('15');
  await page.locator('#security-trusted').fill('bad-user');
  await page.locator('#security-save').click();
  assert.equal(writes.length, 0, 'Invalid trusted ID must not be posted');
  await page.locator('#security-trusted').fill('123456789012345678');
  await page.locator('#security-raid-enabled').check();
  await page.locator('#security-nuke-enabled').check();
  await page.locator('#security-nuke-mode').selectOption('alert');
  await page.locator('#security-alert-channel').selectOption('222222222222222222');
  await page.evaluate(() => render(state));
  assert.equal(await page.locator('#security-raid-threshold').inputValue(), '15', 'State polling preserves protection draft');
  assert.equal(await page.evaluate(() => dirtyPages.has('safety')), true);
  await page.locator('#save-safety-advanced').click();
  assert.equal(await page.evaluate(() => dirtyPages.has('safety')), true, 'Saving adjacent Safety controls preserves protection dirty state');
  await page.locator('#security-preview').click();
  await page.waitForFunction(() => document.getElementById('security-preview-result').textContent.includes('Synthetic'));
  assert.match(await page.locator('#security-preview-result').textContent(), /Anti-raid: timeout/);
  assert.match(await page.locator('#security-preview-result').textContent(), /Anti-nuke: remove dangerous roles/);
  assert.equal(await page.locator('#security-raid-threshold').inputValue(), '15', 'Preview preserves draft');
  assert.deepEqual(writes.at(-1).body, {}, 'Preview uses saved settings and sends no actor');
  failSave = true;
  await page.locator('#security-save').click();
  await page.waitForFunction(() => document.getElementById('security-status').dataset.error === 'true');
  assert.equal(await page.locator('#security-raid-threshold').inputValue(), '15');
  assert.equal(await page.evaluate(() => dirtyPages.has('safety')), true);
  await page.locator('#security-save').click();
  await page.waitForFunction(() => document.getElementById('security-status').textContent.includes('saved'));
  assert.equal(settings.raid.joinThreshold, 15);
  assert.equal(settings.raid.enabled, true);
  assert.equal(settings.nuke.enabled, true);
  assert.equal(settings.nuke.mode, 'alert');
  assert.equal(settings.alertChannelId, '222222222222222222');
  assert.deepEqual(settings.trustedUserIds, ['123456789012345678']);
  assert.equal(await page.evaluate(() => dirtyPages.has('safety')), false);
  await page.locator('#security-raid-threshold').fill('20');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('[data-page="overview"]').click();
  assert.equal(await page.locator('[data-panel="safety"]').isVisible(), true);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-page="overview"]').click();
  await page.locator('[data-page="safety"]').click();
  assert.equal(await page.locator('#security-raid-threshold').inputValue(), '15');
  assert.equal(await page.locator('#security-alert-channel').inputValue(), '222222222222222222');
  const output = process.env.DASHBOARD_QA_OUTPUT || path.join(tmpdir(), 'dexzu-security-qa');
  await mkdir(output, { recursive: true });
  await page.locator('.toast-close').evaluateAll(buttons => buttons.forEach(button => button.click()));
  await page.waitForFunction(() => !document.querySelector('.toast'));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow at ${width}px`);
    if ([1440, 390].includes(width)) await page.locator('#security-section').screenshot({ path: path.join(output, `security-${width}.png`) });
  }
  canEdit = false; await open();
  assert.equal(await page.locator('#security-save').isDisabled(), true);
  assert.match(await page.locator('#security-access').textContent(), /owner/);
  assert.equal(await page.locator('#security-preview').isDisabled(), false);
  await open('main');
  assert.equal(await page.locator('#security-content').isVisible(), false);
  assert.match(await page.locator('#security-access').textContent(), /Beta/);
  assert.equal(await page.locator('#security-incidents').textContent(), '');
  failRead = true; await open();
  assert.equal(await page.locator('#security-save').isDisabled(), true);
  assert.match(await page.locator('#security-status').textContent(), /unavailable/);
  assert.ok(writes.every(write => write.workspace === 'beta'));
  assert.deepEqual(errors, []);
  console.log(`PASS: protection owner/admin/Beta gates, defaults, validation, safe rendering, dirty drafts, failed saves, preview, responsive layout. Screenshots: ${output}`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
