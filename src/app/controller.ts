import type {
  ModRoute as SynthModRoute,
  WaveForm,
} from "../synth/polySynth.js";
import type { AudioEngine } from "../audio/engine.js";
import type { AppAction } from "./actions.js";
import { getBlockCells } from "./blocks.js";
import { keyToSemitone, waveByKey } from "./keymap.js";
import { CELL_SHORTCUTS, LFO_CELL_SHORTCUTS } from "./shortcuts.js";
import { toMidi } from "./state.js";
import type { AppState } from "./types.js";

export type ControllerSignal = "none" | "quit";

interface ControllerDependencies {
  engine: AudioEngine;
  getState: () => AppState;
  dispatch: (action: AppAction) => void;
}

const nextInputMode = (state: AppState): AppState["inputMode"] => {
  if (state.inputMode === "play") return "nav";
  if (state.inputMode === "nav") {
    return state.selectedBlock === "lfo" ? "edit" : "play";
  }
  return "play";
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

const isRepeatableShortcutKey = (key: string): boolean => {
  for (const shortcut of [...CELL_SHORTCUTS, ...LFO_CELL_SHORTCUTS]) {
    if (shortcut === undefined) continue;
    if (shortcut.decKey === key && key.length > 0 && key !== "enter")
      return true;
    if (shortcut.incKey === key && key.length > 0 && key !== "enter")
      return true;
  }

  return false;
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

  const syncLfo = (): void => {
    const { lfo } = deps.getState();
    deps.engine.setLfoMode(lfo.mode);
    deps.engine.setLfoRateHz(lfo.rateHz);
    deps.engine.setLfoPhaseOffset(lfo.phaseOffset);
    deps.engine.setLfoPoints(lfo.points);
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

  const applyOscCellShortcut = (
    cellIndex: number,
    direction: -1 | 1,
    key: string,
  ): boolean => {
    if (cellIndex === 0) {
      const wave = waveByKey[key];
      if (wave !== undefined) {
        setWave(wave);
        return true;
      }

      const nextWave = cycleWave(deps.getState().currentWave, direction);
      setWave(nextWave);
      return true;
    }

    if (cellIndex === 1) {
      deps.dispatch({ type: "octave/shift", delta: direction });
      return true;
    }

    if (cellIndex === 2) {
      shiftUnisonVoices(direction);
      return true;
    }

    if (cellIndex === 3) {
      shiftUnisonDetune(direction * 2);
      return true;
    }

    if (cellIndex === 4) {
      cycleMorph(direction);
      return true;
    }

    return false;
  };

  const applyEnvCellShortcut = (
    cellIndex: number,
    direction: -1 | 1,
    key: string,
  ): boolean => {
    if (cellIndex === 0) {
      deps.dispatch({ type: "env/delay/shift", delta: direction });
      syncEnv();
      return true;
    }

    if (cellIndex === 1) {
      deps.dispatch({ type: "env/attack/shift", delta: direction });
      syncEnv();
      return true;
    }

    if (cellIndex === 2) {
      deps.dispatch({ type: "env/hold/shift", delta: direction });
      syncEnv();
      return true;
    }

    if (cellIndex === 3) {
      deps.dispatch({ type: "env/decay/shift", delta: direction });
      syncEnv();
      return true;
    }

    if (cellIndex === 4) {
      deps.dispatch({ type: "env/sustain/shift", delta: direction });
      syncEnv();
      return true;
    }

    if (cellIndex === 5) {
      deps.dispatch({ type: "env/release/shift", delta: direction });
      syncEnv();
      return true;
    }

    if (cellIndex === 6 && key === "enter") {
      const state = deps.getState();
      if (state.matrixMode === "idle" && state.selectedBlock === "env") {
        startMatrixPick("env1", "env", "env.matrix");
        return true;
      }

      return false;
    }

    return false;
  };

  const applyLfoCellShortcut = (
    cellIndex: number,
    direction: -1 | 1,
    key: string,
  ): boolean => {
    if (cellIndex === 0) {
      deps.dispatch({ type: "lfo/rate/shift", delta: direction });
      syncLfo();
      return true;
    }

    if (cellIndex === 1) {
      deps.dispatch({ type: "lfo/phase/shift", delta: direction });
      syncLfo();
      return true;
    }

    if (cellIndex === 2) {
      deps.dispatch({ type: "lfo/mode/cycle", delta: direction });
      syncLfo();
      return true;
    }

    if (cellIndex === 6 && key === "enter") {
      const state = deps.getState();
      if (state.matrixMode === "idle" && state.selectedBlock === "lfo") {
        startMatrixPick("lfo1", "lfo", "lfo.matrix");
        return true;
      }
      return false;
    }

    return false;
  };

  const getActiveShortcuts = (
    blockId: AppState["selectedBlock"],
  ): readonly (typeof CELL_SHORTCUTS)[number][] => {
    return blockId === "lfo" ? LFO_CELL_SHORTCUTS : CELL_SHORTCUTS;
  };

  const handleSelectedBlockShortcut = (key: string): boolean => {
    const state = deps.getState();
    const blockId = state.selectedBlock;

    if (blockId === "osc") {
      const directWave = waveByKey[key];
      if (directWave !== undefined) {
        setWave(directWave);
        return true;
      }
    }

    const shortcuts = getActiveShortcuts(blockId);
    for (let index = 0; index < shortcuts.length; index += 1) {
      const shortcut = shortcuts[index];
      if (shortcut === undefined) continue;
      if (shortcut.hint.length === 0) continue;

      let direction: -1 | 1 | null = null;
      if (key === shortcut.decKey) direction = -1;
      if (key === shortcut.incKey) direction = 1;
      if (direction === null) continue;

      return blockId === "osc"
        ? applyOscCellShortcut(index, direction, key)
        : blockId === "env"
          ? applyEnvCellShortcut(index, direction, key)
          : applyLfoCellShortcut(index, direction, key);
    }

    return false;
  };

  const startMatrixPick = (
    source: "env1" | "lfo1",
    originBlock: "env" | "lfo",
    sourceCellId: "env.matrix" | "lfo.matrix",
  ): void => {
    if (deps.getState().inputMode !== "nav") {
      deps.engine.panic();
      deps.dispatch({ type: "panic" });
      deps.dispatch({ type: "mode/set", mode: "nav" });
    }

    const sourceCells = getBlockCells(originBlock);
    const matrixCellIndex = sourceCells.findIndex(
      (cell) => cell.id === sourceCellId,
    );
    const oscCells = getBlockCells("osc");
    const firstTargetIndex = oscCells.findIndex((cell) => cell.targetable);

    deps.dispatch({
      type: "matrix/selection/set",
      selection: {
        source,
        originBlock,
        originCellIndex: matrixCellIndex < 0 ? 0 : matrixCellIndex,
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
    deps.dispatch({ type: "mode/set", mode: "play" });
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
      if (handleSelectedBlockShortcut(key)) {
        return "none";
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

  const handleEditKeyDown = (event: KeyboardEvent): ControllerSignal => {
    const key = event.key.toLowerCase();

    if (key === "escape") {
      deps.dispatch({ type: "mode/set", mode: "nav" });
      return "none";
    }

    if (deps.getState().selectedBlock !== "lfo") {
      deps.dispatch({ type: "mode/set", mode: "nav" });
      return "none";
    }

    if (event.shiftKey && key === "h") {
      deps.dispatch({ type: "lfo/point/move", dx: -1, dy: 0 });
      syncLfo();
      return "none";
    }
    if (event.shiftKey && key === "l") {
      deps.dispatch({ type: "lfo/point/move", dx: 1, dy: 0 });
      syncLfo();
      return "none";
    }
    if (event.shiftKey && key === "j") {
      deps.dispatch({ type: "lfo/point/move", dx: 0, dy: -1 });
      syncLfo();
      return "none";
    }
    if (event.shiftKey && key === "k") {
      deps.dispatch({ type: "lfo/point/move", dx: 0, dy: 1 });
      syncLfo();
      return "none";
    }

    if (key === "h") {
      deps.dispatch({ type: "lfo/point/select/cycle", delta: -1 });
      return "none";
    }
    if (key === "l") {
      deps.dispatch({ type: "lfo/point/select/cycle", delta: 1 });
      return "none";
    }
    if (key === "j") {
      deps.dispatch({ type: "lfo/point/remove" });
      syncLfo();
      return "none";
    }
    if (key === "k") {
      deps.dispatch({ type: "lfo/point/add/right" });
      syncLfo();
      return "none";
    }

    return "none";
  };

  const handleKeyDown = (event: KeyboardEvent): ControllerSignal => {
    const key = event.key.toLowerCase();
    const isUnisonDetuneKey = key === "i" || key === "o";
    const isMatrixNavRepeatKey =
      key === "h" || key === "l" || key === "j" || key === "k";
    const shouldAllowRepeat =
      isUnisonDetuneKey ||
      isRepeatableShortcutKey(key) ||
      (deps.getState().inputMode === "edit" &&
        (key === "h" || key === "j" || key === "k" || key === "l")) ||
      (deps.getState().inputMode === "nav" && isMatrixNavRepeatKey);

    if (event.repeat && !shouldAllowRepeat) return "none";

    if (key === "`") {
      const nextMode = nextInputMode(deps.getState());
      if (nextMode === "nav") {
        deps.engine.panic();
      }
      deps.dispatch({ type: "mode/set", mode: nextMode });
      return "none";
    }

    if (deps.getState().inputMode === "edit") {
      return handleEditKeyDown(event);
    }

    if (deps.getState().inputMode === "nav") {
      return handleNavKeyDown(key);
    }

    if (key === "escape") {
      return "quit";
    }

    if (handleSelectedBlockShortcut(key)) {
      return "none";
    }

    if (keyToSemitone[key] === undefined) {
      return "none";
    }

    event.preventDefault();
    const atMs = performance.now();
    void deps.engine.resumeIfNeeded().then(() => {
      const midi = toMidi(deps.getState(), key);
      if (midi === null) return;
      deps.engine.noteOn(midi, 0.85);
      deps.dispatch({ type: "note/on", key, midi, atMs });
    });

    return "none";
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    if (deps.getState().inputMode !== "play") return;

    const key = event.key.toLowerCase();
    const midi = deps.getState().activeKeys.get(key);
    if (midi === undefined) return;

    deps.engine.noteOff(midi);
    deps.dispatch({ type: "note/off", key, atMs: performance.now() });
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
