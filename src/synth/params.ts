import { clamp, clamp01 } from "./utils.js";

export type WaveForm = "sine" | "square" | "sawtooth" | "triangle";

export interface PolySynthOptions {
  maxVoices: number;
  attack: number;
  release: number;
  masterGain: number;
  wave: WaveForm;
  unisonVoices: number;
  unisonDetuneCents: number;
}

export interface OscillatorParams {
  wave: WaveForm;
  detuneCents: number;
  phaseReset: boolean;
  unisonVoices: number;
  unisonDetuneCents: number;
}

export interface AmpEnvelopeParams {
  attack: number;
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
  attack: 0.01,
  release: 0.15,
  masterGain: 0.2,
  wave: "sawtooth",
  unisonVoices: 1,
  unisonDetuneCents: 0,
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
      },
      ampEnv: {
        attack: clampEnvTime(merged.attack),
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
