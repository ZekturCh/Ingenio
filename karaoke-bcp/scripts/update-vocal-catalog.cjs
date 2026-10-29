// Apply the measured import report, keeping existing track IDs and Cariñito intact.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'songs/catalog.js');
const source = fs.readFileSync(catalogPath, 'utf8');
const songs = vm.runInNewContext(source.replace(/^export /gm, '') + '\nSONGS;');
const report = JSON.parse(fs.readFileSync(path.join(root, 'songs/VOCAL-IMPORT-20261029.json'), 'utf8'));
if (report.length !== 23 || new Set(report.map(track => track.id)).size !== 23) throw Error('Incomplete vocal import');
const incoming = new Map(report.map(track => [track.id, track]));
const rows = songs.map(song => {
  if (song.id === 'carinito') return '  carinito,';
  const update = incoming.get(song.id);
  if (!update) return `  estimatedTrack(${[song.id, song.title, song.artist, song.durationSeconds].map(JSON.stringify).join(', ')}),`;
  if (!update.alignedLines) throw Error(`No aligned lyrics: ${song.id}`);
  return `  estimatedTrack(${[song.id, song.title, update.artist, update.durationSeconds, update.sha256].map(JSON.stringify).join(', ')}),`;
});
const prefix = source.slice(0, source.indexOf('export const SONGS'))
  .replace(/function pendingTrack\([\s\S]*?\n}\n\n/, '');
fs.writeFileSync(catalogPath, prefix + 'export const SONGS = [\n' + rows.join('\n') + '\n];\n');
console.log(`Updated ${report.length} vocal recordings; ${songs.length} enabled songs.`);
