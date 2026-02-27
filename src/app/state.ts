import type { AppAction } from "./actions.js";
import { keyToSemitone } from "./keymap.js";
import { BASE_MIDI, type AppState } from "./types.js";

const clampOctave = (value: number) => {
  return Math.max(-4, Math.min(4, value));
};

const clampUnisonVoices = (value: number) => {
  return Math.max(1, Math.min(16, Math.floor(value)));
};

const clampUnisonDetune = (value: number) => {
  return Math.max(0, Math.min(50, value));
};

const DEFAULT_UNISON_DETUNE_STEP_CENTS = 1;

export const createInitialState = (): AppState => {
  return {
    activeKeys: new Map<string, number>(),
    baseMidi: BASE_MIDI,
    octaveOffset: 0,
    currentWave: "sawtooth",
    unisonVoices: 1,
    unisonDetuneCents: 0,
    inputMode: "play",
    lastNavAction: "none",
  };
};

export const applyAction = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "mode/set": {
      if (state.inputMode === action.mode) return state;

      return {
        ...state,
        inputMode: action.mode,
        activeKeys:
          action.mode === "nav"
            ? new Map<string, number>()
            : new Map(state.activeKeys),
      };
    }
    case "nav/set": {
      return { ...state, lastNavAction: action.action };
    }
    case "octave/shift": {
      return {
        ...state,
        octaveOffset: clampOctave(state.octaveOffset + action.delta),
      };
    }
    case "unison/voices/shift": {
      return {
        ...state,
        unisonVoices: clampUnisonVoices(state.unisonVoices + action.delta),
      };
    }
    case "unison/detune/shift": {
      return {
        ...state,
        unisonDetuneCents: clampUnisonDetune(
          state.unisonDetuneCents +
            action.steps * DEFAULT_UNISON_DETUNE_STEP_CENTS,
        ),
      };
    }
    case "wave/set": {
      return { ...state, currentWave: action.wave };
    }
    case "note/on": {
      if (state.activeKeys.has(action.key)) return state;
      const nextActiveKeys = new Map(state.activeKeys);
      nextActiveKeys.set(action.key, action.midi);
      return { ...state, activeKeys: nextActiveKeys };
    }
    case "note/off": {
      if (!state.activeKeys.has(action.key)) return state;
      const nextActiveKeys = new Map(state.activeKeys);
      nextActiveKeys.delete(action.key);
      return { ...state, activeKeys: nextActiveKeys };
    }
    case "panic": {
      if (state.activeKeys.size === 0) return state;
      return { ...state, activeKeys: new Map<string, number>() };
    }
  }
};

export const toMidi = (state: AppState, key: string): number | null => {
  const semitone = keyToSemitone[key];
  if (semitone === undefined) return null;
  return state.baseMidi + state.octaveOffset * 12 + semitone;
};
