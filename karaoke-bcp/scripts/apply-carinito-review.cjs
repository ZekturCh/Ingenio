const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const folder = path.resolve(__dirname, '../songs/carinito');
const overrides = JSON.parse(fs.readFileSync(path.join(folder,'timing-overrides.json'),'utf8'));
const file = path.join(folder,'lyrics-timed.json');
const data = JSON.parse(fs.readFileSync(file,'utf8'));
const reportFile = path.join(folder,'assisted-recording.json');
const report = JSON.parse(fs.readFileSync(reportFile,'utf8'));
const lines = fs.readFileSync(path.join(folder,'letra.txt'),'utf8').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(folder,'audio.mp3'))).digest('hex');
if (hash !== overrides.audioSha256 || hash !== data.audioSha256) throw Error('Wrong recording for timing sample');
for (const override of overrides.cues) {
  if (lines[override.sourceLine-1] !== override.text) throw Error('Text change requires approval');
  if (override.start < 0 || override.end <= override.start || override.end > data.durationSeconds) throw Error('Invalid override');
  data.lyrics = data.lyrics.filter(cue=>cue.sourceLine!==override.sourceLine);
  data.lyrics.push({text:override.text,start:override.start,end:override.end,sourceLine:override.sourceLine,
    timingMethod:override.basis,reviewRequired:true,...(override.words ? {words:override.words} : {})});
}
data.lyrics.sort((a,b)=>a.start-b.start);
for (let i=1;i<data.lyrics.length;i++) if (data.lyrics[i].start < data.lyrics[i-1].end) throw Error('Overlapping review cues');
const present = new Set(data.lyrics.map(cue=>cue.sourceLine));
data.unmatchedLines = data.unmatchedLines.filter(line=>!present.has(line.line));
data.reviewRequired = true;
data.estimatedFromNeighbors = overrides.cues.filter(cue=>cue.basis==='neighbor-estimate').map(cue=>cue.sourceLine);
data.timingReviewFile = 'timing-overrides.json';
report.alignedLines = data.lyrics.length;
report.markedSourceLines = present.size;
report.unmatchedLines = data.unmatchedLines;
report.estimatedFromNeighbors = data.estimatedFromNeighbors;
report.timingReviewFile = 'timing-overrides.json';
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
console.log(`Carinito: ${overrides.cues.length} timing adjustments; only approved text changes; ${data.unmatchedLines.length} interjections pending confirmation.`);
