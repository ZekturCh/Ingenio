const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function main(){
 const {heardPosition,lyricTime}=await import('data:text/javascript;base64,'+fs.readFileSync(path.resolve(__dirname,'../audio-settings.js')).toString('base64'));
 assert.equal(heardPosition(70,60,90,300).toFixed(1),'9.7');
 assert.equal(heardPosition(60,60,90,300),0);
 assert.equal(heardPosition(90.3,60,90,300),30);
 assert.equal(heardPosition(70,60,90,-300).toFixed(1),'10.3');
 for(const delay of [-1000,0,300,1500]) for(const time of [61.5,70,80]) assert.ok(Math.abs(heardPosition(time,60,90,delay)-(lyricTime(time,delay)-60))<.00001);
 console.log('Music media clock, Bluetooth compensation, timecode and lyric clock agree.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
