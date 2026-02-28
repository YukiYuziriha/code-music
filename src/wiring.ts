import { Terminal } from "@xterm/xterm";
import { AudioEngine } from "./audio/engine.js";
import type { AppAction } from "./app/actions.js";
import { createController } from "./app/controller.js";
import { bindLifecycle } from "./app/lifecycle.js";
import { applyAction, createInitialState } from "./app/state.js";
import { createRenderer } from "./tui/render.js";
import {
  ESC,
  enterAlt,
  leaveAlt,
  clearAndHome,
  hideCursor,
  showCursor,
  tokyoNightTerminalTheme,
} from "./tui/theme.js";

const term = new Terminal({
  cols: 120,
  rows: 32,
  cursorBlink: false,
  theme: tokyoNightTerminalTheme,
});

const container = document.getElementById("terminal");
if (!container) {
  throw new Error("where is terminal container bro?");
}

term.open(container);

const engine = new AudioEngine(new AudioContext(), {
  maxVoices: 8,
  wave: "sawtooth",
  masterGain: 0.2,
});

let state = createInitialState();

const renderer = createRenderer(term);

const dispatch = (action: AppAction): void => {
  state = applyAction(state, action);
  renderer.render(state);
};

const controller = createController({
  engine,
  getState: () => state,
  dispatch,
});

const enterAppScreen = (): void => {
  term.write(enterAlt);
  term.write(hideCursor);
  term.write(clearAndHome);
};

const leaveAppScreen = (): void => {
  term.write(showCursor);
  term.write(leaveAlt);
};

const panicAll = (): void => {
  controller.panic();
};

const quitAppScreen = (): void => {
  panicAll();
  leaveAppScreen();
};

enterAppScreen();
renderer.render(state);
const refreshTimer = window.setInterval(() => {
  renderer.render(state);
}, 50);

const onDataSub = term.onData((data) => {
  if (data === ESC || controller.handleTerminalData(data) === "quit") {
    quitAppScreen();
  }
});

let disposeLifecycle = () => {
  return;
};

const cleanup = (): void => {
  panicAll();
  window.clearInterval(refreshTimer);
  onDataSub.dispose();
  disposeLifecycle();
  leaveAppScreen();
};

disposeLifecycle = bindLifecycle({
  onKeyDown: (event) => {
    if (controller.handleKeyDown(event) === "quit") {
      quitAppScreen();
    }
  },
  onKeyUp: (event) => {
    controller.handleKeyUp(event);
  },
  onBlur: () => {
    panicAll();
  },
  onVisibilityChange: (hidden) => {
    if (hidden) {
      panicAll();
    }
  },
  onBeforeUnload: () => {
    cleanup();
  },
});
