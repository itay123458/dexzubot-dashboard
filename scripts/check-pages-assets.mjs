import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const references=[...html.matchAll(/(?:src|href)="\/dexzubot-dashboard\/([^"?#]+\.(?:js|css))(?:\?([^"#]*))?"/g)];
assert.ok(references.length>20,'check the built dashboard asset references');
for(const [,name,query] of references){
 const content=await readFile(new URL(`../dist/${name}`,import.meta.url));
 const expected=createHash('sha256').update(content).digest('hex').slice(0,12);
 assert.equal(new URLSearchParams(query).get('v'),expected,`${name} needs a content version so cached assets cannot mask an update`);
}
console.log(`PASS: ${references.length} Pages scripts and styles use matching content versions.`);
