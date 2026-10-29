const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const records = require('../songs/VOCAL-IMPORT-20261029.json');
const inputs = require('../scripts/import-vocal-tracks.json');
assert.equal(records.length, 23);
assert.equal(new Set(records.map(record => record.id)).size, 23);
assert.deepEqual(new Set(records.map(record => record.id)), new Set(inputs.map(row => row[0])));
assert.ok(!JSON.stringify(records).includes('VOZ-ORIGINAL'));
for (const record of records) {
  const folder = path.join(root, 'songs', record.id);
  const audio = fs.readFileSync(path.join(folder, 'audio.mp3'));
  assert.equal(audio.length, record.bytes);
  assert.equal(crypto.createHash('sha256').update(audio).digest('hex'), record.sha256);
  const data = JSON.parse(fs.readFileSync(path.join(folder, 'lyrics-timed.json'), 'utf8'));
  assert.equal(data.audioSha256, record.sha256);
  assert.equal(data.durationSeconds, record.durationSeconds);
  assert.equal(data.lyrics.length, record.alignedLines);
  assert.equal(data.unmatchedLines.length, record.unmatchedLines.length);
  assert.ok(data.reviewRequired, 'automatic alignment must not be presented as human-verified');
  assert.equal(data.method, 'local-asr-word-matching');
  assert.ok(data.lyrics.every(line => line.words?.length > 0 || (line.timingMethod === 'neighbor-estimate' && line.reviewRequired === true)));
}
assert.equal(fs.readdirSync(path.join(root, 'letras-para-lector')).filter(name => name.endsWith('.txt')).length, 27);
console.log('23 exact recordings, linked lyric hashes, review status, word timings and 27 untouched practice TXT files passed.');
