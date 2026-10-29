const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const folder = path.resolve(__dirname,'../songs/carinito');
const data = JSON.parse(fs.readFileSync(path.join(folder,'lyrics-timed.json'),'utf8'));
const edits = JSON.parse(fs.readFileSync(path.join(folder,'timing-overrides.json'),'utf8'));
const lines = fs.readFileSync(path.join(folder,'letra.txt'),'utf8').trim().split(/\r?\n/);
assert.equal(lines.filter(line=>line==='No llores, oye').length,2);
assert.equal(data.lyrics.filter(line=>line.text==='No llores, oye').length,2);
assert.equal(edits.textChangesApproved,true);
assert.equal(edits.approvedTextChanges.length,3);
assert.equal(lines.length,38);
assert.equal(data.lyrics.length,38);
assert.equal(data.unmatchedLines.length,0);
assert.ok(!lines.includes('Qué cosa') && !lines.includes('Hey'));
assert.equal(data.status,'estimated');
assert.equal(data.reviewRequired,true);
for(const edit of edits.cues) {
  const cue = data.lyrics.find(cue=>cue.sourceLine===edit.sourceLine);
  assert.equal(lines[edit.sourceLine-1],edit.text);
  assert.equal(cue.text,edit.text);
  assert.equal(cue.start,edit.start);
  assert.equal(cue.end,edit.end);
  assert.equal(cue.reviewRequired,true);
}
assert.equal(data.lyrics.filter(line=>line.timingMethod==='neighbor-estimate').length,2);
assert.equal(data.lyrics.filter(line=>line.timingMethod==='outro-beat-estimate-user-confirmed-text').length,5);
console.log('Carinito sample: approved repetition, unchanged words, explicit neighbor/outro estimates and pending review passed.');
