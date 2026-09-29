import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../public/', import.meta.url));
const allowed = new Set(['.html','.css','.js','.svg','.png','.jpg','.jpeg','.webp','.gif','.woff','.woff2','.json']);
let count = 0;
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isSymbolicLink() || entry.name.startsWith('.')) throw Error(`Unexpected asset: ${entry.name}`);
    if (entry.isDirectory()) { await check(target); continue; }
    if (!allowed.has(path.extname(entry.name))) throw Error(`Unsupported asset: ${entry.name}`);
    if (entry.name.endsWith('.js')) execFileSync(process.execPath, ['--check',target], { stdio:'inherit' });
    count++;
  }
}
await check(root);
const html = await readFile(path.join(root,'index.html'),'utf8');
for (const match of html.matchAll(/(?:src|href)="\/dashboard\/([^"?#]+)(?:[?#][^"]*)?"/g)) {
  if (match[1].startsWith('api/')) continue;
  await readFile(path.join(root, match[1]));
}
console.log(`PASS: ${count} frontend assets, JavaScript syntax and local entry-point references`);
