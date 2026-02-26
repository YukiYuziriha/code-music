import { Terminal } from "@xterm/xterm";
import { PolySynth, type WaveForm } from "./synth/polySynth.js";

const ESC = "\x1b";
const enterAlt = `${ESC}[?1049h`;
const leaveAlt = `${ESC}[?1049l`;
const clearAndHome = `${ESC}[2J${ESC}[H`;

const term = new Terminal({
  cols: 120,
  rows: 32,
  cursorBlink: true,
});

const container = document.getElementById("terminal");
if (!container) {
  throw new Error("where is terminal container bro?");
}

term.open(container);

const audioCtx = new AudioContext();
const synth = new PolySynth(audioCtx, {
  maxVoices: 8,
  wave: "sawtooth",
  masterGain: 0.2,
});

const keyToSemitone: Record<string, number> = {
  z: 0,
  s: 1,
  x: 2,
  d: 3,
  c: 4,
  v: 5,
  g: 6,
  b: 7,
  h: 8,
  n: 9,
  j: 10,
  m: 11,
  ",": 12,
};

const waveByKey: Record<string, WaveForm> = {
  "1": "sine",
  "2": "triangle",
  "3": "sawtooth",
  "4": "square",
};

const activeKeys = new Map<string, number>();
const baseMidi = 60;
let octaveOffset = 0;
let currentWave: WaveForm = "sawtooth";
type InputMode = "nav" | "play";
let inputMode: InputMode = "play";
let lastNavAction = "none";

const enterAppScreen = () => {
  term.write(enterAlt);
  term.write(clearAndHome);
};

const leaveAppScreen = () => {
  term.write(leaveAlt);
};

const drawStatus = () => {
  term.write(clearAndHome);
  term.writeln("wavetable booted");
  term.writeln("play: z s x d c v g b h n j m ,");
  term.writeln("toggle mode: ` (backtick)");
  term.writeln("octave: [ and ]");
  term.writeln("wave: 1 sine, 2 triangle, 3 saw, 4 square");
  term.writeln("esc: exit alt screen");
  term.writeln("");
  term.writeln(`mode: ${inputMode}`);
  term.writeln(`nav action: ${lastNavAction}`);
  term.writeln(`wave: ${currentWave}`);
  term.writeln(`octave offset: ${octaveOffset}`);
  term.writeln(`active voices: ${activeKeys.size}`);
};

const setInputMode = (next: InputMode) => {
  if (inputMode === next) return;
  inputMode = next;

  if (inputMode === "nav") {
    synth.panic();
    activeKeys.clear();
  }

  drawStatus();
};

const panicAll = () => {
  synth.panic();
  activeKeys.clear();
};

const quitAppScreen = () => {
  panicAll();
  leaveAppScreen();
};

const toMidi = (key: string): number | null => {
  const semitone = keyToSemitone[key];
  if (semitone === undefined) return null;
  return baseMidi + octaveOffset * 12 + semitone;
};

const noteOnFromKey = (key: string) => {
  if (activeKeys.has(key)) return;

  const midi = toMidi(key);
  if (midi === null) return;

  activeKeys.set(key, midi);
  synth.noteOn(midi, 0.85);
  drawStatus();
};

const noteOffFromKey = (key: string) => {
  const midi = activeKeys.get(key);
  if (midi === undefined) return;

  synth.noteOff(midi);
  activeKeys.delete(key);
  drawStatus();
};

const onKeyDown = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase();

  if (event.repeat) return;

  if (key === "escape") {
    quitAppScreen();
    return;
  }

  if (key === "`") {
    setInputMode(inputMode === "play" ? "nav" : "play");
    return;
  }

  if (inputMode === "nav") {
    if (key === "h") lastNavAction = "left";
    if (key === "j") lastNavAction = "down";
    if (key === "k") lastNavAction = "up";
    if (key === "l") lastNavAction = "right";
    if (key === "h" || key === "j" || key === "k" || key === "l") {
      drawStatus();
    }
    return;
  }

  if (key === "[") {
    octaveOffset = Math.max(-2, octaveOffset - 1);
    drawStatus();
    return;
  }

  if (key === "]") {
    octaveOffset = Math.min(2, octaveOffset + 1);
    drawStatus();
    return;
  }

  const wave = waveByKey[key];
  if (wave !== undefined) {
    currentWave = wave;
    synth.setWave(wave);
    drawStatus();
    return;
  }

  if (keyToSemitone[key] !== undefined) {
    event.preventDefault();
    void synth.resumeIfNeeded().then(() => {
      noteOnFromKey(key);
    });
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  if (inputMode !== "play") return;
  const key = event.key.toLowerCase();
  noteOffFromKey(key);
};

const onVisibilityChange = () => {
  if (document.hidden) panicAll();
};

enterAppScreen();
drawStatus();

const onDataSub = term.onData((data) => {
  if (data === ESC) {
    quitAppScreen();
  }
});

window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
window.addEventListener("blur", panicAll);
document.addEventListener("visibilitychange", onVisibilityChange);

const onBeforeUnload = () => {
  panicAll();
  onDataSub.dispose();
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("blur", panicAll);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  leaveAppScreen();
};

window.addEventListener("beforeunload", onBeforeUnload);
