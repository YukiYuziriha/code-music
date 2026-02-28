import type { WaveForm } from "../synth/polySynth.js";
import type {
  BlockId,
  CellId,
  InputMode,
  MatrixSelectionState,
  ModRoute,
} from "./types.js";

export type AppAction =
  | { type: "mode/set"; mode: InputMode }
  | { type: "nav/block/select"; block: BlockId }
  | { type: "nav/block/cycle"; delta: -1 | 1 }
  | { type: "nav/cell/cycle"; delta: -1 | 1 }
  | { type: "matrix/mode/set"; mode: "idle" | "pick-block" | "pick-cell" }
  | { type: "matrix/selection/set"; selection: MatrixSelectionState | null }
  | { type: "matrix/target/block/cycle"; delta: -1 | 1 }
  | { type: "matrix/target/cell/cycle"; delta: -1 | 1 }
  | {
      type: "matrix/route/toggle";
      source: "env1" | "lfo1";
      target: CellId;
    }
  | { type: "matrix/routes/set"; routes: readonly ModRoute[] }
  | { type: "octave/shift"; delta: -1 | 1 }
  | { type: "unison/voices/shift"; delta: -1 | 1 }
  | { type: "unison/detune/shift"; steps: number }
  | { type: "osc/morph/cycle"; delta: -1 | 1 }
  | { type: "env/delay/shift"; delta: number }
  | { type: "env/attack/shift"; delta: number }
  | { type: "env/hold/shift"; delta: number }
  | { type: "env/decay/shift"; delta: number }
  | { type: "env/sustain/shift"; delta: number }
  | { type: "env/release/shift"; delta: number }
  | { type: "lfo/rate/shift"; delta: number }
  | { type: "lfo/phase/shift"; delta: number }
  | { type: "lfo/mode/cycle"; delta: -1 | 1 }
  | { type: "lfo/point/select/cycle"; delta: -1 | 1 }
  | { type: "lfo/point/add/right" }
  | { type: "lfo/point/remove" }
  | { type: "lfo/point/move"; dx: number; dy: number }
  | { type: "wave/set"; wave: WaveForm }
  | { type: "note/on"; key: string; midi: number; atMs: number }
  | { type: "note/off"; key: string; atMs: number }
  | { type: "panic" };
