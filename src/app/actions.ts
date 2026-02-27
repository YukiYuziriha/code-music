import type { WaveForm } from "../synth/polySynth.js";
import type { InputMode, NavAction } from "./types.js";

export type AppAction =
  | { type: "mode/set"; mode: InputMode }
  | { type: "nav/set"; action: NavAction }
  | { type: "octave/shift"; delta: -1 | 1 }
  | { type: "unison/voices/shift"; delta: -1 | 1 }
  | { type: "unison/detune/shift"; steps: number }
  | { type: "osc/morph/cycle"; delta: -1 | 1 }
  | { type: "wave/set"; wave: WaveForm }
  | { type: "note/on"; key: string; midi: number }
  | { type: "note/off"; key: string }
  | { type: "panic" };
