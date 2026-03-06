import { clamp, clamp01 } from "./utils.js";

export type WaveForm = "sine" | "square" | "sawtooth" | "triangle";
export type OscMorphMode =
  | "none"
  | "low-pass"
  | "high-pass"
  | "harmonic-stretch"
  | "formant-scale"
  | "inharmonic-stretch"
  | "smear";

export type LfoShape = "sine" | "triangle" | "saw" | "square" | "random";
export type LfoRateMode = "hz" | "sync";
export const LFO_SYNC_DIVISIONS = [
  "1/1",
  "1/2",
  "1/4",
  "1/8",
  "1/16",
  "1/32",
  "1/4T",
  "1/8T",
  "1/16T",
  "1/4D",
  "1/8D",
] as const;
export type LfoSyncDivision = (typeof LFO_SYNC_DIVISIONS)[number];

export interface PolySynthOptions {
  maxVoices: number;
  delay: number;
  attack: number;
  hold: number;
  decay: number;
  sustain: number;
  release: number;
  masterGain: number;
  wave: WaveForm;
  unisonVoices: number;
  unisonDetuneCents: number;
  morphMode: OscMorphMode;
  lfoShape: LfoShape;
  lfoRateMode: LfoRateMode;
  lfoRateHz: number;
  lfoRateSync: LfoSyncDivision;
  lfoDepth: number;
  lfoPhase: number;
  lfoRetrigger: boolean;
  lfoBipolar: boolean;
  lfoSmooth: number;
}

export interface OscillatorParams {
  wave: WaveForm;
  detuneCents: number;
  phaseReset: boolean;
  unisonVoices: number;
  unisonDetuneCents: number;
  morphMode: OscMorphMode;
}

export interface AmpEnvelopeParams {
  delay: number;
  attack: number;
  hold: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface VoiceParams {
  osc: OscillatorParams;
  ampEnv: AmpEnvelopeParams;
  lfo: {
    shape: LfoShape;
    rateMode: LfoRateMode;
    rateHz: number;
    rateSync: LfoSyncDivision;
    depth: number;
    phase: number;
    retrigger: boolean;
    bipolar: boolean;
    smooth: number;
  };
}

export interface GlobalParams {
  maxVoices: number;
  masterGain: number;
}

export interface SynthPatch {
  voice: VoiceParams;
  global: GlobalParams;
}

const MIN_VOICES = 1;
const MAX_VOICES = 64;
export const MAX_UNISON_VOICES = 16;
const MAX_ENV_SECONDS = 8;
const MAX_UNISON_DETUNE_CENTS = 100;
const MIN_LFO_RATE_HZ = 0.01;
const MAX_LFO_RATE_HZ = 64;

export const DEFAULT_POLY_SYNTH_OPTIONS: PolySynthOptions = {
  maxVoices: 8,
  delay: 0,
  attack: 0.01,
  hold: 0,
  decay: 0.2,
  sustain: 0.8,
  release: 0.15,
  masterGain: 0.2,
  wave: "sawtooth",
  unisonVoices: 1,
  unisonDetuneCents: 0,
  morphMode: "none",
  lfoShape: "sine",
  lfoRateMode: "hz",
  lfoRateHz: 2,
  lfoRateSync: "1/4",
  lfoDepth: 1,
  lfoPhase: 0,
  lfoRetrigger: true,
  lfoBipolar: true,
  lfoSmooth: 0,
};

const clampEnvTime = (value: number): number => {
  return clamp(value, 0, MAX_ENV_SECONDS);
};

const clampMaxVoices = (value: number): number => {
  return Math.floor(clamp(value, MIN_VOICES, MAX_VOICES));
};

const clampUnisonVoices = (value: number): number => {
  return Math.floor(clamp(value, 1, MAX_UNISON_VOICES));
};

const clampUnisonDetuneCents = (value: number): number => {
  return clamp(value, 0, MAX_UNISON_DETUNE_CENTS);
};

const clampLfoRateHz = (value: number): number => {
  return clamp(value, MIN_LFO_RATE_HZ, MAX_LFO_RATE_HZ);
};

const normalizeLfoSyncDivision = (value: LfoSyncDivision): LfoSyncDivision => {
  return (LFO_SYNC_DIVISIONS as readonly string[]).includes(value)
    ? value
    : "1/4";
};

export const createPatch = (
  options: Partial<PolySynthOptions> = {},
): SynthPatch => {
  const merged: PolySynthOptions = {
    ...DEFAULT_POLY_SYNTH_OPTIONS,
    ...options,
  };

  return {
    voice: {
      osc: {
        wave: merged.wave,
        detuneCents: 0,
        phaseReset: true,
        unisonVoices: clampUnisonVoices(merged.unisonVoices),
        unisonDetuneCents: clampUnisonDetuneCents(merged.unisonDetuneCents),
        morphMode: merged.morphMode,
      },
      ampEnv: {
        delay: clampEnvTime(merged.delay),
        attack: clampEnvTime(merged.attack),
        hold: clampEnvTime(merged.hold),
        decay: clampEnvTime(merged.decay),
        sustain: clamp01(merged.sustain),
        release: clampEnvTime(merged.release),
      },
      lfo: {
        shape: merged.lfoShape,
        rateMode: merged.lfoRateMode,
        rateHz: clampLfoRateHz(merged.lfoRateHz),
        rateSync: normalizeLfoSyncDivision(merged.lfoRateSync),
        depth: clamp01(merged.lfoDepth),
        phase: clamp01(merged.lfoPhase),
        retrigger: merged.lfoRetrigger,
        bipolar: merged.lfoBipolar,
        smooth: clamp01(merged.lfoSmooth),
      },
    },
    global: {
      maxVoices: clampMaxVoices(merged.maxVoices),
      masterGain: clamp01(merged.masterGain),
    },
  };
};

export const copyPatch = (patch: SynthPatch): SynthPatch => {
  return {
    voice: {
      osc: { ...patch.voice.osc },
      ampEnv: { ...patch.voice.ampEnv },
      lfo: { ...patch.voice.lfo },
    },
    global: { ...patch.global },
  };
};

export const withWave = (patch: SynthPatch, wave: WaveForm): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      osc: {
        ...patch.voice.osc,
        wave,
      },
    },
  };
};

export const withMasterGain = (
  patch: SynthPatch,
  masterGain: number,
): SynthPatch => {
  return {
    ...patch,
    global: {
      ...patch.global,
      masterGain: clamp01(masterGain),
    },
  };
};

export const withMaxVoices = (
  patch: SynthPatch,
  maxVoices: number,
): SynthPatch => {
  return {
    ...patch,
    global: {
      ...patch.global,
      maxVoices: clampMaxVoices(maxVoices),
    },
  };
};

export const withAttack = (patch: SynthPatch, attack: number): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      ampEnv: {
        ...patch.voice.ampEnv,
        attack: clampEnvTime(attack),
      },
    },
  };
};

export const withDelay = (patch: SynthPatch, delay: number): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      ampEnv: {
        ...patch.voice.ampEnv,
        delay: clampEnvTime(delay),
      },
    },
  };
};

export const withHold = (patch: SynthPatch, hold: number): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      ampEnv: {
        ...patch.voice.ampEnv,
        hold: clampEnvTime(hold),
      },
    },
  };
};

export const withDecay = (patch: SynthPatch, decay: number): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      ampEnv: {
        ...patch.voice.ampEnv,
        decay: clampEnvTime(decay),
      },
    },
  };
};

export const withSustain = (patch: SynthPatch, sustain: number): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      ampEnv: {
        ...patch.voice.ampEnv,
        sustain: clamp01(sustain),
      },
    },
  };
};

export const withRelease = (patch: SynthPatch, release: number): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      ampEnv: {
        ...patch.voice.ampEnv,
        release: clampEnvTime(release),
      },
    },
  };
};

export const withUnisonVoices = (
  patch: SynthPatch,
  unisonVoices: number,
): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      osc: {
        ...patch.voice.osc,
        unisonVoices: clampUnisonVoices(unisonVoices),
      },
    },
  };
};

export const withUnisonDetuneCents = (
  patch: SynthPatch,
  unisonDetuneCents: number,
): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      osc: {
        ...patch.voice.osc,
        unisonDetuneCents: clampUnisonDetuneCents(unisonDetuneCents),
      },
    },
  };
};

export const withMorphMode = (
  patch: SynthPatch,
  morphMode: OscMorphMode,
): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      osc: {
        ...patch.voice.osc,
        morphMode,
      },
    },
  };
};

export const withLfoShape = (
  patch: SynthPatch,
  shape: LfoShape,
): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      lfo: {
        ...patch.voice.lfo,
        shape,
      },
    },
  };
};

export const withLfoRateMode = (
  patch: SynthPatch,
  rateMode: LfoRateMode,
): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      lfo: {
        ...patch.voice.lfo,
        rateMode,
      },
    },
  };
};

export const withLfoRateHz = (
  patch: SynthPatch,
  rateHz: number,
): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      lfo: {
        ...patch.voice.lfo,
        rateHz: clampLfoRateHz(rateHz),
      },
    },
  };
};

export const withLfoRateSync = (
  patch: SynthPatch,
  rateSync: LfoSyncDivision,
): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      lfo: {
        ...patch.voice.lfo,
        rateSync: normalizeLfoSyncDivision(rateSync),
      },
    },
  };
};

export const withLfoDepth = (patch: SynthPatch, depth: number): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      lfo: {
        ...patch.voice.lfo,
        depth: clamp01(depth),
      },
    },
  };
};

export const withLfoPhase = (patch: SynthPatch, phase: number): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      lfo: {
        ...patch.voice.lfo,
        phase: clamp01(phase),
      },
    },
  };
};

export const withLfoRetrigger = (
  patch: SynthPatch,
  retrigger: boolean,
): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      lfo: {
        ...patch.voice.lfo,
        retrigger,
      },
    },
  };
};

export const withLfoBipolar = (
  patch: SynthPatch,
  bipolar: boolean,
): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      lfo: {
        ...patch.voice.lfo,
        bipolar,
      },
    },
  };
};

export const withLfoSmooth = (
  patch: SynthPatch,
  smooth: number,
): SynthPatch => {
  return {
    ...patch,
    voice: {
      ...patch.voice,
      lfo: {
        ...patch.voice.lfo,
        smooth: clamp01(smooth),
      },
    },
  };
};
