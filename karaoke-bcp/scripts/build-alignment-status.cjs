const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const songs = vm.runInNewContext(fs.readFileSync(path.join(root,'songs/catalog.js'),'utf8').replace(/^export /gm,'') + '\nSONGS;');
const batch = JSON.parse(fs.readFileSync(path.join(root,'songs/VOCAL-IMPORT-20261029.json'),'utf8'));
const incoming = new Set(batch.map(record=>record.id));
incoming.add('carinito');
const rows = songs.map(song=>{
  const data = JSON.parse(fs.readFileSync(path.join(root,song.lyrics),'utf8'));
  return {id:song.id,title:song.title,newVocalRecording:incoming.has(song.id),
    vocalRecording:incoming.has(song.id) ? 'provided-vocal-guide' : song.id === 'himno-peru' ? 'previous-vocal-recording' : 'previous-karaoke-track',
    method:data.method || data.timingMethod || 'unspecified',
    markedPhrases:data.lyrics.length,
    neighborOrBeatEstimates:data.lyrics.filter(cue=>cue.timingMethod==='neighbor-estimate' || cue.timingMethod?.startsWith('outro-beat-estimate')).length,
    unmatchedLines:Array.isArray(data.unmatchedLines) ? data.unmatchedLines.length : null,
    reviewRequired:data.reviewRequired === true};
});
const summary = {
  updated:'2026-10-29',totalSongs:songs.length,newVocalRecordings:incoming.size,
  notInNewVocalBatch:rows.filter(row=>!row.newVocalRecording).map(row=>({id:row.id,title:row.title})),
  needVocalGuide:rows.filter(row=>row.vocalRecording === 'previous-karaoke-track').map(row=>({id:row.id,title:row.title})),
  unmatchedProvidedPhrases:rows.reduce((sum,row)=>sum+(row.unmatchedLines || 0),0),songs:rows,
  neighborOrBeatEstimates:rows.reduce((sum,row)=>sum+row.neighborOrBeatEstimates,0),
};
fs.writeFileSync(path.join(root,'songs/ALIGNMENT-STATUS.json'),JSON.stringify(summary,null,2)+'\n');
const lines = ['# Voces y sincronizacion: 29/10/2026','',
  'Hay 28 canciones con audio y texto. Se recibieron 24 MP3 con voz guia, contando Carinito.',
  'El himno conserva una grabacion anterior con voces. La Bruja, La Llorona y Quien sera siguen con las pistas karaoke anteriores: falta su version con voz guia.',
  '',`Quedan ${summary.unmatchedProvidedPhrases} frases aportadas sin ninguna marca en las grabaciones analizadas. Otras ${summary.neighborOrBeatEstimates} tienen estimaciones por frases vecinas o ritmo. Las marcas automaticas restantes tambien requieren revision al oido; cero frases sin marcas no significa verificacion humana.`,
  'Las pistas sin voz guia no se pueden sincronizar con precision repartiendo las palabras sobre su duracion.',
  '', '| Cancion | Audio | Frases con marcas | Sin marcas | Estimadas por vecinos/ritmo |', '| --- | --- | ---: | ---: | ---: |',
  ...rows.map(row=>`| ${row.title} | ${row.newVocalRecording ? 'Voz guia nueva' : row.id === 'himno-peru' ? 'Voz anterior' : 'Karaoke anterior; falta guia'} | ${row.markedPhrases} | ${row.unmatchedLines ?? 'No evaluable con estas marcas'} | ${row.neighborOrBeatEstimates} |`),
  '', 'El texto de practica original se conserva. Los JSON de cada cancion registran las frases no alineadas y el hash de la grabacion analizada.', ''];
fs.writeFileSync(path.join(root,'songs/ESTADO-SINCRONIZACION.md'),lines.join('\n'));
console.log(JSON.stringify({newVocalRecordings:summary.newVocalRecordings,needVocalGuide:summary.needVocalGuide.map(song=>song.title),unmatchedProvidedPhrases:summary.unmatchedProvidedPhrases}));
