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
const MAX_UNISON_VOICES = 16;
const MAX_ENV_SECONDS = 8;
const MAX_UNISON_DETUNE_CENTS = 100;

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
