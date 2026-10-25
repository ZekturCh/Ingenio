// Run after changing runtime files or adding audio, then commit the manifest and sw.js.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const extensions = new Set(['.html','.js','.css','.json','.txt','.mp3','.wav','.woff2','.ttf','.otf','.webp','.png','.jpg','.svg']);
const textExtensions = new Set(['.html','.js','.css','.json','.txt','.svg']);
function walk(folder) {
  return fs.readdirSync(folder, {withFileTypes:true}).flatMap(entry => {
    if (['tests','scripts'].includes(entry.name)) return [];
    const file = path.join(folder, entry.name);
    return entry.isDirectory() ? walk(file) : extensions.has(path.extname(file)) && !['sw.js','offline-assets.json'].includes(entry.name) ? [file] : [];
  });
}
const assets = [...walk(root), path.join(root, '..', 'Logo Samay.png')].sort().map(file => {
  let body = fs.readFileSync(file);
  // Keep bytes identical to the LF text files published by Git, including on Windows.
  if (textExtensions.has(path.extname(file))) {
    const normalized = Buffer.from(body.toString('utf8').replace(/\r\n/g, '\n'));
    if (!body.equals(normalized)) fs.writeFileSync(file, normalized);
    body = normalized;
  }
  return {url: path.relative(root, file).split(path.sep).map(encodeURIComponent).join('/'), size: body.length, sha256: hash(body)};
});
const worker = path.join(root, 'sw.js');
const source = fs.readFileSync(worker, 'utf8').replace(/\r\n/g, '\n').replace(/const VERSION = "[^"]+";/, 'const VERSION = "GENERATED_VERSION";');
const version = hash(JSON.stringify(assets) + source).slice(0,20);
fs.writeFileSync(worker, source.replace('GENERATED_VERSION', version));
fs.writeFileSync(path.join(root, 'offline-assets.json'), JSON.stringify({version,totalBytes:assets.reduce((sum,a)=>sum+a.size,0),assets}, null, 2) + '\n');
console.log(`Offline: ${assets.length} files, ${(assets.reduce((sum,a)=>sum+a.size,0)/1024/1024).toFixed(1)} MB, version ${version}`);
