import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const basePath = '/dexzubot-dashboard/';
const apiOrigin = 'https://ik.tailce7102.ts.net';
const siteOrigin = 'https://itay123458.github.io';
await mkdir(output, { recursive: true });
await cp(path.join(root, 'public'), output, { recursive: true });
async function rewrite(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) { await rewrite(target); continue; }
    if (/\.(html|js|css)$/.test(entry.name)) {
      const source = await readFile(target, 'utf8');
      await writeFile(target, source.replaceAll('/dashboard/', basePath));
    }
  }
}
await rewrite(output);
const gate = `<section id="pages-signin" aria-labelledby="pages-signin-title"><div class="pages-signin-card"><img class="pages-signin-art" src="${basePath}halloween-garden.svg" alt="" width="400" height="180"><span class="pages-signin-brand">DEXZUBOT / HALLOWEEN EDITION</span><h1 id="pages-signin-title">Your community.<br>A little more magic.</h1><p>Bring your server together. Sign in to manage DexzuBot, check activity, and keep things running.</p><button type="button" id="pages-signin-button">Continue with Discord</button><p id="pages-signin-status" role="status" aria-live="polite"></p><small>Stay signed in for 30 days on this browser. Sign out on shared devices. You must own a server with DexzuBot or have Discord Administrator permission in it.</small></div></section>`;
let html = await readFile(path.join(output, 'index.html'), 'utf8');
html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${apiOrigin}; img-src 'self' data: https:; object-src 'none'; base-uri 'none'; form-action 'none'">\n  <meta name="referrer" content="no-referrer">\n  <link rel="stylesheet" href="${basePath}pages-signin.css">`);
html = html.replace('<body>', `<body class="pages-locked">${gate}`);
html = html.replace(`<script src="${basePath}dashboard-transport.js"`, `<script src="${basePath}pages-config.js" defer></script>\n  <script src="${basePath}dashboard-transport.js"`);
await writeFile(path.join(output, 'index.html'), html);
await writeFile(path.join(output, 'pages-config.js'), `window.DexzuPagesConfig = Object.freeze(${JSON.stringify({ apiOrigin, basePath, siteOrigin })});\n`);
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Built public GitHub Pages assets in dist/');
