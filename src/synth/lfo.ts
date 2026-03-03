import type { LfoRateMode, LfoShape, LfoSyncDivision } from "./params.js";

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const wrap01 = (value: number): number => {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
};

const beatsPerCycleByDivision: Record<LfoSyncDivision, number> = {
  "1/1": 4,
  "1/2": 2,
  "1/4": 1,
  "1/8": 0.5,
  "1/16": 0.25,
  "1/32": 0.125,
  "1/4T": 2 / 3,
  "1/8T": 1 / 3,
  "1/16T": 1 / 6,
  "1/4D": 1.5,
  "1/8D": 0.75,
};

export const resolveLfoRateHz = (
  rateMode: LfoRateMode,
  rateHz: number,
  rateSync: LfoSyncDivision,
  bpm: number,
): number => {
  if (rateMode === "hz") {
    return clamp(rateHz, 0.01, 64);
  }

  const beatsPerCycle = beatsPerCycleByDivision[rateSync] ?? 1;
  const beatsPerSecond = Math.max(1, bpm) / 60;
  return clamp(beatsPerSecond / beatsPerCycle, 0.01, 64);
};

export const getLfoPhaseAtTime = (
  rateHz: number,
  phaseOffset: number,
  nowSeconds: number,
  noteOnSeconds: number,
  retrigger: boolean,
): number => {
  const safeRate = Math.max(0.01, rateHz);
  const offset = wrap01(phaseOffset);
  const timeBase = retrigger
    ? Math.max(0, nowSeconds - noteOnSeconds)
    : Math.max(0, nowSeconds);
  return wrap01(offset + timeBase * safeRate);
};

export const getLfoCycleIndexAtTime = (
  rateHz: number,
  phaseOffset: number,
  nowSeconds: number,
  noteOnSeconds: number,
  retrigger: boolean,
): number => {
  const safeRate = Math.max(0.01, rateHz);
  const timeBase = retrigger
    ? Math.max(0, nowSeconds - noteOnSeconds)
    : Math.max(0, nowSeconds);
  return Math.floor(phaseOffset + timeBase * safeRate);
};

const pseudoRandomSigned = (seed: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  const fract = x - Math.floor(x);
  return fract * 2 - 1;
};

export const sampleLfoShape = (
  shape: LfoShape,
  phase01: number,
  randomSeed = 0,
): number => {
  const phase = wrap01(phase01);

  if (shape === "sine") {
    return Math.sin(phase * Math.PI * 2);
  }

  if (shape === "triangle") {
    const centered = phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
    return clamp(centered, -1, 1);
  }

  if (shape === "saw") {
    return clamp(phase * 2 - 1, -1, 1);
  }

  if (shape === "square") {
    return phase < 0.5 ? 1 : -1;
  }

  return pseudoRandomSigned(randomSeed);
};
