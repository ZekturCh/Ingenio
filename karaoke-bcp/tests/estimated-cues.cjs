const assert=require('node:assert/strict');
const {estimatePending}=require('../scripts/estimate-pending-cues.cjs');
const cue=(text,start,end,sourceLine)=>({text,start,end,sourceLine});
const sample=(lyrics,unmatchedLines)=>({songId:'sample',durationSeconds:60,lyrics,unmatchedLines});
const normal=estimatePending(sample([cue('A',10,12,1),cue('C',18,20,3)],[{line:2,text:'B'}]));
assert.deepEqual(normal.lyrics.map(cue=>cue.text),['A','B','C']);
assert.equal(normal.lyrics[0].start,10);
assert.equal(normal.lyrics[2].start,18);
assert.equal(normal.lyrics[1].start,12);
assert.equal(normal.lyrics[1].end,18);
const instrumental=estimatePending(sample([cue('Voz anterior',5,7,1),cue('Voz siguiente',40,42,3)],[{line:2,text:'Una frase'}]));
assert.ok(instrumental.lyrics[1].end<20,'Do not stretch lyrics over a long instrumental');
assert.equal(instrumental.lyrics[2].start,40);
const crowded=estimatePending(sample([cue('A',10,18,1),cue('C',18,20,3)],[{line:2,text:'B'}]));
assert.equal(crowded.lyrics[0].start,10);
assert.equal(crowded.lyrics[2].start,18);
assert.equal(crowded.lyrics[0].end,crowded.lyrics[1].start);
for(const data of [normal,crowded,
  estimatePending(sample([cue('C',10,12,3)],[{line:1,text:'A'},{line:2,text:'B'}])),
  estimatePending(sample([cue('A',10,12,1)],[{line:2,text:'B'}]))]) {
 assert.equal(data.unmatchedLines.length,0);
 assert.equal(data.reviewRequired,true);
 assert.equal(data.status,'estimated');
 let end=0;for(const line of data.lyrics){assert.ok(line.start>=end&&line.end>line.start&&line.end<=60);end=line.end;}
}
assert.throws(()=>estimatePending(sample([],[{line:1,text:'A'}])));
console.log('Local gap, crowded phrase, intro/outro and honest estimate labels passed.');
