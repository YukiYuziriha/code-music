import { describe, expect, test } from "bun:test";
import { applyAction, createInitialState, toMidi } from "./state.js";

describe("app/state", () => {
  test("applies OSC controls with clamping and morph cycling", () => {
    let state = createInitialState();

    for (let i = 0; i < 10; i += 1) {
      state = applyAction(state, { type: "octave/shift", delta: 1 });
    }
    expect(state.octaveOffset).toBe(4);

    state = applyAction(state, { type: "unison/voices/shift", delta: 1 });
    expect(state.unisonVoices).toBe(2);
    for (let i = 0; i < 20; i += 1) {
      state = applyAction(state, { type: "unison/voices/shift", delta: 1 });
    }
    expect(state.unisonVoices).toBe(16);

    state = applyAction(state, { type: "unison/detune/shift", steps: 100 });
    expect(state.unisonDetuneCents).toBe(50);

    state = applyAction(state, { type: "osc/morph/cycle", delta: 1 });
    expect(state.oscMorphMode).toBe("low-pass");
    state = applyAction(state, { type: "osc/morph/cycle", delta: -1 });
    expect(state.oscMorphMode).toBe("none");
  });

  test("steps and clamps ENV controls", () => {
    let state = createInitialState();

    state = applyAction(state, { type: "env/attack/shift", delta: -10 });
    expect(state.env.attack).toBe(0);

    state = applyAction(state, { type: "env/release/shift", delta: 900 });
    expect(state.env.release).toBe(8);

    state = applyAction(state, { type: "env/sustain/shift", delta: -100 });
    expect(state.env.sustain).toBe(0);

    state = applyAction(state, { type: "env/sustain/shift", delta: 200 });
    expect(state.env.sustain).toBe(1);
  });

  test("cycles blocks/cells and keeps per-block cell selection", () => {
    let state = createInitialState();

    state = applyAction(state, { type: "nav/cell/cycle", delta: 1 });
    expect(state.selectedCellByBlock.osc).toBe(1);

    state = applyAction(state, { type: "nav/block/select", block: "env" });
    state = applyAction(state, { type: "nav/cell/cycle", delta: 1 });
    state = applyAction(state, { type: "nav/cell/cycle", delta: 1 });
    expect(state.selectedCellByBlock.env).toBe(2);

    state = applyAction(state, { type: "nav/block/select", block: "osc" });
    expect(state.selectedCellByBlock.osc).toBe(1);

    state = applyAction(state, { type: "nav/block/select", block: "lfo" });
    state = applyAction(state, { type: "nav/block/cycle", delta: 1 });
    expect(state.selectedBlock).toBe("osc");
  });

  test("handles matrix mode and target navigation", () => {
    let state = createInitialState();
    state = applyAction(state, { type: "mode/set", mode: "nav" });
    state = applyAction(state, {
      type: "matrix/selection/set",
      selection: {
        source: "env1",
        originBlock: "env",
        originCellIndex: 6,
        targetBlock: "env",
        targetCellIndex: 0,
      },
    });

    state = applyAction(state, { type: "matrix/mode/set", mode: "pick-block" });
    state = applyAction(state, { type: "matrix/target/block/cycle", delta: 1 });
    expect(state.matrixSelection?.targetBlock).toBe("osc");
    expect(state.matrixSelection?.targetCellIndex).toBe(1);

    state = applyAction(state, { type: "matrix/target/cell/cycle", delta: 1 });
    expect(state.matrixSelection?.targetCellIndex).toBe(2);
  });

  test("toggles matrix routes without duplicates", () => {
    let state = createInitialState();

    state = applyAction(state, {
      type: "matrix/route/toggle",
      source: "env1",
      target: "osc.unisonVoices",
    });
    expect(state.modRoutes.length).toBe(1);
    expect(state.modRoutes[0]).toEqual({
      source: "env1",
      target: "osc.unisonVoices",
      amount: 1,
      enabled: true,
    });

    state = applyAction(state, {
      type: "matrix/route/toggle",
      source: "env1",
      target: "osc.unisonVoices",
    });
    expect(state.modRoutes.length).toBe(0);
  });

  test("tracks note on/off and panic env preview state", () => {
    let state = createInitialState();

    state = applyAction(state, {
      type: "note/on",
      key: "z",
      midi: 60,
      atMs: 1000,
    });
    state = applyAction(state, {
      type: "note/on",
      key: "x",
      midi: 62,
      atMs: 1020,
    });
    expect(state.activeKeys.size).toBe(2);
    expect(state.envPreview.gateOnAtMs).toBe(1020);
    expect(state.envPreview.gateOffAtMs).toBeNull();

    state = applyAction(state, { type: "note/off", key: "z", atMs: 1200 });
    expect(state.activeKeys.size).toBe(1);
    expect(state.envPreview.gateOffAtMs).toBeNull();

    state = applyAction(state, { type: "panic" });
    expect(state.activeKeys.size).toBe(0);
    expect(state.envPreview.gateOnAtMs).toBeNull();
    expect(state.envPreview.gateOffAtMs).toBeNull();
    expect(state.envPreview.releaseStartLevel).toBe(0);
  });

  test("maps keyboard keys to MIDI with octave offset", () => {
    const state = applyAction(createInitialState(), {
      type: "octave/shift",
      delta: 1,
    });

    expect(toMidi(state, "z")).toBe(72);
    expect(toMidi(state, "s")).toBe(73);
    expect(toMidi(state, "?")).toBeNull();
  });

  test("mode changes clear keys only when entering nav", () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: "note/on",
      key: "z",
      midi: 60,
      atMs: 100,
    });
    state = applyAction(state, { type: "mode/set", mode: "nav" });

    expect(state.inputMode).toBe("nav");
    expect(state.activeKeys.size).toBe(0);

    state = applyAction(state, {
      type: "note/on",
      key: "x",
      midi: 62,
      atMs: 110,
    });
    state = applyAction(state, { type: "mode/set", mode: "play" });
    expect(state.inputMode).toBe("play");
    expect(state.activeKeys.size).toBe(1);
  });

  test("matrix mode set to idle clears selection", () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: "matrix/selection/set",
      selection: {
        source: "env1",
        originBlock: "env",
        originCellIndex: 6,
        targetBlock: "osc",
        targetCellIndex: 0,
      },
    });
    state = applyAction(state, { type: "matrix/mode/set", mode: "pick-cell" });
    expect(state.matrixSelection).not.toBeNull();

    state = applyAction(state, { type: "matrix/mode/set", mode: "idle" });
    expect(state.matrixSelection).toBeNull();
  });

  test("matrix actions with no selection are no-ops", () => {
    const state = createInitialState();
    const nextBlock = applyAction(state, {
      type: "matrix/target/block/cycle",
      delta: 1,
    });
    const nextCell = applyAction(state, {
      type: "matrix/target/cell/cycle",
      delta: 1,
    });

    expect(nextBlock).toBe(state);
    expect(nextCell).toBe(state);
  });

  test("matrix/routes/set replaces full route list", () => {
    const state = applyAction(createInitialState(), {
      type: "matrix/routes/set",
      routes: [
        {
          source: "env1",
          target: "osc.unisonDetuneCents",
          amount: 0.5,
          enabled: true,
        },
      ],
    });

    expect(state.modRoutes).toEqual([
      {
        source: "env1",
        target: "osc.unisonDetuneCents",
        amount: 0.5,
        enabled: true,
      },
    ]);
  });

  test("duplicate note-on and missing note-off are no-ops", () => {
    let state = createInitialState();
    state = applyAction(state, {
      type: "note/on",
      key: "z",
      midi: 60,
      atMs: 1000,
    });
    const afterDuplicateOn = applyAction(state, {
      type: "note/on",
      key: "z",
      midi: 60,
      atMs: 1200,
    });
    expect(afterDuplicateOn).toBe(state);

    const afterMissingOff = applyAction(state, {
      type: "note/off",
      key: "x",
      atMs: 1300,
    });
    expect(afterMissingOff).toBe(state);
  });

  test("panic is a no-op when there are no active keys", () => {
    const state = createInitialState();
    const next = applyAction(state, { type: "panic" });
    expect(next).toBe(state);
  });
});
