// Original 10-second mono test track: six 880 Hz beeps at 2, 3, 4, 5, 6 and 7 s.
const fs = require('node:fs'), path = require('node:path');
const rate = 44100, count = rate * 10, data = Buffer.alloc(44 + count * 2);
data.write('RIFF'); data.writeUInt32LE(36 + count * 2, 4); data.write('WAVE', 8);
data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20);
data.writeUInt16LE(1, 22); data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28);
data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(count * 2, 40);
for (let i = 0; i < count; i++) {
  const time = i / rate, second = Math.floor(time), fraction = time - second;
  const gain = second >= 2 && second <= 7 && fraction < .08 ? Math.max(0, Math.min(fraction / .004, (.08 - fraction) / .004, 1)) : 0;
  data.writeInt16LE(Math.trunc(.35 * gain * Math.sin(2 * Math.PI * 880 * time) * 32767), 44 + i * 2);
}
const folder = path.resolve(__dirname, '../assets/audio');
fs.mkdirSync(folder, {recursive:true});
fs.writeFileSync(path.join(folder, 'bluetooth-calibration.wav'), data);
