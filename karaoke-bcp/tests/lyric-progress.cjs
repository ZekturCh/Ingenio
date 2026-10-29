const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = file => import('data:text/javascript;base64,' + fs.readFileSync(path.join(__dirname, '..', file)).toString('base64'));
async function main() {
  const { cueProgress, lyricParts } = await load('lyric-progress.js');
  const { lyricTime } = await load('audio-settings.js');
  const { normalizeCalibration } = await load('track-timing.js');
  assert.equal(normalizeCalibration({duration:100,first:5,last:95,revision:'new-recording'},
    {first:5,last:95,signature:'100|5|95|old-recording'}), null);
  const line = { text: '¡Ay, Perú!', words: [{ from: 1, to: 3, start: 2, end: 3 }, { from: 5, to: 9, start: 4, end: 5 }] };
  assert.equal(lyricParts(line).map(p => p.text).join(''), line.text);
  assert.deepEqual(lyricParts({ text: 'Legacy' }), []);
  assert.deepEqual(lyricParts({text:'Jazmines en el pelo',words:[{from:9,to:11,start:1,end:2},{from:12,to:14,start:2,end:3}]}), []);
  assert.equal(cueProgress(1, 2, 3), 0);
  assert.equal(cueProgress(4, 2, 3), 1);
  assert.equal(cueProgress(2.5, 2, 3), .5);
  assert.equal(cueProgress(lyricTime(2.5, 300), 2, 3).toFixed(1), '0.2');
  assert.equal(cueProgress(lyricTime(2.2, 300), 2, 3), 0);
  assert.equal(lyricParts({text:'Hello',words:[{from:4,to:2,start:1,end:2}]}).length, 0);
  console.log('Word paint, original text preservation, legacy cues and Bluetooth clock passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
