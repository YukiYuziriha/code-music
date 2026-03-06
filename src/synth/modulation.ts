import type { ModRoute, ModSource, ModTarget } from "./matrix.js";

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
  readonly centered: boolean;
  readonly quantize: "none" | "round";
}

export interface ResolveTargetOptions {
  readonly quantize?: boolean;
}

export const isCenteredModSource = (source: ModSource): boolean => {
  return source === "lfo1" || source === "random1";
};

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
    depth: 15,
    centered: true,
    quantize: "round",
  },
  "osc.unisonDetuneCents": {
    id: "osc.unisonDetuneCents",
    mode: "continuous",
    min: 0,
    max: 100,
    depth: 50,
    centered: false,
    quantize: "none",
  },
  "osc.level": {
    id: "osc.level",
    mode: "continuous",
    min: 0,
    max: 1,
    depth: 1,
    centered: false,
    quantize: "none",
  },
  "amp.level": {
    id: "amp.level",
    mode: "continuous",
    min: 0,
    max: 1,
    depth: 1,
    centered: false,
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

const mapCenteredTargetValue = (
  descriptor: ModTargetDescriptor,
  baseValue: number,
  normalizedContribution: number,
): number => {
  const signedContribution = clampSigned(normalizedContribution);
  const distance =
    signedContribution >= 0
      ? descriptor.max - baseValue
      : baseValue - descriptor.min;
  return baseValue + signedContribution * distance;
};

export const resolveTargetContribution = (
  routes: readonly ModRoute[],
  target: ModTarget,
  sourceValue: ModSourceValue,
): number => {
  return sumTargetContribution(routes, target, sourceValue);
};

export const mapTargetValue = (
  descriptor: ModTargetDescriptor,
  baseValue: number,
  normalizedContribution: number,
  options: ResolveTargetOptions = {},
): number => {
  const unclamped = descriptor.centered
    ? mapCenteredTargetValue(descriptor, baseValue, normalizedContribution)
    : baseValue + normalizedContribution * descriptor.depth;
  const quantized =
    (options.quantize ?? true)
      ? quantizeValue(unclamped, descriptor.quantize)
      : unclamped;
  return clamp(quantized, descriptor.min, descriptor.max);
};

export const resolveTargetValue = (
  routes: readonly ModRoute[],
  target: ModTarget,
  baseValue: number,
  sourceValue: ModSourceValue,
  options: ResolveTargetOptions = {},
): number => {
  const descriptor = MOD_TARGETS[target];
  const contribution = resolveTargetContribution(routes, target, sourceValue);
  return mapTargetValue(descriptor, baseValue, contribution, options);
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
