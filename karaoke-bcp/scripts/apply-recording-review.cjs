const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),id=process.argv[2];
if(!id||!/^[a-z0-9-]+$/.test(id))throw Error('Supply a song ID');
const folder=path.join(root,'songs',id),file=path.join(folder,'lyrics-timed.json');
const raw=fs.readFileSync(path.join(folder,'timing-overrides.json'));
const digest=crypto.createHash('sha256').update(raw).digest('hex'),plan=JSON.parse(raw);
const data=JSON.parse(fs.readFileSync(file));
if(data.audioSha256!==plan.audioSha256)throw Error('Review belongs to another recording');
if(data.appliedRecordingReviewHash===digest){console.log(`${id}: review already applied`);process.exit(0);}
const lines=fs.readFileSync(path.join(folder,'letra.txt'),'utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
data.unmatchedBeforeEstimation ||= structuredClone(data.unmatchedLines||[]);
for(const remap of plan.remap||[]){
 const cue=data.lyrics.find(c=>c.sourceLine===remap.sourceLine&&Math.abs(c.start-remap.matchStart)<.05);
 if(!cue||cue.text!==lines[remap.targetLine-1])throw Error('Recognized repetition changed; review again');
 cue.sourceLine=remap.targetLine;
}
for(const estimate of plan.estimates||[]){
 if(data.lyrics.some(c=>c.sourceLine===estimate.sourceLine))throw Error('Do not overwrite a recognized phrase');
 data.lyrics.push({text:lines[estimate.sourceLine-1],sourceLine:estimate.sourceLine,start:estimate.start,end:estimate.end,
  timingMethod:'neighbor-estimate',estimateBasis:estimate.basis,reviewRequired:true});
}
data.lyrics.sort((a,b)=>a.start-b.start);
let end=0;
for(const cue of data.lyrics){
 if(cue.start<end||cue.end<=cue.start||cue.end>data.durationSeconds)throw Error('Invalid reviewed timeline');
 end=cue.end;
}
data.unmatchedLines=lines.map((text,i)=>({line:i+1,text})).filter(l=>!data.lyrics.some(c=>c.sourceLine===l.line&&c.text===l.text));
data.estimatedFallbackLines=data.lyrics.filter(c=>c.timingMethod==='neighbor-estimate').map(c=>c.sourceLine);
data.appliedRecordingReviewHash=digest;data.timingReviewFile='timing-overrides.json';
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
const reportFile=path.join(root,'songs/VOCAL-IMPORT-20261029.json'),report=JSON.parse(fs.readFileSync(reportFile));
const record=report.find(r=>r.id===id);
Object.assign(record,{alignedLines:data.lyrics.length,markedSourceLines:new Set(data.lyrics.map(c=>c.sourceLine)).size,
 unmatchedBeforeEstimation:record.unmatchedLines,unmatchedLines:data.unmatchedLines,estimatedFallbackLines:data.estimatedFallbackLines});
fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
console.log(`${id}: ${data.lyrics.length} phrases, ${data.unmatchedLines.length} unmarked, ${data.estimatedFallbackLines.length} estimates`);
