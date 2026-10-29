const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
async function main() {
  const {SONGS} = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root,'songs/catalog.js')).toString('base64'));
  assert.equal(SONGS.length, 28);
  for (const song of SONGS) {
    assert.deepEqual(song.versions.map(version=>version.id), ['chorus','full']);
    const [short, full] = song.versions;
    assert.ok(short.startAt >= 0 && short.endAt <= song.durationSeconds);
    assert.ok(short.endAt - short.startAt >= 12 && short.endAt - short.startAt <= 95);
    assert.ok(short.endAt - short.startAt < full.endAt - full.startAt);
    const lyrics = JSON.parse(fs.readFileSync(path.join(root,song.lyrics),'utf8')).lyrics;
    assert.ok(lyrics.some(line=>line.start >= short.startAt && line.end <= short.endAt));
  }
  assert.equal(SONGS[0].versions[0].startAt,57.214);
  assert.equal(SONGS[0].versions[0].endAt,117.214);
  const home = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const player = fs.readFileSync(path.join(root,'player.html'),'utf8');
  assert.ok(!home.includes('id="menu"') && !home.includes('roomPill'));
  assert.ok(home.includes('class="fullscreenControl"'));
  assert.ok(player.includes('data-lucide="menu"') && !player.includes('chevron-down'));
  console.log('28 musical excerpts, full versions, original Cariñito and simplified touch navigation passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
