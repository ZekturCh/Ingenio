const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
async function load(relative) {
  return import(`data:text/javascript;base64,${fs.readFileSync(path.join(root, relative)).toString('base64')}`);
}
async function main() {
  const { SONGS } = await load('songs/catalog.js');
  const { parseText, timedLyrics } = await load('lyrics.js');
  assert.equal(new Set(SONGS.map(song => song.id)).size, SONGS.length);
  assert.equal(SONGS.length, 28);
  const pending = SONGS.filter(song => !song.enabled);
  assert.equal(pending.length, 5);
  for (const song of SONGS) {
    assert.ok(parseText(fs.readFileSync(path.join(root, song.text), "utf8")).length > 0);
  }
  for (const song of pending) {
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, song.lyrics), "utf8")).songId, song.id);
    assert.equal(song.audioStatus, "missing");
    assert.equal(fs.existsSync(path.join(root, song.audio)), false);
    assert.deepEqual(song.versions, []);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, song.lyrics), "utf8")).lyrics, []);
  }
  assert.equal(SONGS.filter(song => song.lyricsStatus === "estimated").length, 22);
  const enabled = SONGS.filter(song => song.enabled);
  assert.equal(enabled.length, 23);
  for (const song of enabled) {
    assert.ok(fs.statSync(path.join(root, song.audio)).size > 100000);
    const data = JSON.parse(fs.readFileSync(path.join(root, song.lyrics), 'utf8'));
    assert.ok(['estimated', 'timed'].includes(song.lyricsStatus), `${song.id}: active track must have usable lyrics`);
    assert.ok(data.lyrics.length > 0, `${song.id}: active lyrics cannot be empty`);
    if (song.lyricsStatus === 'estimated') {
      assert.equal(data.status, 'estimated');
      assert.equal(data.reviewRequired, true);
      assert.equal(data.durationSeconds, song.durationSeconds);
      assert.deepEqual(data.lyrics.map(line => line.text), parseText(fs.readFileSync(path.join(root, song.text), 'utf8')));
      let previousEnd = 0;
      for (const line of data.lyrics) {
        assert.ok(Number.isFinite(line.start) && Number.isFinite(line.end));
        assert.ok(line.start >= previousEnd && line.end > line.start && line.end <= song.durationSeconds);
        previousEnd = line.end;
      }
    }
    for (const version of song.versions) {
      assert.ok(version.startAt >= 0 && version.endAt > version.startAt);
      assert.ok(version.endAt <= song.durationSeconds);
    }
  }
  assert.deepEqual(parseText('\uFEFF# pending\r\n\n A \r\nB\n# note'), ['A', 'B']);
  assert.deepEqual(timedLyrics([{text:'A',time:0},{text:'B',time:2}], 5), [
    {text:'A',start:0,end:2},{text:'B',start:2,end:5},
  ]);
  assert.throws(() => timedLyrics([], 5));
  for (const time of [null, NaN, -1, 5]) assert.throws(() => timedLyrics([{text:'A',time}], 5));
  assert.throws(() => timedLyrics([{text:'A',time:2},{text:'B',time:1}], 5));
  assert.throws(() => timedLyrics([{text:'A',time:2},{text:'B',time:2}], 5));
  assert.throws(() => timedLyrics([{text:'A',time:0}], NaN));
  console.log('Catalog: all 23 active tracks have nonempty lyrics, 22 estimated cue files and 5 pending tracks passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
