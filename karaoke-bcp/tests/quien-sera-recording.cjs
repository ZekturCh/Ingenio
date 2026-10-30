const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../songs/quien-sera');
const data=JSON.parse(fs.readFileSync(path.join(dir,'lyrics-timed.json')));
const plan=JSON.parse(fs.readFileSync(path.join(dir,'alignment-sections.json')));
assert.equal(data.audioSha256,plan.audioSha256);
assert.equal(data.lyrics.length,20);
assert.equal(data.unmatchedLines.length,0);
assert.ok(fs.readFileSync(path.join(dir,'letra-aportada.txt'),'utf8').includes('como ayer lo fui'));
for(const cue of data.lyrics){
 const section=plan.sections.find(s=>cue.sourceLine>=s.firstLine&&cue.sourceLine<=s.lastLine);
 assert.ok(section&&cue.start>=section.start&&cue.end<=section.end,'No chorus or verse may migrate into a different repetition or instrumental');
}
assert.ok(data.lyrics.filter(cue=>cue.text.startsWith('Yo no sé')).every(cue=>cue.start>=125));
assert.ok(!data.lyrics.some(cue=>cue.start>=77&&cue.start<125));
console.log('Quién será: exact vocal recording, arranged text backup, 20 phrases and instrumental boundaries passed.');
