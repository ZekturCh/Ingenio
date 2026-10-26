// Run after changing runtime files or adding audio, then commit the manifest and sw.js.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const textExtensions = new Set(['.html','.js','.css','.json','.txt','.svg']);
const pages = ['index.html','player.html','admin.html','timing-editor.html'].map(file=>path.join(root,file));
for (const page of pages) {
  let source = fs.readFileSync(page,'utf8').replace(/\r\n/g,'\n');
  const meta = '<meta name="karaoke-build" content="GENERATED_BUILD">';
  source = /<meta name="karaoke-build"[^>]*>/.test(source)
    ? source.replace(/<meta name="karaoke-build"[^>]*>/, meta) : source.replace('</head>', `  ${meta}\n</head>`);
  fs.writeFileSync(page,source);
}
function read(file) {
  const body = fs.readFileSync(file);
  if (textExtensions.has(path.extname(file)) || /license|ofl/i.test(path.basename(file))) {
    const normalized = Buffer.from(body.toString('utf8').replace(/\r\n/g, '\n'));
    if (!body.equals(normalized)) fs.writeFileSync(file, normalized);
    return normalized;
  }
  return body;
}
const files = new Set(), logo = path.resolve(root,'../Logo Samay.png');
function visit(file) {
  file = path.resolve(file);
  if (files.has(file)) return;
  if (!file.startsWith(root + path.sep) && file !== logo) throw Error(`Unexpected offline path: ${file}`);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw Error(`Missing offline resource: ${file}`);
  if (['sw.js','offline-assets.json'].includes(path.basename(file))) return;
  files.add(file);
  const body = read(file);
  if (!['.html','.js','.css'].includes(path.extname(file))) return;
  const source = body.toString('utf8');
  const references = [...source.matchAll(/["'`]([^"'`\s<>]+\.(?:html|js|css|json|txt|mp3|wav|png|webp|jpg|svg|woff2|ttf|otf)(?:\?[^"'`\s<>]*)?)["'`]/g)].map(match=>match[1]);
  for (const match of source.matchAll(/url\(\s*([^)'"\s]+)\s*\)/g)) references.push(match[1]);
  for (let reference of references) {
    if (/^(?:https?:|data:|\/\/|#)/.test(reference) || reference.includes('${')) continue;
    reference = decodeURIComponent(reference.split(/[?#]/)[0]);
    const target = path.resolve(path.dirname(file), reference);
    if (fs.existsSync(target) && fs.statSync(target).isFile()) visit(target);
  }
}
pages.forEach(visit);
const catalog = vm.runInNewContext(read(path.join(root,'songs/catalog.js')).toString('utf8').replace(/^export /gm,'') + '\nSONGS;');
for (const song of catalog.filter(song=>song.enabled)) for (const field of ['audio','text','lyrics']) visit(path.join(root,song[field]));
function licenses(folder) {
  for (const item of fs.readdirSync(folder,{withFileTypes:true})) {
    const file=path.join(folder,item.name);
    if (item.isDirectory()) licenses(file);
    else if (/license|ofl/i.test(item.name)) visit(file);
  }
}
licenses(path.join(root,'assets'));
const metadata = file => {
  const body=read(file);
  return {url:path.relative(root,file).split(path.sep).map(encodeURIComponent).join('/'),size:body.length,sha256:hash(body)};
};
const sorted = [...files].sort();
const worker = path.join(root, 'sw.js');
const source = fs.readFileSync(worker, 'utf8').replace(/\r\n/g, '\n').replace(/const VERSION = "[^"]+";/, 'const VERSION = "GENERATED_VERSION";');
// Fingerprint the placeholder build tags, then hash the actual published bytes.
const version = hash(JSON.stringify(sorted.map(metadata)) + source).slice(0,20);
for (const page of pages) fs.writeFileSync(page,fs.readFileSync(page,'utf8').replace('GENERATED_BUILD',version));
const assets = sorted.map(metadata);
fs.writeFileSync(worker, source.replace('GENERATED_VERSION', version));
fs.writeFileSync(path.join(root, 'offline-assets.json'), JSON.stringify({version,totalBytes:assets.reduce((sum,a)=>sum+a.size,0),assets}, null, 2) + '\n');
console.log(`Offline: ${assets.length} files, ${(assets.reduce((sum,a)=>sum+a.size,0)/1024/1024).toFixed(1)} MB, version ${version}`);
