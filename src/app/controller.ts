import type {
  ModRoute as SynthModRoute,
  WaveForm,
} from "../synth/polySynth.js";
import type { AudioEngine } from "../audio/engine.js";
import type { AppAction } from "./actions.js";
import { getBlockCells } from "./blocks.js";
import { keyToSemitone, waveByKey } from "./keymap.js";
import { toMidi } from "./state.js";
import type { AppState } from "./types.js";

export type ControllerSignal = "none" | "quit";

interface ControllerDependencies {
  engine: AudioEngine;
  getState: () => AppState;
  dispatch: (action: AppAction) => void;
}

const toggleMode = (mode: AppState["inputMode"]): AppState["inputMode"] => {
  return mode === "play" ? "nav" : "play";
};

const waveCycleOrder: readonly WaveForm[] = [
  "sine",
  "triangle",
  "sawtooth",
  "square",
];

const cycleWave = (current: WaveForm, delta: -1 | 1): WaveForm => {
  const currentIndex = waveCycleOrder.indexOf(current);
  if (currentIndex < 0) return waveCycleOrder[0] ?? "sine";
  const nextIndex =
    (currentIndex + delta + waveCycleOrder.length) % waveCycleOrder.length;
  return waveCycleOrder[nextIndex] ?? waveCycleOrder[0] ?? "sine";
};

export const createController = (deps: ControllerDependencies) => {
  const syncModRoutes = (): void => {
    const routes: SynthModRoute[] = [];
    for (const route of deps.getState().modRoutes) {
      if (!route.enabled) continue;
      if (route.target === "osc.unisonDetuneCents") {
        routes.push({
          source: route.source,
          target: "osc.unisonDetuneCents",
          amount: route.amount,
          bipolar: true,
        });
      }

      if (route.target === "osc.unisonVoices") {
        routes.push({
          source: route.source,
          target: "osc.unisonVoices",
          amount: route.amount,
          bipolar: false,
        });
      }
    }

    deps.engine.setModRoutes(routes);
  };

  const setWave = (wave: WaveForm): void => {
    deps.engine.setWave(wave);
    deps.dispatch({ type: "wave/set", wave });
  };

  const shiftUnisonVoices = (delta: -1 | 1): void => {
    deps.dispatch({ type: "unison/voices/shift", delta });
    deps.engine.setUnisonVoices(deps.getState().unisonVoices);
  };

  const shiftUnisonDetune = (steps: number): void => {
    deps.dispatch({ type: "unison/detune/shift", steps });
    deps.engine.setUnisonDetuneCents(deps.getState().unisonDetuneCents);
  };

  const cycleMorph = (delta: -1 | 1): void => {
    deps.dispatch({ type: "osc/morph/cycle", delta });
    deps.engine.setOscMorphMode(deps.getState().oscMorphMode);
  };

  const syncEnv = (): void => {
    const env = deps.getState().env;
    deps.engine.setDelay(env.delay);
    deps.engine.setAttack(env.attack);
    deps.engine.setHold(env.hold);
    deps.engine.setDecay(env.decay);
    deps.engine.setSustain(env.sustain);
    deps.engine.setRelease(env.release);
  };

  const startMatrixPick = (): void => {
    const oscCells = getBlockCells("osc");
    const firstTargetIndex = oscCells.findIndex((cell) => cell.targetable);

    deps.dispatch({
      type: "matrix/selection/set",
      selection: {
        source: "env1",
        originBlock: "env",
        originCellIndex: deps.getState().selectedCellByBlock.env,
        targetBlock: "osc",
        targetCellIndex: firstTargetIndex < 0 ? 0 : firstTargetIndex,
      },
    });
    deps.dispatch({ type: "nav/block/select", block: "osc" });
    deps.dispatch({ type: "matrix/mode/set", mode: "pick-block" });
  };

  const applyMatrixRoute = (): void => {
    const selection = deps.getState().matrixSelection;
    if (selection === null) return;

    const targetCells = getBlockCells(selection.targetBlock);
    const targetCell = targetCells[selection.targetCellIndex];
    if (targetCell === undefined || !targetCell.targetable) {
      return;
    }

    deps.dispatch({
      type: "matrix/route/toggle",
      source: selection.source,
      target: targetCell.id,
    });
    syncModRoutes();

    deps.dispatch({ type: "nav/block/select", block: selection.originBlock });
    deps.dispatch({ type: "matrix/mode/set", mode: "idle" });
    deps.dispatch({ type: "matrix/selection/set", selection: null });
  };

  const handleNavKeyDown = (key: string): ControllerSignal => {
    const matrixMode = deps.getState().matrixMode;

    if (key === "escape") {
      if (matrixMode === "pick-cell") {
        deps.dispatch({ type: "matrix/mode/set", mode: "pick-block" });
        return "none";
      }

      if (matrixMode === "pick-block") {
        const selection = deps.getState().matrixSelection;
        if (selection !== null) {
          deps.dispatch({
            type: "nav/block/select",
            block: selection.originBlock,
          });
        }
        deps.dispatch({ type: "matrix/mode/set", mode: "idle" });
        deps.dispatch({ type: "matrix/selection/set", selection: null });
        return "none";
      }

      return "quit";
    }

    if (matrixMode === "idle") {
      if (key === "h") {
        deps.dispatch({ type: "nav/block/cycle", delta: -1 });
        return "none";
      }
      if (key === "l") {
        deps.dispatch({ type: "nav/block/cycle", delta: 1 });
        return "none";
      }
      if (key === "k") {
        deps.dispatch({ type: "nav/cell/cycle", delta: -1 });
        return "none";
      }
      if (key === "j") {
        deps.dispatch({ type: "nav/cell/cycle", delta: 1 });
        return "none";
      }
      if (key === "-") {
        const state = deps.getState();
        if (state.selectedBlock !== "env") return "none";
        const selectedCell =
          getBlockCells("env")[state.selectedCellByBlock.env]?.id;
        switch (selectedCell) {
          case "env.delay":
            deps.dispatch({ type: "env/delay/shift", delta: -1 });
            break;
          case "env.attack":
            deps.dispatch({ type: "env/attack/shift", delta: -1 });
            break;
          case "env.hold":
            deps.dispatch({ type: "env/hold/shift", delta: -1 });
            break;
          case "env.decay":
            deps.dispatch({ type: "env/decay/shift", delta: -1 });
            break;
          case "env.sustain":
            deps.dispatch({ type: "env/sustain/shift", delta: -1 });
            break;
          case "env.release":
            deps.dispatch({ type: "env/release/shift", delta: -1 });
            break;
          default:
            return "none";
        }
        syncEnv();
        return "none";
      }
      if (key === "=") {
        const state = deps.getState();
        if (state.selectedBlock !== "env") return "none";
        const selectedCell =
          getBlockCells("env")[state.selectedCellByBlock.env]?.id;
        switch (selectedCell) {
          case "env.delay":
            deps.dispatch({ type: "env/delay/shift", delta: 1 });
            break;
          case "env.attack":
            deps.dispatch({ type: "env/attack/shift", delta: 1 });
            break;
          case "env.hold":
            deps.dispatch({ type: "env/hold/shift", delta: 1 });
            break;
          case "env.decay":
            deps.dispatch({ type: "env/decay/shift", delta: 1 });
            break;
          case "env.sustain":
            deps.dispatch({ type: "env/sustain/shift", delta: 1 });
            break;
          case "env.release":
            deps.dispatch({ type: "env/release/shift", delta: 1 });
            break;
          default:
            return "none";
        }
        syncEnv();
        return "none";
      }
      if (key === "enter") {
        const state = deps.getState();
        if (state.selectedBlock !== "env") return "none";
        const selectedCell =
          getBlockCells("env")[state.selectedCellByBlock.env]?.id;
        if (selectedCell === "env.matrix") {
          startMatrixPick();
        }
      }
      return "none";
    }

    if (matrixMode === "pick-block") {
      if (key === "h") {
        deps.dispatch({ type: "matrix/target/block/cycle", delta: -1 });
        const next = deps.getState().matrixSelection;
        if (next !== null) {
          deps.dispatch({ type: "nav/block/select", block: next.targetBlock });
        }
        return "none";
      }
      if (key === "l") {
        deps.dispatch({ type: "matrix/target/block/cycle", delta: 1 });
        const next = deps.getState().matrixSelection;
        if (next !== null) {
          deps.dispatch({ type: "nav/block/select", block: next.targetBlock });
        }
        return "none";
      }
      if (key === "enter") {
        const selection = deps.getState().matrixSelection;
        if (selection !== null) {
          deps.dispatch({
            type: "nav/block/select",
            block: selection.targetBlock,
          });
        }
        deps.dispatch({ type: "matrix/mode/set", mode: "pick-cell" });
      }
      return "none";
    }

    if (matrixMode === "pick-cell") {
      if (key === "k") {
        deps.dispatch({ type: "matrix/target/cell/cycle", delta: -1 });
        return "none";
      }
      if (key === "j") {
        deps.dispatch({ type: "matrix/target/cell/cycle", delta: 1 });
        return "none";
      }
      if (key === "enter") {
        applyMatrixRoute();
      }
    }

    return "none";
  };

  const handleKeyDown = (event: KeyboardEvent): ControllerSignal => {
    const key = event.key.toLowerCase();
    const isUnisonDetuneKey = key === "i" || key === "o";

    if (event.repeat && !isUnisonDetuneKey) return "none";

    if (key === "`") {
      const nextMode = toggleMode(deps.getState().inputMode);
      if (nextMode === "nav") {
        deps.engine.panic();
      }
      deps.dispatch({ type: "mode/set", mode: nextMode });
      return "none";
    }

    if (deps.getState().inputMode === "nav") {
      return handleNavKeyDown(key);
    }

    if (key === "escape") {
      return "quit";
    }

    if (key === "r") {
      deps.dispatch({ type: "octave/shift", delta: -1 });
      return "none";
    }

    if (key === "t") {
      deps.dispatch({ type: "octave/shift", delta: 1 });
      return "none";
    }

    if (key === "y") {
      shiftUnisonVoices(-1);
      return "none";
    }

    if (key === "u") {
      shiftUnisonVoices(1);
      return "none";
    }

    if (key === "i") {
      shiftUnisonDetune(-2);
      return "none";
    }

    if (key === "o") {
      shiftUnisonDetune(2);
      return "none";
    }

    if (key === "[") {
      cycleMorph(-1);
      return "none";
    }

    if (key === "]") {
      cycleMorph(1);
      return "none";
    }

    if (key === "w") {
      const nextWave = cycleWave(deps.getState().currentWave, -1);
      setWave(nextWave);
      return "none";
    }

    if (key === "e") {
      const nextWave = cycleWave(deps.getState().currentWave, 1);
      setWave(nextWave);
      return "none";
    }

    const wave: WaveForm | undefined = waveByKey[key];
    if (wave !== undefined) {
      setWave(wave);
      return "none";
    }

    if (keyToSemitone[key] === undefined) {
      return "none";
    }

    event.preventDefault();
    void deps.engine.resumeIfNeeded().then(() => {
      const midi = toMidi(deps.getState(), key);
      if (midi === null) return;
      deps.engine.noteOn(midi, 0.85);
      deps.dispatch({ type: "note/on", key, midi });
    });

    return "none";
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    if (deps.getState().inputMode !== "play") return;

    const key = event.key.toLowerCase();
    const midi = deps.getState().activeKeys.get(key);
    if (midi === undefined) return;

    deps.engine.noteOff(midi);
    deps.dispatch({ type: "note/off", key });
  };

  const handleTerminalData = (data: string): ControllerSignal => {
    return data === "\x1b" ? "quit" : "none";
  };

  const panic = (): void => {
    deps.engine.panic();
    deps.dispatch({ type: "panic" });
  };

  return {
    handleKeyDown,
    handleKeyUp,
    handleTerminalData,
    panic,
  };
};
