import type { WaveForm } from "../synth/polySynth.js";

export const keyToSemitone: Record<string, number> = {
  z: 0,
  s: 1,
  x: 2,
  d: 3,
  c: 4,
  v: 5,
  g: 6,
  b: 7,
  h: 8,
  n: 9,
  j: 10,
  m: 11,
  ",": 12,
};

export const waveByKey: Record<string, WaveForm> = {
  "1": "sine",
  "2": "triangle",
  "3": "sawtooth",
  "4": "square",
};

export const lowerPlayKeys = ["z", "x", "c", "v", "b", "n", "m", ","] as const;
export const upperPlayKeys = ["s", "d", "g", "h", "j"] as const;
