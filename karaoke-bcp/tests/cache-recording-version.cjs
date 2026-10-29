const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
async function main() {
  const source = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
  const version = source.match(/const VERSION = "([^"]+)"/)[1];
  const scope = 'https://example.test/karaoke-bcp/';
  const prefix = `samay-karaoke-${scope}-`, current = prefix + version, old = prefix + 'old';
  const files = new Map([[current, new Map()], [old, new Map()]]);
  const audio = scope + 'songs/test/audio.mp3';
  const manifest = {version, assets: [{url:'songs/test/audio.mp3', size:3, sha256:'new-recording'}]};
  files.get(current).set(scope + 'offline-assets.json', new Response(JSON.stringify(manifest)));
  const response = hash => new Response('abc', {headers:{'Content-Length':'3','X-Karaoke-SHA256':hash}});
  files.get(old).set(audio, response('old-recording'));
  const context = vm.createContext({URL, Response, Map, Headers,
    caches:{open:async name=>({match:async url=>files.get(name)?.get(url)?.clone()}),keys:async()=>[...files.keys()]},
    self:{registration:{scope},location:{origin:'https://example.test'},addEventListener(){}},
  });
  vm.runInContext(source + '\nthis.readCache = fromCache;', context);
  assert.equal(await context.readCache(audio), undefined, 'old recording must not be reused for new lyrics');
  files.get(old).set(audio, response('new-recording'));
  assert.ok(await context.readCache(audio), 'unchanged verified files can be reused');
  files.get(current).set(audio, response('new-recording'));
  assert.ok(await context.readCache(audio));
  console.log('Offline cache rejects replaced recordings and reuses only matching hashes.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
