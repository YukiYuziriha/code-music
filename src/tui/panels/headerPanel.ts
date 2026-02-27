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

  const detailLabel =
    mode === "play"
      ? `SHORTCUTS ACTIVE: ${state.selectedBlock === "osc" ? "OSCILLATOR" : "ENVELOPE"}`
      : `BLOCK: ${state.selectedBlock === "osc" ? "OSCILLATOR" : "ENVELOPE"}  MATRIX: ${state.matrixMode.toUpperCase()}`;

  return [
    divider(fullWidth),
    cell(modeLabel, fullWidth, "blue", true),
    cell(detailLabel, fullWidth, "gray", false),
    divider(fullWidth),
  ];
};
