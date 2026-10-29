"""Replace only Carinito with a supplied vocal guide and realign its supplied TXT."""
import argparse
import hashlib
import importlib.util
import json
import shutil
from pathlib import Path

from faster_whisper import WhisperModel
from mutagen.mp3 import MP3

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('alignment', Path(__file__).with_name('align-vocal-tracks.py'))
alignment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(alignment)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--cache', type=Path, required=True)
    args = parser.parse_args()
    source = args.source
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    duration = round(MP3(source).info.length, 6)
    folder = ROOT / 'songs/carinito'
    lines = [line.strip() for line in (folder / 'letra.txt').read_text(encoding='utf-8-sig').splitlines() if line.strip() and not line.startswith('#')]
    args.cache.mkdir(parents=True, exist_ok=True)
    cache = args.cache / f'carinito-{digest[:12]}.json'
    model = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=8, local_files_only=True)
    if cache.exists():
        words = json.loads(cache.read_text(encoding='utf-8'))
    else:
        print('Recognizing the exact vocal recording...', flush=True)
        segments, _ = model.transcribe(str(source), language='es', word_timestamps=True,
            beam_size=3, condition_on_previous_text=False, vad_filter=False,
            initial_prompt=' '.join(lines))
        words = []
        for segment in segments:
            if segment.no_speech_prob < .85 and segment.avg_logprob > -1.4:
                words.extend({'word': word.word, 'start': word.start, 'end': word.end,
                              'probability': word.probability} for word in segment.words or []
                             if word.end > word.start and word.probability >= .15)
        cache.write_text(json.dumps(words, ensure_ascii=False), encoding='utf-8')
    cues, missing = alignment.align(lines, words)
    cues = alignment.refine_missing(model, source, lines, cues, duration)
    cues = alignment.refine_phonetic_gaps(model, source, lines, words, cues, duration)
    cues = alignment.recover_repeats(lines, words, cues)
    for index, cue in enumerate(cues):
        cue['end'] = min(cue['end'], duration, cues[index + 1]['start'] if index + 1 < len(cues) else duration)
        cue['words'] = [{**word, 'end': min(word['end'], cue['end'])} for word in cue.get('words', [])
                        if word['start'] < cue['end']]
    cues = [cue for cue in cues if cue['end'] > cue['start']]
    present = {cue['sourceLine'] for cue in cues}
    missing = [line for line in missing if line['line'] not in present]
    if not cues:
        raise RuntimeError('No trustworthy lyric anchors found; original audio kept.')
    data = {'songId': 'carinito', 'status': 'estimated', 'reviewRequired': True,
            'method': 'local-asr-word-matching', 'alignmentModel': 'faster-whisper-small',
            'durationSeconds': duration, 'audioSha256': digest, 'lyrics': cues, 'unmatchedLines': missing}
    shutil.copyfile(source, folder / 'audio.mp3')
    (folder / 'lyrics-timed.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report = {'id': 'carinito', 'source': source.name, 'durationSeconds': duration,
              'sha256': digest, 'bytes': source.stat().st_size, 'alignedLines': len(cues),
              'matchedSourceLines': len(present), 'totalLines': len(lines), 'unmatchedLines': missing}
    (folder / 'assisted-recording.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    main()
