import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('alignment', Path(__file__).resolve().parents[1] / 'scripts/align-vocal-tracks.py')
alignment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(alignment)


class AlignmentTests(unittest.TestCase):
    def words(self, text):
        return [{'word': word, 'start': i, 'end': i + .8} for i, word in enumerate(text.split())]

    def test_repeated_lines_keep_order(self):
        cues, missing = alignment.align(['Uno dos tres cuatro', 'Cinco seis siete ocho', 'Uno dos tres cuatro'],
            self.words('uno dos tres cuatro cinco seis siete ocho uno dos tres cuatro'))
        self.assertFalse(missing)
        self.assertEqual([cue['start'] for cue in cues], [0, 4, 8])
        self.assertEqual(cues[0]['words'][0]['from'], 0)

    def test_no_guessed_time_for_unrecognized_line(self):
        cues, missing = alignment.align(['Algo que no suena'], self.words('sonidos completamente diferentes'))
        self.assertFalse(cues)
        self.assertEqual(len(missing), 1)

    def test_recover_clear_repetition(self):
        words = self.words('uno dos tres cuatro uno dos tres cuatro')
        cues = [{'text': 'uno dos tres cuatro', 'start': 0, 'end': 3.8, 'sourceLine': 1}]
        result = alignment.recover_repeats(['uno dos tres cuatro'], words, cues)
        self.assertEqual([cue['start'] for cue in result], [0, 4])


if __name__ == '__main__':
    unittest.main()
