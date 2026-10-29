"""Import exact user recordings and match supplied lyrics to local ASR word clocks.

Requires faster-whisper and mutagen. No files are sent to a transcription service.
Usage: python scripts/align-vocal-tracks.py SOURCE_FOLDER --cache CACHE_FOLDER
"""
import argparse
import hashlib
import json
import re
import shutil
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio, pad_or_trim
from faster_whisper.tokenizer import Tokenizer
from mutagen.mp3 import MP3

ROOT = Path(__file__).resolve().parent.parent


def tokens(text):
    plain = ''.join(c for c in unicodedata.normalize('NFD', text.lower())
                    if unicodedata.category(c) != 'Mn')
    return re.findall(r'[a-z0-9]+', plain)


def align(lines, words):
    expected, owners, positions = [], [], []
    for i, line in enumerate(lines):
        part = tokens(line)
        expected.extend(part)
        owners.extend([i] * len(part))
        positions.extend(range(len(part)))
    heard, clocks = [], []
    for word in words:
        for token in tokens(word['word']):
            heard.append(token)
            clocks.append(word)
    matches = [[] for _ in lines]
    # Global alignment keeps repeated choruses in order instead of greedily
    # attaching the first chorus to a later, more clearly recognized repetition.
    width = len(heard) + 1
    directions = bytearray((len(expected) + 1) * width)
    previous = [-j for j in range(width)]
    for i, token in enumerate(expected, 1):
        current = [-i] + [0] * len(heard)
        for j, observed in enumerate(heard, 1):
            diagonal = previous[j - 1] + (3 if token == observed else -2)
            remove = previous[j] - 1
            insert = current[j - 1] - 1
            best = max(diagonal, remove, insert)
            current[j] = best
            directions[i * width + j] = 0 if best == diagonal else 1 if best == remove else 2
        previous = current
    i, j = len(expected), len(heard)
    pairs = []
    while i and j:
        direction = directions[i * width + j]
        if direction == 0:
            if expected[i - 1] == heard[j - 1]:
                pairs.append((i - 1, j - 1))
            i -= 1
            j -= 1
        elif direction == 1:
            i -= 1
        else:
            j -= 1
    for position, observed in reversed(pairs):
        matches[owners[position]].append((positions[position], clocks[observed]))
    cues, missing = [], []
    for index, (line, matched) in enumerate(zip(lines, matches)):
        coverage = len(matched) / max(1, len(tokens(line)))
        if coverage < .55 or len(matched) < min(2, len(tokens(line))):
            missing.append({'line': index + 1, 'text': line, 'coverage': round(coverage, 3)})
            continue
        start, end = matched[0][1]['start'], matched[-1][1]['end']
        # Reject long spurious spans across instrumental sections or repetitions.
        if end <= start or end - start > max(14, len(tokens(line)) * 1.8):
            missing.append({'line': index + 1, 'text': line, 'coverage': round(coverage, 3)})
            continue
        spans = list(re.finditer(r'[^\W_]+', line, re.UNICODE))
        word_cues = []
        for position, word in matched:
            if position < len(spans):
                span = spans[position]
                word_cues.append({'from': span.start(), 'to': span.end(),
                                  'start': round(word['start'], 3), 'end': round(word['end'], 3)})
        cues.append({'text': line, 'start': round(start, 3), 'end': round(end, 3),
                     'words': word_cues,
                     'sourceLine': index + 1, 'matchedWordRatio': round(coverage, 3)})
    for index in range(len(cues) - 1):
        cues[index]['end'] = min(cues[index]['end'], cues[index + 1]['start'])
    return [cue for cue in cues if cue['end'] > cue['start']], missing


def refine_missing(model, source, lines, cues, duration):
    """Acoustically align supplied phrases inside gaps bounded by recognized cues."""
    tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual,
                          task='transcribe', language='es')
    waveform = None
    present = {cue['sourceLine'] for cue in cues}
    additions = []
    index = 0
    while index < len(lines):
        if index + 1 in present or not tokens(lines[index]) or lines[index].strip().lower() == '(bis)':
            index += 1
            continue
        first = index
        while index < len(lines) and index + 1 not in present:
            index += 1
        last = index
        previous = next((cue for cue in reversed(cues) if cue['sourceLine'] <= first), None)
        following = next((cue for cue in cues if cue['sourceLine'] > last), None)
        start = previous['end'] if previous else 0
        end = following['start'] if following else duration
        if end - start < .5 or end - start > 29:
            continue
        text = ' '.join(lines[first:last])
        if len(tokenizer.encode(text)) > 200:
            continue
        if waveform is None:
            waveform = decode_audio(str(source), sampling_rate=16000)
        features = model.feature_extractor(waveform[int(start * 16000):int(end * 16000)])
        frames = min(features.shape[-1], 3000)
        result = model.find_alignment(tokenizer, [tokenizer.encode(' ' + text)],
                                      model.encode(pad_or_trim(features)), frames)[0]
        words = [{'word': w['word'], 'start': start + float(w['start']),
                  'end': min(end, start + float(w['end']))} for w in result
                 if w['probability'] >= .2 and w['end'] - w['start'] >= .04]
        extra, _ = align(lines[first:last], words)
        for cue in extra:
            if cue['matchedWordRatio'] >= .7 and cue['end'] - cue['start'] >= .4:
                cue['sourceLine'] += first
                cue['alignment'] = 'acoustic-gap-refinement'
                additions.append(cue)
    return sorted(cues + additions, key=lambda cue: cue['start'])


def recover_repeats(lines, words, cues):
    """Recover clearly recognized repetitions absent from a TXT's shorthand (bis)."""
    heard, clocks = [], []
    for word in words:
        for token in tokens(word['word']):
            heard.append(token)
            clocks.append(word)
    seen = set()
    for index, line in enumerate(lines):
        reference = tokens(line)
        key = tuple(reference)
        if len(reference) < 4 or key in seen:
            continue
        seen.add(key)
        for start in range(len(heard) - len(reference) + 1):
            candidate = heard[start:start + len(reference)]
            if candidate[0] != reference[0] or SequenceMatcher(None, reference, candidate, autojunk=False).ratio() < .9:
                continue
            window = clocks[start:start + len(reference)]
            beginning, end = window[0]['start'], window[-1]['end']
            if any(beginning < cue['end'] - .1 and end > cue['start'] + .1 for cue in cues):
                continue
            extra, _ = align([line], window)
            for cue in extra:
                cue['sourceLine'] = index + 1
                cue['alignment'] = 'recognized-repetition'
                cues.append(cue)
    return sorted(cues, key=lambda cue: cue['start'])


def refine_phonetic_gaps(model, source, lines, words, cues, duration):
    """Use close ASR spellings only to find a window, then verify it acoustically."""
    tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual,
                          task='transcribe', language='es')
    waveform = None
    for index, line in enumerate(lines):
        if any(cue['sourceLine'] == index + 1 for cue in cues):
            continue
        reference = ''.join(tokens(line))
        if len(reference) < 12:
            continue
        previous = next((cue for cue in reversed(cues) if cue['sourceLine'] < index + 1), None)
        following = next((cue for cue in cues if cue['sourceLine'] > index + 1), None)
        lower, upper = (previous['end'] if previous else 0), (following['start'] if following else duration)
        best = None
        expected_words = len(tokens(line))
        for start in range(len(words)):
            if words[start]['start'] < lower or words[start]['start'] >= upper:
                continue
            for count in range(max(1, expected_words - 2), expected_words + 3):
                window = words[start:start + count]
                if len(window) != count or window[-1]['end'] > upper or window[-1]['end'] - window[0]['start'] > 14:
                    continue
                heard = ''.join(tokens(' '.join(word['word'] for word in window)))
                score = SequenceMatcher(None, reference, heard, autojunk=False).ratio()
                if score >= .82 and (best is None or score > best[0]):
                    best = (score, window)
        if best is None:
            continue
        window = best[1]
        start, end = max(lower, window[0]['start'] - .25), min(upper, window[-1]['end'] + .25)
        if end - start < .4:
            continue
        if waveform is None:
            waveform = decode_audio(str(source), sampling_rate=16000)
        features = model.feature_extractor(waveform[int(start * 16000):int(end * 16000)])
        result = model.find_alignment(tokenizer, [tokenizer.encode(' ' + line)],
            model.encode(pad_or_trim(features)), min(features.shape[-1], 3000))[0]
        aligned = [{'word': word['word'], 'start': start + float(word['start']),
                    'end': min(end, start + float(word['end']))} for word in result
                   if word['probability'] >= .2 and word['end'] - word['start'] >= .04]
        extra, _ = align([line], aligned)
        for cue in extra:
            if cue['matchedWordRatio'] >= .7:
                cue['sourceLine'] = index + 1
                cue['alignment'] = 'phonetic-window-acoustic-refinement'
                cues.append(cue)
        cues.sort(key=lambda cue: cue['start'])
    return cues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--cache', required=True, type=Path)
    parser.add_argument('--refine', action='store_true')
    parser.add_argument('--only', help='Process one track ID, retaining the other report entries')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'scripts/import-vocal-tracks.json').read_text(encoding='utf-8'))
    # Validate the complete batch before replacing any recording.
    for _, filename, _ in manifest:
        if not (args.source / filename).is_file():
            raise FileNotFoundError(filename)
    args.cache.mkdir(parents=True, exist_ok=True)
    model = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=8,
                         local_files_only=True)
    report_path = ROOT / 'songs/VOCAL-IMPORT-20261029.json'
    report = json.loads(report_path.read_text(encoding='utf-8')) if args.only and report_path.exists() else []
    for song_id, filename, artist in manifest:
        if args.only and song_id != args.only:
            continue
        source = args.source / filename
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        duration = round(MP3(source).info.length, 6)
        folder = ROOT / 'songs' / song_id
        lines = [re.sub(r'\(bis\)\.?', '', line, flags=re.IGNORECASE).strip()
                 for line in (folder / 'letra.txt').read_text(encoding='utf-8-sig').splitlines()
                 if line.strip() and not line.lstrip().startswith('#')]
        lines = [line for line in lines if line]
        cache_file = args.cache / f'{song_id}-{digest[:12]}.json'
        print(f'ANALYZING {song_id}: {duration:.1f}s', flush=True)
        if cache_file.exists():
            words = json.loads(cache_file.read_text(encoding='utf-8'))
        else:
            segments, _ = model.transcribe(str(source), language='es', word_timestamps=True,
                beam_size=3, condition_on_previous_text=False, vad_filter=False,
                initial_prompt='Letra cantada en español. ' + ' '.join(lines)[:900])
            words = []
            for segment in segments:
                if segment.no_speech_prob > .85 or segment.avg_logprob < -1.4:
                    continue
                words.extend({'word': w.word, 'start': w.start, 'end': w.end,
                              'probability': round(w.probability, 4)} for w in segment.words or []
                             if w.end > w.start and w.probability >= .15)
            cache_file.write_text(json.dumps(words, ensure_ascii=False), encoding='utf-8')
        cues, missing = align(lines, words)
        if args.refine:
            cues = refine_missing(model, source, lines, cues, duration)
            cues = refine_phonetic_gaps(model, source, lines, words, cues, duration)
            cues = recover_repeats(lines, words, cues)
            present = {cue['sourceLine'] for cue in cues}
            missing = [line for line in missing if line['line'] not in present]
        for i, cue in enumerate(cues):
            cue['end'] = min(cue['end'], duration, cues[i + 1]['start'] if i + 1 < len(cues) else duration)
            cue['words'] = [{**word, 'end': min(word['end'], cue['end'])} for word in cue.get('words', [])
                            if word['start'] < cue['end'] and word['end'] > word['start']]
        cues = [cue for cue in cues if cue['end'] > cue['start']]
        shutil.copyfile(source, folder / 'audio.mp3')
        data = {'songId': song_id, 'status': 'estimated', 'reviewRequired': True,
                'method': 'local-asr-word-matching', 'alignmentModel': 'faster-whisper-small',
                'durationSeconds': duration,
                'audioSha256': digest, 'lyrics': cues,
                'unmatchedLines': missing}
        (folder / 'lyrics-timed.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        entry = {'id': song_id, 'source': filename, 'artist': artist, 'durationSeconds': duration,
                 'sha256': digest, 'bytes': source.stat().st_size,
                 'alignedLines': len(cues), 'matchedSourceLines': len({cue['sourceLine'] for cue in cues}),
                 'totalLines': len(lines), 'unmatchedLines': missing}
        report = [record for record in report if record['id'] != song_id] + [entry]
        (ROOT / 'songs/VOCAL-IMPORT-20261029.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'DONE {song_id}: {len(cues)}/{len(lines)} lines', flush=True)


if __name__ == '__main__':
    main()
