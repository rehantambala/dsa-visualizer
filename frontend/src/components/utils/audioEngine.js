/**
 * frontend/src/components/utils/audioEngine.js
 *
 * Synthesized sound engine for the DSA Visualizer - no audio files, everything
 * is generated in real time with the Web Audio API.
 *
 * v3 - "sci-fi HUD" pass. The previous version used detuned saw/square voices
 * through a warm room reverb, which read as a retro synth pad, not a
 * futuristic interface. This version is built from three different sources
 * instead:
 *   - true FM synthesis (one oscillator modulating another's frequency) for
 *     clean metallic bell/ping tones - the "confirm" and "chime" language
 *   - fast resonant pitch sweeps through a tracking bandpass filter for a
 *     laser/zap character - the "action happened" language (swap, push,
 *     delete, errors)
 *   - filtered, swept noise for whoosh/warp transitions - the landing page's
 *     energy-burst moment and any big page-level transition
 * All three share a short, bright "plate" reverb (not a warm room) and a
 * tight metallic slap-delay bus, so everything still reads as one coherent
 * space - just a colder, more digital one.
 *
 * Usage from a component:
 *   import { useSound } from '../../hooks/useSound.js';
 *   const { sounds } = useSound();
 *   sounds.push();
 */

const STORAGE_KEY = "dsa-viz-sound-settings";

let ctx = null;
let masterGain = null;
let compressor = null;
let plateConvolver = null;
let plateReturn = null;
let delayNode = null;
let delayFeedback = null;
let delayReturn = null;
const listeners = new Set();
const lastPlayed = {};

function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        muted: Boolean(parsed.muted),
        volume: typeof parsed.volume === "number" ? parsed.volume : 0.5,
      };
    }
  } catch {
    // localStorage unavailable (private mode, SSR, etc.) - fall back silently
  }
  return { muted: false, volume: 0.5 };
}

let settings = loadSettings();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function notify() {
  listeners.forEach((fn) => fn(settings));
}

/** Short, bright synthetic impulse response - a "plate" character (fast,
 * dense, high-frequency-rich) rather than a warm decaying room, which is
 * what makes a reverb tail read as digital/HUD instead of analog/organic. */
function buildPlateImpulse(audioCtx, duration = 0.55, decay = 2.4) {
  const rate = audioCtx.sampleRate;
  const length = Math.max(1, Math.floor(rate * duration));
  const impulse = audioCtx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      // Denser early reflections than a pure exponential noise decay - keeps
      // the tail feeling tight/metallic instead of washy.
      const env = (1 - i / length) ** decay;
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return impulse;
}

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();

    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 14;
    compressor.ratio.value = 3.2;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.15;
    compressor.connect(ctx.destination);

    masterGain = ctx.createGain();
    masterGain.gain.value = settings.muted ? 0 : settings.volume;
    masterGain.connect(compressor);

    // Bright plate reverb send - kept airy with a highpass so it never gets
    // muddy, which is what would make it read as a "room" instead of a HUD.
    plateConvolver = ctx.createConvolver();
    plateConvolver.buffer = buildPlateImpulse(ctx);
    const plateHighpass = ctx.createBiquadFilter();
    plateHighpass.type = "highpass";
    plateHighpass.frequency.value = 500;
    plateReturn = ctx.createGain();
    plateReturn.gain.value = 0.5;
    plateConvolver.connect(plateHighpass);
    plateHighpass.connect(plateReturn);
    plateReturn.connect(masterGain);

    // Tight metallic slap-delay - short delay + feedback through a bandpass,
    // gives confirm/warp sounds a digital "ping-pong" tail distinct from the
    // plate reverb's wash. Used sparingly, only on hero moments.
    delayNode = ctx.createDelay(0.5);
    delayNode.delayTime.value = 0.052;
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.34;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = "bandpass";
    delayFilter.frequency.value = 1600;
    delayFilter.Q.value = 0.7;
    delayReturn = ctx.createGain();
    delayReturn.gain.value = 0.4;
    delayNode.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFilter.connect(delayReturn);
    delayReturn.connect(masterGain);
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/** Call on first user gesture (click, keydown) to unlock audio on mobile/Safari. */
export function primeAudio() {
  getCtx();
}

export function isMuted() {
  return settings.muted;
}

export function getVolume() {
  return settings.volume;
}

export function setMuted(muted) {
  settings = { ...settings, muted };
  persist();
  const audioCtx = getCtx();
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(muted ? 0 : settings.volume, audioCtx.currentTime, 0.01);
  }
  notify();
}

export function toggleMuted() {
  setMuted(!settings.muted);
}

export function setVolume(volume) {
  const v = Math.min(1, Math.max(0, volume));
  settings = { ...settings, volume: v };
  persist();
  const audioCtx = getCtx();
  if (masterGain && audioCtx && !settings.muted) {
    masterGain.gain.setTargetAtTime(v, audioCtx.currentTime, 0.01);
  }
  notify();
}

/** Subscribe to muted/volume changes. Returns an unsubscribe function. */
export function subscribeSoundSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Simple per-key rate gate so things like rapid card-hover sweeps can't
 * machine-gun the same sound. Returns true if `key` is allowed to play now. */
function allow(key, minGapMs) {
  const now = performance.now();
  if (lastPlayed[key] && now - lastPlayed[key] < minGapMs) return false;
  lastPlayed[key] = now;
  return true;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Low-level sound sources
// ---------------------------------------------------------------------------

/**
 * True FM synthesis: a modulator oscillator drives the carrier's frequency,
 * producing clean metallic/bell/digital-ping partials that a plain detuned
 * oscillator can't - this is the core "sci-fi confirm" timbre.
 */
function fmTone({
  freq = 600,
  freqEnd = null,
  modRatio = 2.01,
  modIndex = 120,
  duration = 0.18,
  attack = 0.004,
  gain = 0.16,
  filterFreq = 6000,
  filterQ = 0.8,
  plateSend = 0.22,
  delaySend = 0,
  delay = 0,
}) {
  const audioCtx = getCtx();
  if (!audioCtx || settings.muted || settings.volume <= 0) return;

  const t0 = audioCtx.currentTime + delay;

  const carrier = audioCtx.createOscillator();
  carrier.type = "sine";
  carrier.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== null) carrier.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);

  const modulator = audioCtx.createOscillator();
  modulator.type = "sine";
  modulator.frequency.setValueAtTime(freq * modRatio, t0);
  if (freqEnd !== null) modulator.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1) * modRatio, t0 + duration);

  const modGain = audioCtx.createGain();
  modGain.gain.setValueAtTime(modIndex, t0);
  modGain.gain.exponentialRampToValueAtTime(1, t0 + duration); // modulation decays -> tone "settles"

  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0003), t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;

  const dry = audioCtx.createGain();
  dry.gain.value = 1;
  const wetPlate = audioCtx.createGain();
  wetPlate.gain.value = plateSend;
  const wetDelay = audioCtx.createGain();
  wetDelay.gain.value = delaySend;

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);
  carrier.connect(env);
  env.connect(filter);
  filter.connect(dry);
  filter.connect(wetPlate);
  filter.connect(wetDelay);
  dry.connect(masterGain);
  wetPlate.connect(plateConvolver);
  wetDelay.connect(delayNode);

  modulator.start(t0);
  carrier.start(t0);
  modulator.stop(t0 + duration + 0.05);
  carrier.stop(t0 + duration + 0.05);
}

/**
 * A fast pitch sweep through a bandpass filter that tracks the same sweep -
 * the classic "laser / zap" sci-fi UI sound. Used for anything that should
 * feel like a decisive, instantaneous digital action.
 */
function laserSweep({
  freqStart = 900,
  freqEnd = 300,
  duration = 0.12,
  type = "sawtooth",
  gain = 0.16,
  filterQ = 8,
  plateSend = 0.16,
  delaySend = 0,
  noiseClick = 0,
  delay = 0,
}) {
  const audioCtx = getCtx();
  if (!audioCtx || settings.muted || settings.volume <= 0) return;

  const t0 = audioCtx.currentTime + delay;

  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(freqStart, 1), t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = filterQ;
  filter.frequency.setValueAtTime(Math.max(freqStart, 40), t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 40), t0 + duration);

  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0003), t0 + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  const dry = audioCtx.createGain();
  dry.gain.value = 1;
  const wetPlate = audioCtx.createGain();
  wetPlate.gain.value = plateSend;
  const wetDelay = audioCtx.createGain();
  wetDelay.gain.value = delaySend;

  osc.connect(filter);
  filter.connect(env);
  env.connect(dry);
  env.connect(wetPlate);
  env.connect(wetDelay);
  dry.connect(masterGain);
  wetPlate.connect(plateConvolver);
  wetDelay.connect(delayNode);

  osc.start(t0);
  osc.stop(t0 + duration + 0.03);

  if (noiseClick > 0) {
    const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * 0.015));
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const hp = audioCtx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3000;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(gain * noiseClick, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
    src.connect(hp);
    hp.connect(g);
    g.connect(masterGain);
    src.start(t0);
  }
}

/** Filtered, swept noise - a whoosh/warp transition source. This is the
 * primary texture behind the landing page's energy-burst / page-warp moment. */
function whoosh({
  duration = 0.4,
  gain = 0.2,
  freqStart = 300,
  freqEnd = 3200,
  filterType = "bandpass",
  filterQ = 0.8,
  plateSend = 0.28,
  delaySend = 0.18,
  delay = 0,
}) {
  const audioCtx = getCtx();
  if (!audioCtx || settings.muted || settings.volume <= 0) return;

  const t0 = audioCtx.currentTime + delay;
  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.value = filterQ;
  filter.frequency.setValueAtTime(Math.max(freqStart, 40), t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 40), t0 + duration);

  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0003), t0 + duration * 0.35);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  const dry = audioCtx.createGain();
  dry.gain.value = 1;
  const wetPlate = audioCtx.createGain();
  wetPlate.gain.value = plateSend;
  const wetDelay = audioCtx.createGain();
  wetDelay.gain.value = delaySend;

  src.connect(filter);
  filter.connect(env);
  env.connect(dry);
  env.connect(wetPlate);
  env.connect(wetDelay);
  dry.connect(masterGain);
  wetPlate.connect(plateConvolver);
  wetDelay.connect(delayNode);

  src.start(t0);
}

/** Low sub "thump" for weight under big moments (warp burst, sort/path complete). */
function subThump({ freq = 90, duration = 0.28, gain = 0.2, delay = 0 } = {}) {
  const audioCtx = getCtx();
  if (!audioCtx || settings.muted || settings.volume <= 0) return;
  const t0 = audioCtx.currentTime + delay;
  const osc = audioCtx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq * 2.4, t0);
  osc.frequency.exponentialRampToValueAtTime(freq, t0 + 0.05);
  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(env);
  env.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Stuttering, quantized digital noise - "access denied" character - several
 * short gated bursts with a downward pitch tilt, not a single flat buzz. */
function errorStutter({ gain = 0.15, delay = 0 } = {}) {
  const audioCtx = getCtx();
  if (!audioCtx || settings.muted || settings.volume <= 0) return;
  const steps = 3;
  for (let i = 0; i < steps; i += 1) {
    const t = delay + i * 0.045;
    const freqStart = 1400 - i * 300;
    const freqEnd = 400 - i * 60;
    laserSweep({
      freqStart,
      freqEnd,
      duration: 0.05,
      type: "square",
      gain: gain * (1 - i * 0.18),
      filterQ: 5,
      plateSend: 0.08,
      delay: t,
    });
  }
  // low dissonant tail so it reads as "rejected", not just noisy
  fmTone({
    freq: 140,
    freqEnd: 90,
    modRatio: 1.5,
    modIndex: 60,
    duration: 0.22,
    gain: gain * 0.8,
    filterFreq: 900,
    plateSend: 0.1,
    delay: delay + 0.02,
  });
}

/** Maps a data value into a musical pitch range so higher values sound higher. */
function pitchFromValue(value, min = 1, max = 100, fLow = 260, fHigh = 980) {
  const t = clamp((Number(value) - min) / (max - min || 1), 0, 1);
  return fLow + t * (fHigh - fLow);
}

/** Cycles a bright mid-register scale by index, used for traversal/visit ticks
 * so a long run of steps sounds like a purposeful little arcade signal chain. */
const SCALE = [329.63, 369.99, 415.3, 493.88, 554.37, 659.25, 739.99, 830.61];
function pitchFromIndex(i = 0) {
  return SCALE[Math.abs(i) % SCALE.length];
}

// ---------------------------------------------------------------------------
// Public sound palette - one function per animation moment in the app
// ---------------------------------------------------------------------------

export const sounds = {
  // -- generic UI feedback --
  click: () =>
    laserSweep({ freqStart: 1400, freqEnd: 900, duration: 0.035, type: "square", gain: 0.09, filterQ: 6, plateSend: 0.06, noiseClick: 0.4 }),
  toggle: () =>
    fmTone({ freq: 700, modRatio: 2, modIndex: 40, duration: 0.07, gain: 0.11, filterFreq: 5000, plateSend: 0.1 }),
  // Big "energy burst / page warp" sound - shared by the landing page's module
  // burst AND App.jsx's page-switch transition, since both fire the exact
  // same visual effect (see page-energy-layer in index.css).
  navChange: () => {
    whoosh({ duration: 0.3, gain: 0.16, freqStart: 260, freqEnd: 3600, filterQ: 0.9, plateSend: 0.22, delaySend: 0.12 });
    fmTone({ freq: 520, freqEnd: 940, modRatio: 2, modIndex: 90, duration: 0.16, delay: 0.05, gain: 0.11, filterFreq: 6500, plateSend: 0.2, delaySend: 0.14 });
  },
  error: () => errorStutter({ gain: 0.16 }),
  success: () => {
    fmTone({ freq: 523.25, modRatio: 2, modIndex: 80, duration: 0.28, gain: 0.14, filterFreq: 6500, plateSend: 0.26, delaySend: 0.14 });
    fmTone({ freq: 659.25, modRatio: 2, modIndex: 70, duration: 0.28, delay: 0.06, gain: 0.13, filterFreq: 6500, plateSend: 0.26, delaySend: 0.14 });
    fmTone({ freq: 987.77, modRatio: 2, modIndex: 60, duration: 0.32, delay: 0.12, gain: 0.13, filterFreq: 7500, plateSend: 0.3, delaySend: 0.16 });
  },

  // -- array visualizer --
  arrayInsert: () => laserSweep({ freqStart: 500, freqEnd: 1500, duration: 0.1, type: "sawtooth", gain: 0.14, filterQ: 7, plateSend: 0.14, noiseClick: 0.3 }),
  arrayDelete: () => laserSweep({ freqStart: 1300, freqEnd: 320, duration: 0.13, type: "sawtooth", gain: 0.14, filterQ: 6, plateSend: 0.14 }),
  arrayUpdate: () => fmTone({ freq: 620, modRatio: 3, modIndex: 50, duration: 0.09, gain: 0.12, filterFreq: 5500, plateSend: 0.12 }),

  // -- sorting visualizer --
  compare: (value = 50) => {
    const f = pitchFromValue(value);
    fmTone({ freq: f, modRatio: 4, modIndex: 30, duration: 0.06, attack: 0.001, gain: 0.09, filterFreq: f * 8, plateSend: 0.08 });
  },
  swap: (value = 50) => {
    const f = pitchFromValue(value);
    laserSweep({ freqStart: f, freqEnd: f * 1.9, duration: 0.09, type: "sawtooth", gain: 0.13, filterQ: 9, plateSend: 0.12, noiseClick: 0.25 });
  },
  overwrite: (value = 50) => {
    const f = pitchFromValue(value);
    fmTone({ freq: f, modRatio: 3, modIndex: 45, duration: 0.08, gain: 0.11, filterFreq: f * 6, plateSend: 0.1 });
  },
  pivotSet: (value = 50) => {
    const f = pitchFromValue(value);
    fmTone({ freq: f, modRatio: 1.5, modIndex: 25, duration: 0.24, attack: 0.01, gain: 0.12, filterFreq: f * 4, plateSend: 0.24, delaySend: 0.1 });
  },
  markSorted: (value = 50) => {
    const f = pitchFromValue(value) * 1.3;
    fmTone({ freq: f, modRatio: 2, modIndex: 20, duration: 0.12, gain: 0.1, filterFreq: f * 5, plateSend: 0.2, delaySend: 0.08 });
  },
  sortComplete: () => {
    subThump({ freq: 96, gain: 0.19 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      fmTone({ freq: f, modRatio: 2, modIndex: 70, duration: 0.34, delay: i * 0.065, gain: 0.13, filterFreq: 7000, plateSend: 0.3, delaySend: 0.16 })
    );
  },

  // -- stack visualizer --
  push: () => laserSweep({ freqStart: 260, freqEnd: 1100, duration: 0.11, type: "sawtooth", gain: 0.14, filterQ: 8, plateSend: 0.14, delaySend: 0.06, noiseClick: 0.35 }),
  pop: () => laserSweep({ freqStart: 1100, freqEnd: 260, duration: 0.11, type: "sawtooth", gain: 0.14, filterQ: 8, plateSend: 0.14, noiseClick: 0.25 }),
  peek: () => fmTone({ freq: 1200, modRatio: 2, modIndex: 30, duration: 0.07, gain: 0.1, filterFreq: 7000, plateSend: 0.16 }),

  // -- queue visualizer --
  enqueue: () => whoosh({ duration: 0.16, gain: 0.14, freqStart: 500, freqEnd: 2600, filterQ: 1.1, plateSend: 0.16, delaySend: 0.06 }),
  dequeue: () => whoosh({ duration: 0.16, gain: 0.14, freqStart: 2600, freqEnd: 500, filterQ: 1.1, plateSend: 0.16, delaySend: 0.04 }),

  // -- linked list visualizer --
  nodeCreate: () => laserSweep({ freqStart: 440, freqEnd: 1400, duration: 0.1, type: "sawtooth", gain: 0.13, filterQ: 6, plateSend: 0.16, noiseClick: 0.3 }),
  nodeRemove: () => laserSweep({ freqStart: 1200, freqEnd: 300, duration: 0.13, type: "sawtooth", gain: 0.13, filterQ: 6, plateSend: 0.16 }),
  linkPulse: () => fmTone({ freq: 1400, modRatio: 2, modIndex: 15, duration: 0.035, gain: 0.055, filterFreq: 8000, plateSend: 0.08 }),
  traverseStep: (i = 0) => fmTone({ freq: pitchFromIndex(i), modRatio: 2, modIndex: 25, duration: 0.05, attack: 0.001, gain: 0.075, filterFreq: 6500, plateSend: 0.1 }),

  // -- binary tree / graph / pathfinding (shared step-debugger visit tick) --
  visit: (i = 0) => fmTone({ freq: pitchFromIndex(i), modRatio: 3, modIndex: 35, duration: 0.065, attack: 0.001, gain: 0.09, filterFreq: 7000, plateSend: 0.14 }),
  edgeTraverse: () => laserSweep({ freqStart: 700, freqEnd: 1200, duration: 0.045, type: "square", gain: 0.07, filterQ: 6, plateSend: 0.08, noiseClick: 0.3 }),
  pathFound: () => {
    subThump({ freq: 100, gain: 0.17 });
    [440, 554.37, 659.25, 880].forEach((f, i) =>
      fmTone({ freq: f, modRatio: 2, modIndex: 60, duration: 0.32, delay: i * 0.08, gain: 0.13, filterFreq: 7000, plateSend: 0.3, delaySend: 0.16 })
    );
  },
  noPath: () => errorStutter({ gain: 0.13 }),

  // -- search / find feedback (queue, linked list) --
  found: () => fmTone({ freq: 880, modRatio: 2, modIndex: 55, duration: 0.14, gain: 0.13, filterFreq: 7500, plateSend: 0.24, delaySend: 0.1 }),
  notFound: () => errorStutter({ gain: 0.11 }),

  // -- landing page --
  /** Soft data-received blip when a boot line finishes typing. */
  bootTick: () => fmTone({ freq: 1600, modRatio: 3, modIndex: 15, duration: 0.03, attack: 0.001, gain: 0.045, filterFreq: 8000, plateSend: 0.05 }),
  /** Digital unlock chime when the title finishes decoding. */
  decodeComplete: () => {
    whoosh({ duration: 0.2, gain: 0.08, freqStart: 1800, freqEnd: 4200, filterQ: 1.4, plateSend: 0.16, delaySend: 0.1 });
    fmTone({ freq: 880, freqEnd: 1320, modRatio: 2, modIndex: 50, duration: 0.18, delay: 0.03, gain: 0.12, filterFreq: 8000, plateSend: 0.22, delaySend: 0.12 });
  },
  /** Very light module-card hover ping - rate-limited so sweeping the mouse
   * across the grid doesn't machine-gun sound. */
  hoverBlip: () => {
    if (!allow("hoverBlip", 90)) return;
    fmTone({ freq: 1500, modRatio: 2, modIndex: 12, duration: 0.035, attack: 0.001, gain: 0.035, filterFreq: 8500, plateSend: 0.06 });
  },
};

/** @deprecated kept for backward compatibility - prefer sounds.compare(value) */
export const playSortSound = (value) => sounds.compare(value);
