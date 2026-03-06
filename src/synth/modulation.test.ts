import { describe, expect, test } from "bun:test";
import {
  MOD_TARGETS,
  mapTargetValue,
  resolveNoteOnUnisonVoices,
  resolveTargetValue,
} from "./modulation.js";
import type { ModRoute } from "./matrix.js";

describe("synth/modulation", () => {
  test("mapTargetValue applies depth, quantize, and clamp", () => {
    const voices = MOD_TARGETS["osc.unisonVoices"];
    const detune = MOD_TARGETS["osc.unisonDetuneCents"];

    expect(mapTargetValue(voices, 3, 0.49)).toBe(9);
    expect(mapTargetValue(voices, 15, 1)).toBe(16);
    expect(mapTargetValue(voices, 1, -1)).toBe(1);
    expect(mapTargetValue(voices, 8, -1)).toBe(1);
    expect(mapTargetValue(voices, 8, 1)).toBe(16);

    expect(mapTargetValue(detune, 10, 0.5)).toBe(35);
    expect(mapTargetValue(detune, 80, 1)).toBe(100);
  });

  test("resolveTargetValue handles bipolar source conversion", () => {
    const routes: readonly ModRoute[] = [
      {
        source: "lfo1",
        target: "osc.unisonVoices",
        amount: 1,
        bipolar: true,
      },
    ];

    const high = resolveTargetValue(routes, "osc.unisonVoices", 8, {
      env1: 0,
      lfo1: 1,
    });
    const low = resolveTargetValue(routes, "osc.unisonVoices", 8, {
      env1: 0,
      lfo1: 0,
    });

    expect(high).toBe(16);
    expect(low).toBe(1);
  });

  test("resolveTargetValue returns fractional centered voices when quantize is off", () => {
    const routes: readonly ModRoute[] = [
      {
        source: "lfo1",
        target: "osc.unisonVoices",
        amount: 0.5,
        bipolar: true,
      },
    ];

    const value = resolveTargetValue(
      routes,
      "osc.unisonVoices",
      8,
      { env1: 0, lfo1: 0 },
      { quantize: false },
    );

    expect(value).toBe(4.5);
  });

  test("resolveTargetValue clamps summed contribution", () => {
    const routes: readonly ModRoute[] = [
      {
        source: "env1",
        target: "osc.unisonDetuneCents",
        amount: 1,
        bipolar: false,
      },
      {
        source: "lfo1",
        target: "osc.unisonDetuneCents",
        amount: 1,
        bipolar: false,
      },
    ];

    const resolved = resolveTargetValue(routes, "osc.unisonDetuneCents", 10, {
      env1: 1,
      lfo1: 1,
    });

    expect(resolved).toBe(60);
  });

  test("resolveNoteOnUnisonVoices resolves with fixed note-on sources", () => {
    const routes: readonly ModRoute[] = [
      {
        source: "env1",
        target: "osc.unisonVoices",
        amount: 1,
        bipolar: false,
      },
    ];

    const resolved = resolveNoteOnUnisonVoices(routes, 2);
    expect(resolved).toBe(16);
  });
});
