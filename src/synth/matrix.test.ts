import { describe, expect, test } from "bun:test";
import { ModMatrix } from "./matrix.js";

describe("synth/matrix", () => {
  test("normalizes route amounts on constructor", () => {
    const matrix = new ModMatrix([
      {
        source: "env1",
        target: "osc.unisonVoices",
        amount: 4,
        bipolar: false,
      },
      {
        source: "lfo1",
        target: "osc.unisonDetuneCents",
        amount: -4,
        bipolar: true,
      },
    ]);

    const routes = matrix.getRoutes();
    expect(routes[0]?.amount).toBe(1);
    expect(routes[1]?.amount).toBe(-1);
  });

  test("normalizes route amounts via setRoutes", () => {
    const matrix = new ModMatrix();
    matrix.setRoutes([
      {
        source: "env1",
        target: "osc.unisonVoices",
        amount: 0.5,
        bipolar: false,
      },
      {
        source: "lfo1",
        target: "osc.unisonDetuneCents",
        amount: -2,
        bipolar: true,
      },
    ]);

    const routes = matrix.getRoutes();
    expect(routes.length).toBe(2);
    expect(routes[0]?.amount).toBe(0.5);
    expect(routes[1]?.amount).toBe(-1);
  });
});
