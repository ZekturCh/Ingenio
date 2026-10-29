const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=file=>import('data:text/javascript;base64,'+fs.readFileSync(path.join(root,file)).toString('base64'));
async function main(){
 const {preparationStart,preparationCount}=await read('chorus-preparation.js');
 const {lyricTime}=await read('audio-settings.js');
 const {SONGS}=await read('songs/catalog.js');
 for(const song of SONGS){
  const chorus=song.versions.find(v=>v.id==='chorus');
  assert.ok(chorus.startAt>=5,song.id+' has five seconds of source audio before its chorus');
  const begin=preparationStart(chorus.startAt,'chorus');
  assert.ok(Math.abs(chorus.startAt-begin-5)<1e-9);
  for(let second=0;second<5;second++) assert.equal(preparationCount(begin+second+.001,chorus.startAt,'chorus'),5-second);
  assert.equal(preparationCount(chorus.startAt,chorus.startAt,'chorus'),0);
  for(const delay of [-300,0,300,2500]){
   assert.equal(preparationCount(lyricTime(chorus.startAt+delay/1000-2.2,delay),chorus.startAt,'chorus'),3);
   assert.equal(preparationCount(lyricTime(chorus.startAt+delay/1000+.001,delay),chorus.startAt,'chorus'),0);
  }
  const cues=JSON.parse(fs.readFileSync(path.join(root,song.lyrics))).lyrics;
  assert.ok(cues.find(cue=>cue.end>chorus.startAt&&cue.start<chorus.endAt)?.text);
  assert.equal(preparationStart(0,'full'),0);
  assert.equal(preparationCount(-2,0,'full'),0);
 }
 console.log('28 choruses: five-second source lead-in, countdown, first-phrase preview and shared Bluetooth clock passed.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
