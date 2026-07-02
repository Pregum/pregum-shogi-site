// 効果音(Web Audio APIで合成、音声ファイル不要)
const KEY = 'kitsune-shogi:sound';

let audioCtx: AudioContext | null = null;

export function soundEnabled(): boolean {
  return localStorage.getItem(KEY) !== 'off';
}

export function setSoundEnabled(on: boolean) {
  localStorage.setItem(KEY, on ? 'on' : 'off');
}

function ctx(): AudioContext | null {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

// 短いノイズバースト+低音で「パチッ」という駒音を作る
export function playMove() {
  if (!soundEnabled()) return;
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime;

  const noiseLen = 0.05;
  const buffer = ac.createBuffer(1, ac.sampleRate * noiseLen, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.15));
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 1.2;
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.55, t);
  noise.connect(bp).connect(noiseGain).connect(ac.destination);
  noise.start(t);

  // 盤に響く低い「トッ」
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
  const oscGain = ac.createGain();
  oscGain.gain.setValueAtTime(0.35, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  osc.connect(oscGain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

function beep(freq: number, start: number, dur: number, vol = 0.18, type: OscillatorType = 'triangle') {
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// 王手の警告音
export function playCheck() {
  if (!soundEnabled()) return;
  beep(740, 0, 0.12, 0.15);
  beep(988, 0.13, 0.18, 0.15);
}

// 終局音(勝ち: 上昇 / 負け・引き分け: 下降)
export function playEnd(win: boolean) {
  if (!soundEnabled()) return;
  const notes = win ? [523, 659, 784, 1047] : [392, 330, 262];
  notes.forEach((f, i) => beep(f, i * 0.14, 0.25, 0.14));
}
