const fs = require('node:fs'), path = require('node:path');
const weight = text => Math.max(1, (text.match(/[\p{L}\p{N}]+/gu) || []).length);
const round = n => Math.round(n * 1000) / 1000;

function estimatePending(input) {
  const data = structuredClone(input), pending = [...(data.unmatchedLines || [])].sort((a,b)=>a.line-b.line);
  if (!pending.length) return data;
  const duration = data.durationSeconds;
  if (!Number.isFinite(duration) || duration<=0) throw Error('Missing audio duration');
  data.unmatchedBeforeEstimation ||= structuredClone(pending);
  data.lyrics ||= [];
  while(pending.length) {
    const group = [pending.shift()];
    while(pending.length && pending[0].line === group.at(-1).line+1) group.push(pending.shift());
    data.lyrics.sort((a,b)=>a.start-b.start);
    const next = data.lyrics.find(cue=>cue.sourceLine>group.at(-1).line);
    const previous = data.lyrics.filter(cue=>cue.sourceLine<group[0].line && (!next || cue.end<=next.start)).at(-1);
    const nearby = data.lyrics.filter(cue=>(!previous || cue.end>=previous.start-30) && (!next || cue.start<=next.end+30));
    const rates = nearby.map(cue=>(cue.end-cue.start)/weight(cue.text)).filter(rate=>rate>=.15 && rate<=1.5).sort((a,b)=>a-b);
    const rate = rates[Math.floor(rates.length/2)] || .5;
    const units = group.reduce((sum,line)=>sum+weight(line.text),0);
    let start, end, reason, items = group.map(line=>({text:line.text,sourceLine:line.line}));
    if (next && previous) {
      start = previous.end; end = next.start; reason = 'between-vocal-anchors';
      if (end-start < group.length*.35) {
        // Borrow only the preceding local phrase when a recognizer stretched it
        // across the missing lyric. Do not redistribute the complete recording.
        start = previous.start;
        const local = data.lyrics.filter(cue=>cue.start>=start && cue.end<=end);
        const selected = new Set(local);
        data.lyrics = data.lyrics.filter(cue=>!selected.has(cue));
        items = [...local.map(cue=>({text:cue.text,sourceLine:cue.sourceLine})),...items];
        reason = 'local-anchor-reflow';
      }
    } else if (next) {
      end = next.start;
      start = Math.max(0, end-units*rate-group.length*.2);
      reason = 'lead-in-before-vocal-anchor';
      if (end-start<group.length*.15) {
        start = next.start; end = next.end;
        data.lyrics = data.lyrics.filter(cue=>cue!==next);
        items.push({text:next.text,sourceLine:next.sourceLine});
        reason = 'local-first-anchor-reflow';
      }
    } else if (previous) {
      start = previous.end;
      end = Math.min(duration, start+units*rate*1.35+group.length*.25);
      reason = 'outro-after-vocal-anchor';
      if (end-start<group.length*.15) {
        start = previous.start; end = duration;
        data.lyrics = data.lyrics.filter(cue=>cue!==previous);
        items.unshift({text:previous.text,sourceLine:previous.sourceLine});
        reason = 'local-last-anchor-reflow';
      }
    } else throw Error('No vocal anchor: retain coarse track timing instead of inventing precise cues');
    if (!(end>start)) throw Error(`No temporal room for ${data.songId} line ${group[0].line}`);
    const total = items.reduce((sum,line)=>sum+weight(line.text),0);
    // Long instrumentals should stay empty rather than painting one phrase
    // throughout the break. Keep the first missing phrase near the preceding
    // voice and the remaining phrases just before the following voice.
    const longGap = reason === 'between-vocal-anchors' && end-start > Math.max(16, total*rate*2.5+items.length);
    const lengths = items.map(item=>Math.min(12,Math.max(2,weight(item.text)*rate*1.5)));
    const compactSpan = lengths.reduce((sum,n)=>sum+n,0);
    const compact = longGap && compactSpan < end-start;
    let position = start;
    for (let i=0;i<items.length;i++) {
      if (compact && i===1) position = end-lengths.slice(1).reduce((sum,n)=>sum+n,0);
      const item=items[i], finish=compact ? position+lengths[i] : i===items.length-1 ? end : position+(end-start)*weight(item.text)/total;
      data.lyrics.push({...item,start:round(position),end:round(finish),timingMethod:'neighbor-estimate',
        estimateBasis:compact ? 'local-voices-with-instrumental-gap' : reason,reviewRequired:true});
      position=finish;
    }
  }
  data.lyrics.sort((a,b)=>a.start-b.start);
  let previousEnd=0;
  for (const cue of data.lyrics) {
    if (cue.start<previousEnd || cue.end<=cue.start || cue.end>duration+.001) throw Error(`Invalid estimated timeline: ${data.songId}`);
    previousEnd=cue.end;
  }
  data.unmatchedLines=[];
  data.status='estimated'; data.reviewRequired=true;
  data.estimatedFallbackLines=data.lyrics.filter(cue=>cue.timingMethod==='neighbor-estimate').map(cue=>cue.sourceLine);
  return data;
}

if(require.main===module) {
  const root=path.resolve(__dirname,'..'), reportFile=path.join(root,'songs/VOCAL-IMPORT-20261029.json');
  const report=JSON.parse(fs.readFileSync(reportFile,'utf8'));
  let added=0;
  for(const record of report) {
    const file=path.join(root,'songs',record.id,'lyrics-timed.json');
    const before=JSON.parse(fs.readFileSync(file,'utf8'));
    added+=(before.unmatchedLines || []).length;
    const after=estimatePending(before);
    record.unmatchedBeforeEstimation ||= record.unmatchedLines;
    record.unmatchedLines=after.unmatchedLines;
    record.alignedLines=after.lyrics.length;
    record.markedSourceLines=new Set(after.lyrics.map(cue=>cue.sourceLine)).size;
    record.estimatedFallbackLines=after.estimatedFallbackLines || [];
    fs.writeFileSync(file,JSON.stringify(after,null,2)+'\n');
  }
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
  console.log(`${added} missing TXT phrases given local estimates; vocal anchors and original text retained.`);
}
module.exports={estimatePending};
