import type { WaveForm } from "../synth/polySynth.js";
import type { AudioEngine } from "../audio/engine.js";
import type { AppAction } from "./actions.js";
import { keyToSemitone, waveByKey } from "./keymap.js";
import { toMidi } from "./state.js";
import type { AppState, InputMode, NavAction } from "./types.js";

export type ControllerSignal = "none" | "quit";

interface ControllerDependencies {
  engine: AudioEngine;
  getState: () => AppState;
  dispatch: (action: AppAction) => void;
}

const navActionByKey: Record<string, NavAction> = {
  h: "left",
  j: "down",
  k: "up",
  l: "right",
};

const toggleMode = (mode: InputMode): InputMode => {
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

  const handleKeyDown = (event: KeyboardEvent): ControllerSignal => {
    const key = event.key.toLowerCase();
    const isUnisonDetuneKey = key === "i" || key === "o";

    if (event.repeat && !isUnisonDetuneKey) return "none";

    if (key === "escape") {
      return "quit";
    }

    if (key === "`") {
      const nextMode = toggleMode(deps.getState().inputMode);
      if (nextMode === "nav") {
        deps.engine.panic();
      }
      deps.dispatch({ type: "mode/set", mode: nextMode });
      return "none";
    }

    if (deps.getState().inputMode === "nav") {
      const action = navActionByKey[key];
      if (action !== undefined) {
        deps.dispatch({ type: "nav/set", action });
      }
      return "none";
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
