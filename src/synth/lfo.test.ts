import { describe, expect, test } from "bun:test";
import {
  getLfoCycleIndexAtTime,
  getLfoPhaseAtTime,
  resolveLfoRateHz,
  sampleLfoShape,
} from "./lfo.js";

describe("synth/lfo", () => {
  test("resolveLfoRateHz clamps hz mode", () => {
    expect(resolveLfoRateHz("hz", -10, "1/4", 120)).toBe(0.01);
    expect(resolveLfoRateHz("hz", 2.5, "1/4", 120)).toBe(2.5);
    expect(resolveLfoRateHz("hz", 128, "1/4", 120)).toBe(64);
  });

  test("resolveLfoRateHz maps sync divisions using bpm", () => {
    expect(resolveLfoRateHz("sync", 999, "1/4", 120)).toBe(2);
    expect(resolveLfoRateHz("sync", 999, "1/8", 120)).toBe(4);
    expect(resolveLfoRateHz("sync", 999, "1/4T", 120)).toBe(3);
    expect(resolveLfoRateHz("sync", 999, "1/4", 0)).toBeCloseTo(1 / 60, 6);
  });

  test("getLfoPhaseAtTime uses retrigger base when enabled", () => {
    const retriggerPhase = getLfoPhaseAtTime(1.5, 0.2, 2.5, 2, true);
    const freerunPhase = getLfoPhaseAtTime(1.5, 0.2, 2.5, 2, false);

    expect(retriggerPhase).toBeCloseTo(0.95, 6);
    expect(freerunPhase).toBeCloseTo(0.95, 6);

    const retriggerOffset = getLfoPhaseAtTime(1.5, 0.2, 2.3, 2.1, true);
    const freerunOffset = getLfoPhaseAtTime(1.5, 0.2, 2.3, 2.1, false);
    expect(retriggerOffset).toBeCloseTo(0.5, 6);
    expect(freerunOffset).toBeCloseTo(0.65, 6);
  });

  test("getLfoCycleIndexAtTime tracks cycle count", () => {
    expect(getLfoCycleIndexAtTime(2, 0, 0.49, 0, false)).toBe(0);
    expect(getLfoCycleIndexAtTime(2, 0, 0.5, 0, false)).toBe(1);
    expect(getLfoCycleIndexAtTime(2, 0.75, 0.2, 0, false)).toBe(1);
    expect(getLfoCycleIndexAtTime(2, 0, 2.2, 2, true)).toBe(0);
  });

  test("sampleLfoShape returns expected deterministic values", () => {
    expect(sampleLfoShape("sine", 0)).toBeCloseTo(0, 6);
    expect(sampleLfoShape("triangle", 0)).toBeCloseTo(-1, 6);
    expect(sampleLfoShape("triangle", 0.25)).toBeCloseTo(0, 6);
    expect(sampleLfoShape("triangle", 0.5)).toBeCloseTo(1, 6);
    expect(sampleLfoShape("saw", 0)).toBeCloseTo(-1, 6);
    expect(sampleLfoShape("saw", 0.5)).toBeCloseTo(0, 6);
    expect(sampleLfoShape("square", 0.49)).toBe(1);
    expect(sampleLfoShape("square", 0.5)).toBe(-1);
  });

  test("random shape is deterministic per seed", () => {
    const a = sampleLfoShape("random", 0.2, 123);
    const b = sampleLfoShape("random", 0.9, 123);
    const c = sampleLfoShape("random", 0.2, 456);

    expect(a).toBeCloseTo(b, 8);
    expect(a).not.toBeCloseTo(c, 4);
    expect(a).toBeGreaterThanOrEqual(-1);
    expect(a).toBeLessThanOrEqual(1);
  });
});
