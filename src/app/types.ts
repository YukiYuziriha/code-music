import type {
  LfoMode,
  LfoPoint,
  OscMorphMode,
  WaveForm,
} from "../synth/polySynth.js";

export type InputMode = "nav" | "play" | "edit";
export type BlockId = "osc" | "env" | "lfo";
export type MatrixMode = "idle" | "pick-block" | "pick-cell";

export type CellId =
  | "osc.wave"
  | "osc.octave"
  | "osc.unisonVoices"
  | "osc.unisonDetuneCents"
  | "osc.morph"
  | "osc.emptyA"
  | "osc.emptyB"
  | "osc.empty"
  | "env.delay"
  | "env.attack"
  | "env.hold"
  | "env.decay"
  | "env.sustain"
  | "env.release"
  | "env.matrix"
  | "env.empty"
  | "lfo.rate"
  | "lfo.phase"
  | "lfo.mode"
  | "lfo.graph"
  | "lfo.emptyA"
  | "lfo.emptyB"
  | "lfo.matrix"
  | "lfo.empty";

export interface EnvSettings {
  readonly delay: number;
  readonly attack: number;
  readonly hold: number;
  readonly decay: number;
  readonly sustain: number;
  readonly release: number;
}

export interface ModRoute {
  readonly source: "env1" | "lfo1";
  readonly target: CellId;
  readonly amount: number;
  readonly enabled: boolean;
}

export interface MatrixSelectionState {
  readonly source: "env1" | "lfo1";
  readonly originBlock: BlockId;
  readonly originCellIndex: number;
  readonly targetBlock: BlockId;
  readonly targetCellIndex: number;
}

export interface LfoSettings {
  readonly mode: LfoMode;
  readonly rateHz: number;
  readonly phaseOffset: number;
  readonly points: readonly LfoPoint[];
  readonly selectedPointIndex: number;
}

export interface EnvPreviewState {
  readonly gateOnAtMs: number | null;
  readonly gateOffAtMs: number | null;
  readonly releaseStartLevel: number;
}

export interface AppState {
  readonly activeKeys: Map<string, number>;
  readonly baseMidi: number;
  readonly octaveOffset: number;
  readonly currentWave: WaveForm;
  readonly unisonVoices: number;
  readonly unisonDetuneCents: number;
  readonly oscMorphMode: OscMorphMode;
  readonly env: EnvSettings;
  readonly lfo: LfoSettings;
  readonly inputMode: InputMode;
  readonly selectedBlock: BlockId;
  readonly selectedCellByBlock: Record<BlockId, number>;
  readonly matrixMode: MatrixMode;
  readonly matrixSelection: MatrixSelectionState | null;
  readonly modRoutes: readonly ModRoute[];
  readonly envPreview: EnvPreviewState;
}

export const BASE_MIDI = 60;
