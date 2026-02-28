import type { ModRoute, ModTarget } from "./matrix.js";

export type ModSourceValue = {
  readonly env1: number;
  readonly lfo1: number;
};

export interface ModTargetDescriptor {
  readonly id: ModTarget;
  readonly mode: "continuous" | "note-on";
  readonly min: number;
  readonly max: number;
  readonly depth: number;
  readonly quantize: "none" | "round";
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const clamp01 = (value: number): number => {
  return clamp(value, 0, 1);
};

const clampSigned = (value: number): number => {
  return clamp(value, -1, 1);
};

export const MOD_TARGETS: Readonly<Record<ModTarget, ModTargetDescriptor>> = {
  "osc.unisonVoices": {
    id: "osc.unisonVoices",
    mode: "continuous",
    min: 1,
    max: 16,
    depth: 8,
    quantize: "round",
  },
  "osc.unisonDetuneCents": {
    id: "osc.unisonDetuneCents",
    mode: "continuous",
    min: 0,
    max: 100,
    depth: 50,
    quantize: "none",
  },
  "osc.level": {
    id: "osc.level",
    mode: "continuous",
    min: 0,
    max: 1,
    depth: 1,
    quantize: "none",
  },
  "amp.level": {
    id: "amp.level",
    mode: "continuous",
    min: 0,
    max: 1,
    depth: 1,
    quantize: "none",
  },
};

const toSourceSignal = (
  route: ModRoute,
  sourceValue: ModSourceValue,
): number => {
  let raw = 0;
  if (route.source === "env1") {
    raw = clamp01(sourceValue.env1);
  } else if (route.source === "lfo1") {
    raw = clamp01(sourceValue.lfo1);
  }
  return route.bipolar ? raw * 2 - 1 : raw;
};

const sumTargetContribution = (
  routes: readonly ModRoute[],
  target: ModTarget,
  sourceValue: ModSourceValue,
): number => {
  let sum = 0;

  for (const route of routes) {
    if (route.target !== target) continue;
    const signal = toSourceSignal(route, sourceValue);
    sum += signal * clampSigned(route.amount);
  }

  return clampSigned(sum);
};

const quantizeValue = (
  value: number,
  quantize: ModTargetDescriptor["quantize"],
): number => {
  return quantize === "round" ? Math.round(value) : value;
};

export const mapTargetValue = (
  descriptor: ModTargetDescriptor,
  baseValue: number,
  normalizedContribution: number,
): number => {
  const unclamped = baseValue + normalizedContribution * descriptor.depth;
  const quantized = quantizeValue(unclamped, descriptor.quantize);
  return clamp(quantized, descriptor.min, descriptor.max);
};

export const resolveTargetValue = (
  routes: readonly ModRoute[],
  target: ModTarget,
  baseValue: number,
  sourceValue: ModSourceValue,
): number => {
  const descriptor = MOD_TARGETS[target];
  const contribution = sumTargetContribution(routes, target, sourceValue);
  return mapTargetValue(descriptor, baseValue, contribution);
};

export const resolveNoteOnUnisonVoices = (
  routes: readonly ModRoute[],
  baseUnisonVoices: number,
): number => {
  return resolveTargetValue(routes, "osc.unisonVoices", baseUnisonVoices, {
    env1: 1,
    lfo1: 0.5,
  });
};
