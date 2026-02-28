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
const DEFAULT_LFO_RATE_STEP_HZ = 0.1;
const DEFAULT_LFO_PHASE_STEP = 0.02;
const DEFAULT_LFO_POINT_X_STEP = 0.02;
const DEFAULT_LFO_POINT_Y_STEP = 0.05;
const MIN_LFO_POINTS = 2;
const MIN_POINT_SPACING = 0.02;

const clamp01 = (value: number): number => {
  return clamp(value, 0, 1);
};

const getPreReleaseEnvLevel = (
  nowMs: number,
  gateOnAtMs: number,
  env: AppState["env"],
): number => {
  const elapsed = Math.max(0, (nowMs - gateOnAtMs) / 1000);
  const delayEnd = env.delay;
  const attackEnd = delayEnd + env.attack;
  const holdEnd = attackEnd + env.hold;
  const decayEnd = holdEnd + env.decay;

  if (elapsed < delayEnd) return 0;

  if (elapsed < attackEnd) {
    if (env.attack <= 0) return 1;
    return clamp01((elapsed - delayEnd) / env.attack);
  }

  if (elapsed < holdEnd) return 1;

  if (elapsed < decayEnd) {
    if (env.decay <= 0) return env.sustain;
    const progress = clamp01((elapsed - holdEnd) / env.decay);
    return 1 + (env.sustain - 1) * progress;
  }

  return env.sustain;
};

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
const lfoModes: readonly AppState["lfo"]["mode"][] = [
  "trigger",
  "sync",
  "envelope",
];

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

const cycleLfoMode = (
  current: AppState["lfo"]["mode"],
  delta: -1 | 1,
): AppState["lfo"]["mode"] => {
  const currentIndex = lfoModes.indexOf(current);
  if (currentIndex < 0) return "trigger";
  const nextIndex = (currentIndex + delta + lfoModes.length) % lfoModes.length;
  return lfoModes[nextIndex] ?? "trigger";
};

const cycleIndex = (current: number, count: number, delta: -1 | 1): number => {
  if (count <= 0) return 0;
  return (current + delta + count) % count;
};

const clampLfoRateHz = (value: number): number => {
  return clamp(value, 0.01, 64);
};

const clampLfoPhaseOffset = (value: number): number => {
  return clamp(value, 0, 1);
};

const clampLfoY = (value: number): number => {
  return clamp(value, -1, 1);
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

const hasTargetableCell = (block: BlockId): boolean => {
  return getBlockCells(block).some((cell) => cell.targetable);
};

const cycleTargetableBlock = (current: BlockId, delta: -1 | 1): BlockId => {
  let block = current;
  for (let i = 0; i < BLOCK_ORDER.length; i += 1) {
    block = cycleBlock(block, delta);
    if (hasTargetableCell(block)) return block;
  }
  return current;
};

const moveSelectedLfoPoint = (
  state: AppState,
  dx: number,
  dy: number,
): AppState => {
  const points = state.lfo.points.slice();
  const index = state.lfo.selectedPointIndex;
  const point = points[index];
  if (point === undefined) return state;

  const isFirst = index === 0;
  const isLast = index === points.length - 1;
  const prevX = points[index - 1]?.x ?? 0;
  const nextX = points[index + 1]?.x ?? 1;
  const minX = isFirst ? 0 : prevX + MIN_POINT_SPACING;
  const maxX = isLast ? 1 : nextX - MIN_POINT_SPACING;

  const nextPoint = {
    x: isFirst || isLast ? point.x : clamp(point.x + dx, minX, maxX),
    y: clampLfoY(point.y + dy),
  };
  points[index] = nextPoint;

  return {
    ...state,
    lfo: {
      ...state.lfo,
      points,
    },
  };
};

const addLfoPointToRight = (state: AppState): AppState => {
  const points = state.lfo.points;
  const index = state.lfo.selectedPointIndex;
  const left = points[index];
  const right = points[index + 1];
  if (left === undefined || right === undefined) return state;

  const x = (left.x + right.x) * 0.5;
  if (right.x - left.x < MIN_POINT_SPACING * 2) return state;
  const y = (left.y + right.y) * 0.5;

  const nextPoints = points.slice();
  nextPoints.splice(index + 1, 0, { x, y });
  return {
    ...state,
    lfo: {
      ...state.lfo,
      points: nextPoints,
      selectedPointIndex: index + 1,
    },
  };
};

const removeSelectedLfoPoint = (state: AppState): AppState => {
  const points = state.lfo.points;
  const index = state.lfo.selectedPointIndex;
  if (points.length <= MIN_LFO_POINTS) return state;
  if (index <= 0 || index >= points.length - 1) return state;

  const nextPoints = points.slice();
  nextPoints.splice(index, 1);
  return {
    ...state,
    lfo: {
      ...state.lfo,
      points: nextPoints,
      selectedPointIndex: Math.max(0, index - 1),
    },
  };
};

const hasRoute = (
  routes: readonly ModRoute[],
  source: "env1" | "lfo1",
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
    lfo: {
      mode: "trigger",
      rateHz: 2,
      phaseOffset: 0,
      points: [
        { x: 0, y: 0 },
        { x: 0.25, y: 1 },
        { x: 0.5, y: 0 },
        { x: 0.75, y: -1 },
        { x: 1, y: 0 },
      ],
      selectedPointIndex: 0,
    },
    inputMode: "play",
    selectedBlock: "osc",
    selectedCellByBlock: {
      osc: 0,
      env: 0,
      lfo: 0,
    },
    matrixMode: "idle",
    matrixSelection: null,
    modRoutes: [],
    envPreview: {
      gateOnAtMs: null,
      gateOffAtMs: null,
      releaseStartLevel: 0,
    },
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
      const nextTargetBlock = cycleTargetableBlock(
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
    case "lfo/rate/shift": {
      return {
        ...state,
        lfo: {
          ...state.lfo,
          rateHz: clampLfoRateHz(
            state.lfo.rateHz + action.delta * DEFAULT_LFO_RATE_STEP_HZ,
          ),
        },
      };
    }
    case "lfo/phase/shift": {
      return {
        ...state,
        lfo: {
          ...state.lfo,
          phaseOffset: clampLfoPhaseOffset(
            state.lfo.phaseOffset + action.delta * DEFAULT_LFO_PHASE_STEP,
          ),
        },
      };
    }
    case "lfo/mode/cycle": {
      return {
        ...state,
        lfo: {
          ...state.lfo,
          mode: cycleLfoMode(state.lfo.mode, action.delta),
        },
      };
    }
    case "lfo/point/select/cycle": {
      return {
        ...state,
        lfo: {
          ...state.lfo,
          selectedPointIndex: cycleIndex(
            state.lfo.selectedPointIndex,
            state.lfo.points.length,
            action.delta,
          ),
        },
      };
    }
    case "lfo/point/add/right": {
      return addLfoPointToRight(state);
    }
    case "lfo/point/remove": {
      return removeSelectedLfoPoint(state);
    }
    case "lfo/point/move": {
      return moveSelectedLfoPoint(
        state,
        action.dx * DEFAULT_LFO_POINT_X_STEP,
        action.dy * DEFAULT_LFO_POINT_Y_STEP,
      );
    }
    case "wave/set": {
      return { ...state, currentWave: action.wave };
    }
    case "note/on": {
      if (state.activeKeys.has(action.key)) return state;
      const nextActiveKeys = new Map(state.activeKeys);
      nextActiveKeys.set(action.key, action.midi);
      return {
        ...state,
        activeKeys: nextActiveKeys,
        envPreview: {
          gateOnAtMs: action.atMs,
          gateOffAtMs: null,
          releaseStartLevel: 0,
        },
      };
    }
    case "note/off": {
      if (!state.activeKeys.has(action.key)) return state;
      const nextActiveKeys = new Map(state.activeKeys);
      nextActiveKeys.delete(action.key);
      if (nextActiveKeys.size > 0) {
        return {
          ...state,
          activeKeys: nextActiveKeys,
        };
      }

      const gateOnAtMs = state.envPreview.gateOnAtMs;
      const releaseStartLevel =
        gateOnAtMs === null
          ? 0
          : getPreReleaseEnvLevel(action.atMs, gateOnAtMs, state.env);

      return {
        ...state,
        activeKeys: nextActiveKeys,
        envPreview: {
          ...state.envPreview,
          gateOffAtMs: action.atMs,
          releaseStartLevel,
        },
      };
    }
    case "panic": {
      if (state.activeKeys.size === 0) return state;
      return {
        ...state,
        activeKeys: new Map<string, number>(),
        envPreview: {
          gateOnAtMs: null,
          gateOffAtMs: null,
          releaseStartLevel: 0,
        },
      };
    }
    default:
      return state;
  }
};

export const toMidi = (state: AppState, key: string): number | null => {
  const semitone = keyToSemitone[key];
  if (semitone === undefined) return null;
  return state.baseMidi + state.octaveOffset * 12 + semitone;
};
