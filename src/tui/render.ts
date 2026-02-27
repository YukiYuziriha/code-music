import { Terminal } from "@xterm/xterm";
import type { AppState } from "../app/types.js";
import { clearAndHome } from "./theme.js";
import { renderHeaderPanel } from "./panels/headerPanel.js";
import { renderStatusPanel } from "./panels/statusPanel.js";
import { renderKeyboardPanel } from "./panels/keyboardPanel.js";

const PANEL_WIDTH = 28;
const FULL_WIDTH = PANEL_WIDTH * 2 + 1;

export const createRenderer = (term: Terminal) => {
  const render = (state: AppState) => {
    const lines = [
      ...renderHeaderPanel(state.inputMode, FULL_WIDTH),
      ...renderStatusPanel(state, PANEL_WIDTH, FULL_WIDTH),
      ...renderKeyboardPanel(state, FULL_WIDTH),
    ];

    term.write(`${clearAndHome}${lines.join("\r\n")}\r\n`);
  };

  return { render };
};
