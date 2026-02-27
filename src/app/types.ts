import type { OscMorphMode, WaveForm } from "../synth/polySynth.js";

export type InputMode = "nav" | "play";
export type NavAction = "none" | "left" | "down" | "up" | "right";

export interface AppState {
  readonly activeKeys: Map<string, number>;
  readonly baseMidi: number;
  readonly octaveOffset: number;
  readonly currentWave: WaveForm;
  readonly unisonVoices: number;
  readonly unisonDetuneCents: number;
  readonly oscMorphMode: OscMorphMode;
  readonly inputMode: InputMode;
  readonly lastNavAction: NavAction;
}

export const BASE_MIDI = 60;
