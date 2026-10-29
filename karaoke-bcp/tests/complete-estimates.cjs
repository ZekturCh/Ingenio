const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const songs=vm.runInNewContext(fs.readFileSync(path.join(root,'songs/catalog.js'),'utf8').replace(/^export /gm,'')+'\nSONGS;');
let tracks=0,estimates=0;
for(const song of songs){
 const data=JSON.parse(fs.readFileSync(path.join(root,song.lyrics),'utf8'));
 if(data.method!=='local-asr-word-matching') continue;
 tracks++;
 const text=fs.readFileSync(path.join(root,song.text),'utf8').split(/\r?\n/).map(line=>line.replace(/\(bis\)\.?/ig,'').trim()).filter(line=>line&&!line.startsWith('#'));
 assert.equal(data.unmatchedLines.length,0,song.id);
 for(let i=0;i<text.length;i++) assert.ok(data.lyrics.some(cue=>cue.sourceLine===i+1&&cue.text===text[i]),`${song.id}: missing TXT phrase ${i+1}`);
 for(const cue of data.lyrics) if(cue.timingMethod==='neighbor-estimate'){assert.equal(cue.reviewRequired,true);estimates++;}
 assert.equal(data.status,'estimated');
}
assert.equal(tracks,24);
console.log(`${tracks} vocal guides cover every supplied TXT phrase; ${estimates} local estimates explicitly labelled.`);
