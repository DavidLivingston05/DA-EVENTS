// Web Audio API Engine for Choir Vocal Pitch Pipe and Precision Metronome

export const NOTE_FREQUENCIES: Record<string, number> = {
  'C': 261.63,
  'C#': 277.18,
  'D': 293.66,
  'D#': 311.13,
  'E': 329.63,
  'F': 349.23,
  'F#': 369.99,
  'G': 392.00,
  'G#': 415.30,
  'A': 440.00,
  'A#': 466.16,
  'B': 493.88,
};

let globalAudioCtx: AudioContext | null = null;
let currentPitchOsc: OscillatorNode | null = null;
let currentPitchGain: GainNode | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

// 1. Play Pure Vocal Pitch Note
export function playVocalPitch(note: string, octaveOffset: number = 0, durationSec: number = 2.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Stop any currently playing pitch note
  stopVocalPitch();

  const baseFreq = NOTE_FREQUENCIES[note] || 440;
  const frequency = baseFreq * Math.pow(2, octaveOffset);

  const osc = ctx.createOscillator();
  const oscHarmonic = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Subtle 2nd harmonic for warm acoustic pitch pipe body
  oscHarmonic.type = 'triangle';
  oscHarmonic.frequency.setValueAtTime(frequency * 2, ctx.currentTime);

  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.05); // Smooth attack
  gain.gain.setValueAtTime(0.22, now + durationSec - 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec); // Gentle fade

  osc.connect(gain);
  oscHarmonic.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  oscHarmonic.start(now);
  osc.stop(now + durationSec);
  oscHarmonic.stop(now + durationSec);

  currentPitchOsc = osc;
  currentPitchGain = gain;
}

export function stopVocalPitch() {
  if (currentPitchGain && globalAudioCtx) {
    try {
      currentPitchGain.gain.setValueAtTime(0.001, globalAudioCtx.currentTime);
    } catch {}
  }
  if (currentPitchOsc) {
    try {
      currentPitchOsc.stop();
    } catch {}
    currentPitchOsc = null;
  }
}

// 2. Play Single Metronome Click
export function playMetronomeTick(isAccent: boolean = false) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  // Accent beat 1 is higher frequency, secondary beats are lower
  osc.frequency.setValueAtTime(isAccent ? 1200 : 800, now);
  osc.frequency.exponentialRampToValueAtTime(isAccent ? 600 : 400, now + 0.04);

  gain.gain.setValueAtTime(isAccent ? 0.35 : 0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}
