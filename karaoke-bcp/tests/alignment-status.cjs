const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname,'..');
const report = JSON.parse(fs.readFileSync(path.join(root,'songs/ALIGNMENT-STATUS.json'),'utf8'));
assert.equal(report.totalSongs,28);
assert.equal(report.newVocalRecordings,27);
assert.deepEqual(report.needVocalGuide.map(song=>song.id),[]);
assert.equal(report.notInNewVocalBatch.length,1);
assert.equal(report.songs.find(song=>song.id==='himno-peru').vocalRecording,'previous-vocal-recording');
let unmatched = 0;
for (const song of report.songs) {
  const data = JSON.parse(fs.readFileSync(path.join(root,'songs',song.id,'lyrics-timed.json'),'utf8'));
  assert.equal(song.markedPhrases,data.lyrics.length);
  assert.equal(song.unmatchedLines,Array.isArray(data.unmatchedLines) ? data.unmatchedLines.length : null);
  unmatched += song.unmatchedLines || 0;
}
assert.equal(report.unmatchedProvidedPhrases,unmatched);
console.log('Inventory: 27 new vocal guides, no missing guides, previous sung hymn and honest pending cue counts passed.');
