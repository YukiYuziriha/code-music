import type { AppAction } from "./actions.js";
import { BLOCK_ORDER, getBlockCells } from "./blocks.js";
import { keyToSemitone } from "./keymap.js";
import {
  BASE_MIDI,
  type AppState,
  type BlockId,
  type ModRoute,
} from "./types.js";
import type { OscMorphMode } from "../synth/polySynth.js";

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const clampOctave = (value: number) => {
  return Math.max(-4, Math.min(4, value));
};

const clampUnisonVoices = (value: number) => {
  return Math.max(1, Math.min(16, Math.floor(value)));
};

const clampUnisonDetune = (value: number) => {
  return Math.max(0, Math.min(50, value));
};

const clampEnvTime = (value: number): number => {
  return clamp(value, 0, 8);
};

const clampEnvSustain = (value: number): number => {
  return clamp(value, 0, 1);
};

const DEFAULT_UNISON_DETUNE_STEP_CENTS = 1;
const DEFAULT_ENV_TIME_STEP = 0.01;
const DEFAULT_ENV_SUSTAIN_STEP = 0.02;

const oscMorphModes: readonly OscMorphMode[] = [
  "none",
  "low-pass",
  "high-pass",
  "harmonic-stretch",
  "formant-scale",
  "inharmonic-stretch",
  "smear",
];
const defaultOscMorphMode: OscMorphMode = "none";

const cycleOscMorphMode = (
  current: OscMorphMode,
  delta: -1 | 1,
): OscMorphMode => {
  const currentIndex = oscMorphModes.indexOf(current);
  if (currentIndex < 0) return defaultOscMorphMode;
  const nextIndex =
    (currentIndex + delta + oscMorphModes.length) % oscMorphModes.length;
  return oscMorphModes[nextIndex] ?? defaultOscMorphMode;
};

const cycleBlock = (current: BlockId, delta: -1 | 1): BlockId => {
  const index = BLOCK_ORDER.indexOf(current);
  if (index < 0) return BLOCK_ORDER[0] ?? "osc";
  const nextIndex = (index + delta + BLOCK_ORDER.length) % BLOCK_ORDER.length;
  return BLOCK_ORDER[nextIndex] ?? BLOCK_ORDER[0] ?? "osc";
};

const cycleCellIndex = (
  block: BlockId,
  current: number,
  delta: -1 | 1,
): number => {
  const cells = getBlockCells(block);
  if (cells.length === 0) return 0;
  return (current + delta + cells.length) % cells.length;
};

const cycleTargetableCellIndex = (
  block: BlockId,
  current: number,
  delta: -1 | 1,
): number => {
  const cells = getBlockCells(block);
  if (cells.length === 0) return 0;

  let index = current;
  for (let step = 0; step < cells.length; step += 1) {
    index = (index + delta + cells.length) % cells.length;
    if (cells[index]?.targetable) return index;
  }

  return current;
};

const hasRoute = (
  routes: readonly ModRoute[],
  source: "env1",
  target: ModRoute["target"],
): boolean => {
  return routes.some(
    (route) => route.source === source && route.target === target,
  );
};

export const createInitialState = (): AppState => {
  return {
    activeKeys: new Map<string, number>(),
    baseMidi: BASE_MIDI,
    octaveOffset: 0,
    currentWave: "sawtooth",
    unisonVoices: 1,
    unisonDetuneCents: 0,
    oscMorphMode: defaultOscMorphMode,
    env: {
      delay: 0,
      attack: 0.01,
      hold: 0,
      decay: 0.2,
      sustain: 0.8,
      release: 0.15,
    },
    inputMode: "play",
    selectedBlock: "osc",
    selectedCellByBlock: {
      osc: 0,
      env: 0,
    },
    matrixMode: "idle",
    matrixSelection: null,
    modRoutes: [],
  };
};

export const applyAction = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "mode/set": {
      if (state.inputMode === action.mode) return state;

      return {
        ...state,
        inputMode: action.mode,
        matrixMode: action.mode === "nav" ? state.matrixMode : "idle",
        matrixSelection: action.mode === "nav" ? state.matrixSelection : null,
        activeKeys:
          action.mode === "nav"
            ? new Map<string, number>()
            : new Map(state.activeKeys),
      };
    }
    case "nav/block/select": {
      return {
        ...state,
        selectedBlock: action.block,
      };
    }
    case "nav/block/cycle": {
      return {
        ...state,
        selectedBlock: cycleBlock(state.selectedBlock, action.delta),
      };
    }
    case "nav/cell/cycle": {
      const nextIndex = cycleCellIndex(
        state.selectedBlock,
        state.selectedCellByBlock[state.selectedBlock],
        action.delta,
      );

      return {
        ...state,
        selectedCellByBlock: {
          ...state.selectedCellByBlock,
          [state.selectedBlock]: nextIndex,
        },
      };
    }
    case "matrix/mode/set": {
      return {
        ...state,
        matrixMode: action.mode,
        matrixSelection: action.mode === "idle" ? null : state.matrixSelection,
      };
    }
    case "matrix/selection/set": {
      return {
        ...state,
        matrixSelection: action.selection,
      };
    }
    case "matrix/target/block/cycle": {
      if (state.matrixSelection === null) return state;
      const nextTargetBlock = cycleBlock(
        state.matrixSelection.targetBlock,
        action.delta,
      );
      return {
        ...state,
        matrixSelection: {
          ...state.matrixSelection,
          targetBlock: nextTargetBlock,
          targetCellIndex: cycleTargetableCellIndex(nextTargetBlock, 0, 1),
        },
      };
    }
    case "matrix/target/cell/cycle": {
      if (state.matrixSelection === null) return state;
      return {
        ...state,
        matrixSelection: {
          ...state.matrixSelection,
          targetCellIndex: cycleTargetableCellIndex(
            state.matrixSelection.targetBlock,
            state.matrixSelection.targetCellIndex,
            action.delta,
          ),
        },
      };
    }
    case "matrix/route/toggle": {
      const existing = hasRoute(state.modRoutes, action.source, action.target);
      if (existing) {
        return {
          ...state,
          modRoutes: state.modRoutes.filter(
            (route) =>
              !(
                route.source === action.source && route.target === action.target
              ),
          ),
        };
      }

      return {
        ...state,
        modRoutes: [
          ...state.modRoutes,
          {
            source: action.source,
            target: action.target,
            amount: 1,
            enabled: true,
          },
        ],
      };
    }
    case "matrix/routes/set": {
      return {
        ...state,
        modRoutes: action.routes,
      };
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
    case "osc/morph/cycle": {
      return {
        ...state,
        oscMorphMode: cycleOscMorphMode(state.oscMorphMode, action.delta),
      };
    }
    case "env/delay/shift": {
      return {
        ...state,
        env: {
          ...state.env,
          delay: clampEnvTime(
            state.env.delay + action.delta * DEFAULT_ENV_TIME_STEP,
          ),
        },
      };
    }
    case "env/attack/shift": {
      return {
        ...state,
        env: {
          ...state.env,
          attack: clampEnvTime(
            state.env.attack + action.delta * DEFAULT_ENV_TIME_STEP,
          ),
        },
      };
    }
    case "env/hold/shift": {
      return {
        ...state,
        env: {
          ...state.env,
          hold: clampEnvTime(
            state.env.hold + action.delta * DEFAULT_ENV_TIME_STEP,
          ),
        },
      };
    }
    case "env/decay/shift": {
      return {
        ...state,
        env: {
          ...state.env,
          decay: clampEnvTime(
            state.env.decay + action.delta * DEFAULT_ENV_TIME_STEP,
          ),
        },
      };
    }
    case "env/sustain/shift": {
      return {
        ...state,
        env: {
          ...state.env,
          sustain: clampEnvSustain(
            state.env.sustain + action.delta * DEFAULT_ENV_SUSTAIN_STEP,
          ),
        },
      };
    }
    case "env/release/shift": {
      return {
        ...state,
        env: {
          ...state.env,
          release: clampEnvTime(
            state.env.release + action.delta * DEFAULT_ENV_TIME_STEP,
          ),
        },
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
