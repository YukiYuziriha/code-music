import { cell, divider } from "../ansi.js";
import type { AppState } from "../../app/types.js";

export const renderHeaderPanel = (
  state: Pick<AppState, "inputMode" | "matrixMode" | "selectedBlock">,
  fullWidth: number,
): string[] => {
  const mode = state.inputMode;
  const modeLabel =
    mode === "play"
      ? "CURRENT MODE: PLAY (` to toggle)"
      : "CURRENT MODE: NAV (` to toggle)";

  const blockLabel =
    state.selectedBlock === "osc"
      ? "OSCILLATOR"
      : state.selectedBlock === "env"
        ? "ENVELOPE"
        : "LFO";

  const detailLabel =
    mode === "play"
      ? `SHORTCUTS ACTIVE: ${blockLabel}`
      : `BLOCK: ${blockLabel}  MATRIX: ${state.matrixMode.toUpperCase()}`;

  return [
    divider(fullWidth),
    cell(modeLabel, fullWidth, "blue", true),
    cell(detailLabel, fullWidth, "gray", false),
    divider(fullWidth),
  ];
};
