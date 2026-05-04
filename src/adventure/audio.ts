let audioContext: AudioContext | null = null;
let musicTimerId: number | null = null;
let musicMaster: GainNode | null = null;
let musicStep = 0;
let musicMode: "menu" | "game" | null = null;
let musicEnabled = true;

const MENU_STEP = 250; // 16th note at 60 BPM
const GAME_STEP = 150; // 16th note at 100 BPM

// ─── Context ────────────────────────────────────────────────────────

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
};

const ensureRunning = async (): Promise<AudioContext | null> => {
  const ctx = getCtx();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
  return ctx;
};

// ─── Primitives ──────────────────────────────────────────────────────

const osc = (
  freq: number,
  freqEnd: number | null,
  type: OscillatorType,
  volume: number,
  attack: number,
  decay: number,
  dest: AudioNode | undefined,
  delay = 0,
): void => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const node = ctx.createOscillator();
  const gain = ctx.createGain();
  node.type = type;
  node.frequency.setValueAtTime(freq, t);
  if (freqEnd !== null) {
    node.frequency.exponentialRampToValueAtTime(freqEnd, t + decay * 0.75);
  }
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  node.connect(gain);
  gain.connect(dest ?? ctx.destination);
  node.start(t);
  node.stop(t + decay + 0.02);
};

const nz = (
  filterType: BiquadFilterType,
  freq: number,
  Q: number,
  volume: number,
  attack: number,
  decay: number,
  dest: AudioNode | undefined,
  delay = 0,
): void => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const dur = decay + 0.06;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = filterType;
  filt.frequency.value = freq;
  filt.Q.value = Q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(filt);
  filt.connect(gain);
  gain.connect(dest ?? ctx.destination);
  src.start(t);
  src.stop(t + dur);
};

// ─── Sound effects ───────────────────────────────────────────────────

export const ensureAudioReady = (): void => {
  void ensureRunning();
};

export const playSwingSound = (): void => {
  // Whoosh: bandpass noise
  nz("bandpass", 700, 0.7, 0.11, 0.003, 0.18, undefined);
  // High-frequency air cut
  nz("highpass", 3500, 0.4, 0.05, 0.001, 0.08, undefined);
  // Metallic ring
  osc(1500, null, "sine", 0.07, 0.002, 0.15, undefined);
  // Body of the blade (low sine)
  osc(280, 180, "sine", 0.05, 0.003, 0.12, undefined);
};

export const playHitSound = (): void => {
  // Sub thud
  osc(150, 45, "sine", 0.22, 0.002, 0.2, undefined);
  // Impact crunch
  nz("bandpass", 280, 2.5, 0.14, 0.001, 0.1, undefined);
  // Body hit
  nz("lowpass", 600, 1, 0.08, 0.001, 0.06, undefined);
};

export const playEnemyHitSound = (): void => {
  // Punch impact
  osc(420, 200, "sawtooth", 0.07, 0.002, 0.11, undefined);
  // Crunch noise
  nz("bandpass", 1100, 3, 0.09, 0.001, 0.08, undefined);
  // Secondary tone
  osc(700, 350, "square", 0.03, 0.001, 0.07, undefined, 0.02);
};

export const playPickupSound = (): void => {
  // Ascending sparkle: E5-G5-B5-E6
  const notes = [659.25, 783.99, 987.77, 1318.51];
  notes.forEach((freq, i) => {
    osc(freq, null, "sine", 0.07, 0.004, 0.28, undefined, i * 0.08);
  });
};

export const playWinSound = (): void => {
  // Triumphant C major arpeggio
  const arp = [523.25, 659.25, 783.99, 1046.5];
  arp.forEach((freq, i) => {
    osc(freq, null, "sine", 0.08, 0.005, 0.4, undefined, i * 0.12);
  });
  // Held chord swell
  [523.25, 659.25, 783.99].forEach((freq) => {
    osc(freq, null, "triangle", 0.05, 0.04, 1.4, undefined, 0.55);
  });
};

export const playLoseSound = (): void => {
  // Descending minor fall: A4-G4-F4-Eb4-D4-A3
  const notes = [440, 392, 349.23, 311.13, 293.66, 220];
  notes.forEach((freq, i) => {
    osc(freq, null, "triangle", 0.08, 0.01, 0.42, undefined, i * 0.13);
  });
  // Low rumble
  nz("lowpass", 110, 1.2, 0.12, 0.02, 0.7, undefined);
};

export const playShieldBlockSound = (): void => {
  // Metallic clang
  osc(780, null, "square", 0.09, 0.001, 0.12, undefined);
  osc(390, null, "triangle", 0.06, 0.002, 0.18, undefined);
  nz("bandpass", 2200, 3, 0.07, 0.001, 0.06, undefined);
};

export const playFireballLaunchSound = (): void => {
  // Deep whomp + high sizzle
  osc(140, 60, "sawtooth", 0.10, 0.004, 0.22, undefined);
  nz("bandpass", 1800, 1.5, 0.06, 0.002, 0.14, undefined);
};

export const playFireballHitSound = (): void => {
  // Explosion: low boom + crackle
  osc(90, 30, "sine", 0.18, 0.002, 0.28, undefined);
  nz("lowpass", 300, 1, 0.14, 0.001, 0.2, undefined);
  nz("highpass", 2000, 0.5, 0.06, 0.001, 0.1, undefined);
};

// ─── BGM ─────────────────────────────────────────────────────────────
//
// Menu: Am-Dm-F-E  i-iv-VI-V  60 BPM, 250 ms/16th, 16-step loop
// Game: Am-G-F-E   i-VII-VI-V 100 BPM, 150 ms/16th, 16-step loop
//
// Frequencies (Hz):
//   A2=110  D3=146.83  E3=164.81  F3=174.61  G3=196   G2=98   F2=87.31  E2=82.41
//   A3=220  C4=261.63  D4=293.66  E4=329.63  F4=349.23 G4=392  B4=493.88
//   A4=440  C5=523.25  D5=587.33  E5=659.25  F5=698.46 G5=783.99
//   G#3=207.65  B3=246.94  G#4=415.30  B5=987.77

// silence marker
const _ = 0;

// ── Menu patterns ────────────────────────────────────────────────────

const M_BASS = [
  110, _, _, _,     // A2  (Am)
  146.83, _, _, _,  // D3  (Dm)
  174.61, _, _, _,  // F3  (F)
  164.81, _, _, _,  // E3  (E)
];

// Chord pads — played once per 4 steps with long decay to overlap
const M_CHORDS: (number[] | null)[] = [
  [220, 261.63, 329.63], null, null, null,       // Am: A3-C4-E4
  [146.83, 174.61, 220], null, null, null,       // Dm: D3-F3-A3
  [174.61, 220, 261.63], null, null, null,       // F:  F3-A3-C4
  [164.81, 207.65, 246.94], null, null, null,    // E:  E3-G#3-B3
];

const M_MELODY = [
  659.25, _, 587.33, _,   // E5  D5  (Am)
  523.25, _, 440,    _,   // C5  A4  (Dm)
  392,    _, 440,    _,   // G4  A4  (F)
  493.88, _, 440,    _,   // B4  A4  (E)
];

const M_ARP = [
  440, 523.25, 659.25, 523.25,       // Am:  A4-C5-E5-C5
  440, 587.33, 698.46, 587.33,       // Dm:  A4-D5-F5-D5
  523.25, 698.46, 523.25, 392,       // F:   C5-F5-C5-G4
  493.88, 659.25, 830.61, 659.25,    // E:   B4-E5-G#5-E5
];

// ── Game patterns ─────────────────────────────────────────────────────

const G_KICK = [1, _, _, _, _, _, 1, _, 1, _, _, _, _, _, 1, _];
const G_HAT  = [_, _, 1, _, _, _, 1, _, _, _, 1, _, _, _, 1, _];

const G_BASS = [
  110, _, 110, 220,   // A2 x2+A3  (Am)
  98,  _, 98,  196,   // G2 x2+G3  (G)
  87.31, _, 87.31, 174.61, // F2 x2+F3  (F)
  82.41, _, 82.41, 164.81, // E2 x2+E3  (E)
];

const G_LEAD_16 = [
  _,      _, 659.25, _,      // E5    (beat 1, Am)
  587.33, _, _,      523.25, // D5 C5 (beat 2, G)
  _,      _, 440,    _,      // A4    (beat 3, F)
  392,    _, 440,    _,      // G4 A4 (beat 4, E)
];

const G_ARP = [
  440,    523.25, 659.25, 523.25,   // Am: A4-C5-E5-C5
  392,    523.25, 587.33, 523.25,   // G:  G4-C5-D5-C5
  349.23, 523.25, 698.46, 523.25,   // F:  F4-C5-F5-C5
  329.63, 493.88, 659.25, 493.88,   // E:  E4-B4-E5-B4
];

// ── Sequencer ─────────────────────────────────────────────────────────

const createMusicBus = (ctx: AudioContext): GainNode => {
  const gain = ctx.createGain();
  gain.gain.value = 0.6;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 8;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.18;
  gain.connect(comp);
  comp.connect(ctx.destination);
  return gain;
};

const playMenuStep = (step: number, bus: GainNode): void => {
  const s = step % 16;

  // Bass
  if (M_BASS[s]) {
    osc(M_BASS[s], null, "triangle", 0.28, 0.004, 0.55, bus);
  }

  // Chord pads
  const chord = M_CHORDS[s];
  if (chord) {
    chord.forEach((freq) => osc(freq, null, "sine", 0.055, 0.012, 1.9, bus));
  }

  // Melody
  if (M_MELODY[s]) {
    osc(M_MELODY[s], null, "sine", 0.16, 0.006, 0.45, bus);
  }

  // Arpeggio
  if (M_ARP[s]) {
    osc(M_ARP[s], null, "triangle", 0.06, 0.003, 0.22, bus);
  }
};

const playGameStep = (step: number, bus: GainNode): void => {
  const s = step % 16;

  // Kick
  if (G_KICK[s]) {
    osc(90, 28, "sine", 0.55, 0.002, 0.22, bus);
    nz("lowpass", 180, 1, 0.18, 0.001, 0.09, bus);
  }

  // Hi-hat
  if (G_HAT[s]) {
    nz("highpass", 7000, 0.5, 0.08, 0.001, 0.055, bus);
  }

  // Bass
  if (G_BASS[s]) {
    osc(G_BASS[s], null, "sawtooth", 0.18, 0.003, 0.28, bus);
  }

  // Lead melody
  if (G_LEAD_16[s]) {
    osc(G_LEAD_16[s], null, "triangle", 0.16, 0.005, 0.28, bus);
  }

  // Arpeggio (every step — creates drive)
  if (G_ARP[s]) {
    osc(G_ARP[s], null, "triangle", 0.05, 0.003, 0.14, bus);
  }
};

// ─── Public API ───────────────────────────────────────────────────────

export const startBackgroundMusic = async (mode: "menu" | "game"): Promise<void> => {
  if (!musicEnabled) {
    stopBackgroundMusic();
    return;
  }
  const ctx = await ensureRunning();
  if (!ctx) return;
  if (musicTimerId !== null && musicMode === mode) return;
  stopBackgroundMusic();
  musicMaster = createMusicBus(ctx);
  musicStep = 0;
  musicMode = mode;

  const step = mode === "menu" ? MENU_STEP : GAME_STEP;

  const tick = () => {
    if (!musicMaster || !musicMode) return;
    if (musicMode === "menu") {
      playMenuStep(musicStep, musicMaster);
    } else {
      playGameStep(musicStep, musicMaster);
    }
    musicStep += 1;
  };

  tick();
  musicTimerId = window.setInterval(tick, step);
};

export const stopBackgroundMusic = (): void => {
  if (musicTimerId !== null) {
    window.clearInterval(musicTimerId);
    musicTimerId = null;
  }
  if (musicMaster) {
    const ctx = getCtx();
    if (ctx) {
      musicMaster.gain.cancelScheduledValues(ctx.currentTime);
      musicMaster.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
    }
    musicMaster = null;
  }
  musicMode = null;
};

export const setMusicEnabled = (enabled: boolean): void => {
  musicEnabled = enabled;
  if (!enabled) {
    stopBackgroundMusic();
  }
};
