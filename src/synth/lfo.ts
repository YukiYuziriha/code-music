import type { LfoMode, LfoPoint } from "./params.js";

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const wrap01 = (value: number): number => {
  const wrapped = value % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
};

export const sampleLfoShape = (
  points: readonly LfoPoint[],
  phase01: number,
): number => {
  if (points.length === 0) return 0;
  if (points.length === 1) return clamp(points[0]?.y ?? 0, -1, 1);

  const phase = wrap01(phase01);

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (left === undefined || right === undefined) continue;
    if (phase < left.x || phase > right.x) continue;

    const span = right.x - left.x;
    if (span <= 1e-6) {
      return clamp(left.y, -1, 1);
    }

    const t = clamp((phase - left.x) / span, 0, 1);
    return clamp(left.y + (right.y - left.y) * t, -1, 1);
  }

  return clamp(points[points.length - 1]?.y ?? 0, -1, 1);
};

export const getLfoPhaseAtTime = (
  mode: LfoMode,
  rateHz: number,
  phaseOffset: number,
  nowSeconds: number,
  noteOnSeconds: number,
): number => {
  const safeRate = Math.max(0.01, rateHz);
  const offset = wrap01(phaseOffset);

  if (mode === "sync") {
    return wrap01(offset + nowSeconds * safeRate);
  }

  const elapsed = Math.max(0, nowSeconds - noteOnSeconds);
  const progressed = offset + elapsed * safeRate;
  if (mode === "envelope") {
    return clamp(progressed, 0, 1);
  }
  return wrap01(progressed);
};
