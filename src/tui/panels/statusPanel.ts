import { divider, row, statusCell, type Tone } from "../ansi.js";
import type { AppState } from "../../app/types.js";

const toneByWave: Record<AppState["currentWave"], Tone> = {
  sine: "cyan",
  triangle: "green",
  sawtooth: "amber",
  square: "blue",
};

export const renderStatusPanel = (
  state: AppState,
  panelWidth: number,
  fullWidth: number,
): string[] => {
  const activeNotes =
    state.activeKeys.size > 0
      ? Array.from(state.activeKeys.values()).join(" ")
      : "none";
  const octaveLabel = `${state.octaveOffset >= 0 ? "+" : ""}${state.octaveOffset}`;

  return [
    row(
      statusCell(
        "wave",
        `${state.currentWave} [1-4]`,
        panelWidth,
        toneByWave[state.currentWave],
        true,
      ),
      statusCell("octave", `${octaveLabel} [-+]`, panelWidth, "cyan"),
    ),
    row(
      statusCell("voices", String(state.activeKeys.size), panelWidth, "green"),
      statusCell("active midi", activeNotes, panelWidth, "amber"),
    ),
    divider(fullWidth),
  ];
};
