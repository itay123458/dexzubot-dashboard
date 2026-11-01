import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
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
const gate = (await readFile(path.join(root, 'public/showcase.html'), 'utf8')).replaceAll('/dashboard/', basePath);
let html = await readFile(path.join(output, 'index.html'), 'utf8');
html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${apiOrigin}; img-src 'self' data: https:; object-src 'none'; base-uri 'none'; form-action 'none'">\n  <meta name="referrer" content="no-referrer">\n  <link rel="stylesheet" href="${basePath}pages-signin.css">`);
html = html.replace('<body>', `<body class="pages-locked">${gate}`);
html = html.replace(`<script src="${basePath}dashboard-transport.js"`, `<script src="${basePath}pages-config.js" defer></script>\n  <script src="${basePath}dashboard-transport.js"`);
// Inert templates preserve the authenticated cascade and classic-script order.
// The public page needs only its own styles, story, configuration and transport.
const dashboardStyles = [], dashboardScripts = [];
html = html.replace(/<link\b[^>]+>/g, tag => {
  if (/cinematic\.css/.test(tag)) dashboardStyles.push(tag);
  if (/rel="(?:stylesheet|preload)"/.test(tag) && !/(?:pages-signin|cinematic)\.css/.test(tag)) { dashboardStyles.push(tag); return ''; }
  return tag;
});
html = html.replace(/<script\b[^>]+src="([^"]+)"[^>]*><\/script>/g, (tag, src) => {
  if (['cinematic.js','pages-config.js','dashboard-transport.js'].some(name => src.split('?')[0].endsWith('/' + name))) return tag;
  dashboardScripts.push(tag); return '';
});
html = html.replace('</body>', `<template id="dashboard-styles">${dashboardStyles.join('\n')}</template>\n<template id="dashboard-scripts">${dashboardScripts.join('\n')}</template>\n</body>`);
html = html.replace('<meta name="theme-color" content="#0c0d0f">', '<meta name="theme-color" content="#101722">');
html = html.replace(`<link rel="stylesheet" href="${basePath}pages-signin.css">`, '');
html = html.replace('</head>', `<link rel="stylesheet" href="${basePath}pages-signin.css">\n</head>`);
await writeFile(path.join(output, 'pages-config.js'), `window.DexzuPagesConfig = Object.freeze(${JSON.stringify({ apiOrigin, basePath, siteOrigin })});\n`);
// Stable URLs kept old scripts/styles in browser caches after a Pages release.
// Hash the final built bytes, including generated files and rewritten paths.
for(const match of [...html.matchAll(/(src|href)="\/dexzubot-dashboard\/([^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g)]){
  const content=await readFile(path.join(output,match[2]));
  const version=createHash('sha256').update(content).digest('hex').slice(0,12);
  html=html.replaceAll(match[0],`${match[1]}="${basePath}${match[2]}?v=${version}"`);
}
await writeFile(path.join(output, 'index.html'), html);
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Built public GitHub Pages assets in dist/');
