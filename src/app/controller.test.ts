import { describe, expect, test } from "bun:test";
import type { AudioEngine } from "../audio/engine.js";
import { createController } from "./controller.js";
import type { AppAction } from "./actions.js";
import { applyAction, createInitialState } from "./state.js";
import type { AppState } from "./types.js";

interface EngineCalls {
  panic: number;
  setWave: string[];
  setDelay: number[];
  noteOn: Array<{ midi: number; velocity: number }>;
  noteOff: number[];
  setModRoutes: unknown[][];
  resumeIfNeeded: number;
}

const createEngineMock = (): { engine: AudioEngine; calls: EngineCalls } => {
  const calls: EngineCalls = {
    panic: 0,
    setWave: [],
    setDelay: [],
    noteOn: [],
    noteOff: [],
    setModRoutes: [],
    resumeIfNeeded: 0,
  };

  const engine = {
    resumeIfNeeded: () => {
      calls.resumeIfNeeded += 1;
      return Promise.resolve();
    },
    noteOn: (midi: number, velocity = 1) => {
      calls.noteOn.push({ midi, velocity });
    },
    noteOff: (midi: number) => {
      calls.noteOff.push(midi);
    },
    panic: () => {
      calls.panic += 1;
    },
    setWave: (wave: AppState["currentWave"]) => {
      calls.setWave.push(wave);
    },
    setMasterGain: () => {},
    setAttack: () => {},
    setDelay: (value: number) => {
      calls.setDelay.push(value);
    },
    setHold: () => {},
    setDecay: () => {},
    setSustain: () => {},
    setRelease: () => {},
    setUnisonVoices: () => {},
    setUnisonDetuneCents: () => {},
    setOscMorphMode: () => {},
    setLfoMode: () => {},
    setLfoRateHz: () => {},
    setLfoPhaseOffset: () => {},
    setLfoPoints: () => {},
    setMaxVoices: () => {},
    setModRoutes: (routes: readonly unknown[]) => {
      calls.setModRoutes.push([...routes]);
    },
    getPatch: () => {
      throw new Error("not used in tests");
    },
  } as unknown as AudioEngine;

  return { engine, calls };
};

const keyEvent = (key: string, shiftKey = false): KeyboardEvent => {
  return {
    key,
    shiftKey,
    repeat: false,
    preventDefault: () => {},
  } as unknown as KeyboardEvent;
};

describe("app/controller", () => {
  test("routes OSC shortcut in play mode", () => {
    let state = createInitialState();
    const actions: AppAction[] = [];
    const { engine, calls } = createEngineMock();

    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        actions.push(action);
        state = applyAction(state, action);
      },
    });

    const signal = controller.handleKeyDown(keyEvent("e"));

    expect(signal).toBe("none");
    expect(state.currentWave).toBe("square");
    expect(calls.setWave).toEqual(["square"]);
    expect(actions.some((action) => action.type === "wave/set")).toBe(true);
  });

  test("routes ENV shortcut in play mode and syncs engine", () => {
    let state = applyAction(createInitialState(), {
      type: "nav/block/select",
      block: "env",
    });
    const { engine, calls } = createEngineMock();

    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        state = applyAction(state, action);
      },
    });

    controller.handleKeyDown(keyEvent("e"));

    expect(state.env.delay).toBe(0.01);
    expect(calls.setDelay[calls.setDelay.length - 1]).toBe(0.01);
  });

  test("cycles backtick mode through play/nav/play on OSC", () => {
    let state = createInitialState();
    const { engine, calls } = createEngineMock();

    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        state = applyAction(state, action);
      },
    });

    controller.handleKeyDown(keyEvent("`"));
    expect(state.inputMode).toBe("nav");
    expect(calls.panic).toBe(1);

    controller.handleKeyDown(keyEvent("`"));
    expect(state.inputMode).toBe("play");
  });

  test("cycles backtick mode through play/nav/edit on LFO", () => {
    let state = applyAction(createInitialState(), {
      type: "nav/block/select",
      block: "lfo",
    });
    const { engine } = createEngineMock();

    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        state = applyAction(state, action);
      },
    });

    controller.handleKeyDown(keyEvent("`"));
    controller.handleKeyDown(keyEvent("`"));
    expect(state.inputMode).toBe("edit");
  });

  test("starts matrix pick flow from ENV matrix cell", () => {
    let state = applyAction(createInitialState(), {
      type: "nav/block/select",
      block: "env",
    });
    state = applyAction(state, { type: "mode/set", mode: "nav" });

    const { engine } = createEngineMock();
    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        state = applyAction(state, action);
      },
    });

    controller.handleKeyDown(keyEvent("enter"));

    expect(state.matrixMode).toBe("pick-block");
    expect(state.matrixSelection?.source).toBe("env1");
    expect(state.matrixSelection?.targetBlock).toBe("osc");
    expect(state.selectedBlock).toBe("osc");
  });

  test("supports matrix pick-cell navigation and escape backtracking", () => {
    let state = applyAction(createInitialState(), {
      type: "nav/block/select",
      block: "env",
    });
    state = applyAction(state, { type: "mode/set", mode: "nav" });

    const { engine } = createEngineMock();
    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        state = applyAction(state, action);
      },
    });

    controller.handleKeyDown(keyEvent("enter"));
    controller.handleKeyDown(keyEvent("enter"));
    expect(state.matrixMode).toBe("pick-cell");

    controller.handleKeyDown(keyEvent("j"));
    expect(state.matrixSelection?.targetCellIndex).toBe(1);

    expect(controller.handleKeyDown(keyEvent("escape"))).toBe("none");
    expect(state.matrixMode).toBe("pick-block");

    expect(controller.handleKeyDown(keyEvent("escape"))).toBe("none");
    expect(state.matrixMode).toBe("idle");
    expect(state.matrixSelection).toBeNull();

    expect(controller.handleKeyDown(keyEvent("escape"))).toBe("quit");
  });

  test("navigates blocks with h/l in nav idle", () => {
    let state = applyAction(createInitialState(), {
      type: "mode/set",
      mode: "nav",
    });
    const { engine } = createEngineMock();

    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        state = applyAction(state, action);
      },
    });

    controller.handleKeyDown(keyEvent("l"));
    expect(state.selectedBlock).toBe("env");

    controller.handleKeyDown(keyEvent("h"));
    expect(state.selectedBlock).toBe("osc");
  });

  test("applies matrix route on enter from pick-cell", () => {
    let state = applyAction(createInitialState(), {
      type: "nav/block/select",
      block: "env",
    });
    state = applyAction(state, { type: "mode/set", mode: "nav" });
    const { engine, calls } = createEngineMock();

    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        state = applyAction(state, action);
      },
    });

    controller.handleKeyDown(keyEvent("enter"));
    controller.handleKeyDown(keyEvent("enter"));
    controller.handleKeyDown(keyEvent("j"));
    controller.handleKeyDown(keyEvent("j"));
    controller.handleKeyDown(keyEvent("enter"));

    expect(state.inputMode).toBe("play");
    expect(state.matrixMode).toBe("idle");
    expect(state.matrixSelection).toBeNull();
    expect(state.selectedBlock).toBe("env");
    expect(state.modRoutes.length).toBe(1);
    expect(state.modRoutes[0]?.source).toBe("env1");
    expect(state.modRoutes[0]?.target).toBe("osc.unisonVoices");

    expect(calls.setModRoutes.length).toBe(1);
    const firstCall = calls.setModRoutes[0] as readonly {
      source: string;
      target: string;
      amount: number;
      bipolar: boolean;
    }[];
    expect(firstCall[0]).toEqual({
      source: "env1",
      target: "osc.unisonVoices",
      amount: 1,
      bipolar: false,
    });
  });

  test("plays and releases note in play mode", async () => {
    let state = createInitialState();
    const { engine, calls } = createEngineMock();

    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        state = applyAction(state, action);
      },
    });

    controller.handleKeyDown(keyEvent("z"));
    await Promise.resolve();

    expect(calls.resumeIfNeeded).toBe(1);
    expect(calls.noteOn).toEqual([{ midi: 60, velocity: 0.85 }]);
    expect(state.activeKeys.get("z")).toBe(60);

    controller.handleKeyUp(keyEvent("z"));
    expect(calls.noteOff).toEqual([60]);
    expect(state.activeKeys.size).toBe(0);
  });

  test("returns quit on escape in play mode", () => {
    let state = createInitialState();
    const { engine } = createEngineMock();

    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        state = applyAction(state, action);
      },
    });

    expect(controller.handleKeyDown(keyEvent("escape"))).toBe("quit");
  });

  test("terminal escape and panic API", () => {
    let state = createInitialState();
    const { engine, calls } = createEngineMock();

    const controller = createController({
      engine,
      getState: () => state,
      dispatch: (action) => {
        state = applyAction(state, action);
      },
    });

    expect(controller.handleTerminalData("\x1b")).toBe("quit");
    expect(controller.handleTerminalData("a")).toBe("none");

    controller.panic();
    expect(calls.panic).toBe(1);
    expect(state.activeKeys.size).toBe(0);
  });
});
