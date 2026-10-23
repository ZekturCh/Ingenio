const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets/fonts/flexo');
const css = fs.readFileSync(path.join(dir, 'flexo.css'), 'utf8');
const files = [...css.matchAll(/src:url\("([^"]+)"\)/g)].map(match => match[1]);
assert.equal(files.length, 16);
assert.equal(new Set(files).size, 16);
for (const file of files) {
  const font = fs.readFileSync(path.join(dir, file));
  assert.equal(font.subarray(0, 4).toString(), 'OTTO', `${file} must be an OpenType font`);
  assert.ok(font.length > 100000);
}
for (const page of ['index.html', 'player.html']) {
  assert.match(fs.readFileSync(path.join(root, page), 'utf8'), /fonts\/flexo\/flexo\.css\?v=20261023-1/);
}
assert.match(fs.readFileSync(path.join(root, 'player.js'), 'utf8'), /document\.fonts\.addEventListener\("loadingdone", fitLyrics\)/);
console.log('Flexo: 16 valid OpenType files and both playback entry points passed.');
