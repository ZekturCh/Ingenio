// Selections are musical phrases chosen per track, not arbitrary 60-second slices.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..'), file = path.join(root, 'songs/catalog.js');
let source = fs.readFileSync(file, 'utf8');
const songs = vm.runInNewContext(source.replace(/^export /gm, '') + '\nSONGS;');
const selections = require('../songs/chorus-selections.json');
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only')+1] : null;
if (process.argv.includes('--only') && !selections[only]) throw Error('Unknown chorus selection');
const windows = only ? JSON.parse(source.match(/const CHORUS_WINDOWS = ([\s\S]*?);\nfunction withChorus/)[1]) : {};
for (const [id, [start, end]] of Object.entries(selections)) {
  if (only && id !== only) continue;
  const song = songs.find(song => song.id === id);
  if (!song) throw Error(`Unknown song ${id}`);
  const lines = JSON.parse(fs.readFileSync(path.join(root, song.lyrics), 'utf8')).lyrics;
  const closest = time => lines.reduce((best, line) => Math.abs(line.start - time) < Math.abs(best.start - time) ? line : best);
  const first = closest(start), last = closest(end);
  if (Math.abs(first.start - start) > .35 || Math.abs(last.start - end) > .35) throw Error(`Review moved chorus cues: ${id}`);
  const firstIndex = lines.indexOf(first), lastIndex = lines.indexOf(last);
  const startAt = Math.max(0, first.start - .8, lines[firstIndex - 1]?.end || 0);
  const endAt = Math.min(song.durationSeconds, last.end + .3, lines[lastIndex + 1]?.start ?? Infinity);
  if (endAt - startAt < 12 || endAt - startAt > 95 || endAt - startAt >= song.durationSeconds) throw Error(`Invalid short version: ${id}`);
  windows[id] = {startAt: +startAt.toFixed(3), endAt: +endAt.toFixed(3)};
}
const block = '// BEGIN GENERATED CHORUSES\nconst CHORUS_WINDOWS = ' + JSON.stringify(windows, null, 2) + `;
function withChorus(song) {
  if (song.versions.some(version => version.id === "chorus")) return song;
  const window = CHORUS_WINDOWS[song.id];
  if (!window) return song;
  const seconds = Math.floor(window.endAt - window.startAt);
  return { ...song, versions: [{ id: "chorus", label: "Coro", ...window,
    durationLabel: \x60\x24{Math.floor(seconds / 60)}:\x24{String(seconds % 60).padStart(2, "0")}\x60,
    reviewRequired: song.lyricsStatus !== "timed", note: "Fragmento central · 5 s de preparación" }, ...song.versions] };
}
// END GENERATED CHORUSES\n\n`;
source = source.replace(/\/\/ BEGIN GENERATED CHORUSES[\s\S]*?\/\/ END GENERATED CHORUSES\n\n/, '');
source = source.replace('export const SONGS = [', block + 'export const SONGS = [');
source = source.replace(/\];\s*$|\]\.map\(withChorus\);\s*$/, '].map(withChorus);\n');
fs.writeFileSync(file, source);
console.log(`Prepared ${Object.keys(windows).length} short excerpts from the active recordings.`);
