/**
 * Tiny procedural-SFX layer over the Web Audio API.
 * No external dep, no file assets — every sound is synthesized on demand.
 */

export type SfxKind = 'coin' | 'trombone' | 'chime' | 'break' | 'click';

const MUTE_KEY = 'bargame.muted';
const VOLUME_KEY = 'bargame.volume';
const DEFAULT_VOLUME = 0.7;

let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
})();
let volume = (() => {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const v = Number.parseFloat(raw);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
})();

const muteListeners = new Set<(m: boolean) => void>();
const volumeListeners = new Set<(v: number) => void>();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
  muteListeners.forEach((l) => l(muted));
}

export function subscribeMute(fn: (muted: boolean) => void): () => void {
  muteListeners.add(fn);
  return () => muteListeners.delete(fn);
}

export function getVolume(): number {
  return volume;
}

export function setVolume(value: number): void {
  volume = Math.max(0, Math.min(1, value));
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // ignore
  }
  volumeListeners.forEach((l) => l(volume));
}

export function subscribeVolume(fn: (v: number) => void): () => void {
  volumeListeners.add(fn);
  return () => volumeListeners.delete(fn);
}

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const Ctor: typeof AudioContext | undefined =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

export function playSfx(kind: SfxKind): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;
  switch (kind) {
    case 'coin': return coin(ac, t);
    case 'trombone': return trombone(ac, t);
    case 'chime': return chime(ac, t);
    case 'break': return glassBreak(ac, t);
    case 'click': return click(ac, t);
  }
}

function tone(ac: AudioContext, t0: number, opts: {
  freq: number;
  freqEnd?: number;
  type?: OscillatorType;
  attack?: number;
  decay?: number;
  gain?: number;
}): void {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + (opts.decay ?? 0.2));
  }
  const peak = (opts.gain ?? 0.18) * volume;
  const attack = opts.attack ?? 0.005;
  const decay = opts.decay ?? 0.2;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.02);
}

function coin(ac: AudioContext, t0: number): void {
  // Bright two-step blip.
  tone(ac, t0,         { freq: 880,  type: 'square', attack: 0.002, decay: 0.06, gain: 0.12 });
  tone(ac, t0 + 0.05,  { freq: 1320, type: 'square', attack: 0.002, decay: 0.10, gain: 0.10 });
}

function chime(ac: AudioContext, t0: number): void {
  // Bell-ish: fundamental + perfect fifth + octave, sine, longer decay.
  tone(ac, t0, { freq: 660,  type: 'sine', attack: 0.005, decay: 0.6, gain: 0.14 });
  tone(ac, t0, { freq: 990,  type: 'sine', attack: 0.005, decay: 0.5, gain: 0.10 });
  tone(ac, t0, { freq: 1320, type: 'sine', attack: 0.005, decay: 0.4, gain: 0.07 });
}

function trombone(ac: AudioContext, t0: number): void {
  // Three descending sad-trombone notes.
  tone(ac, t0,        { freq: 360, freqEnd: 320, type: 'sawtooth', decay: 0.25, gain: 0.14 });
  tone(ac, t0 + 0.22, { freq: 300, freqEnd: 260, type: 'sawtooth', decay: 0.25, gain: 0.14 });
  tone(ac, t0 + 0.44, { freq: 240, freqEnd: 180, type: 'sawtooth', decay: 0.45, gain: 0.16 });
}

function glassBreak(ac: AudioContext, t0: number): void {
  // White-noise burst through a band-pass — short, harsh.
  const dur = 0.28;
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3500;
  filter.Q.value = 1.4;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.22 * volume, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function click(ac: AudioContext, t0: number): void {
  tone(ac, t0, { freq: 520, type: 'square', attack: 0.001, decay: 0.04, gain: 0.08 });
}
