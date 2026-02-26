import { cell, divider, row, statusCell, type Tone } from "../ansi.js";
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
  const modeBadge = state.inputMode === "play" ? "PLAY MODE" : "NAV MODE";
  const modeHelp =
    state.inputMode === "play"
      ? "Play notes on keyboard"
      : "h j k l set nav action";
  const activeNotes =
    state.activeKeys.size > 0
      ? Array.from(state.activeKeys.values()).join(" ")
      : "none";
  const octaveLabel = `${state.octaveOffset >= 0 ? "+" : ""}${state.octaveOffset}`;
  const modeTone: Tone = state.inputMode === "play" ? "green" : "pink";

  return [
    row(
      statusCell("mode", modeBadge, panelWidth, modeTone, true),
      statusCell(
        "wave",
        state.currentWave,
        panelWidth,
        toneByWave[state.currentWave],
        true,
      ),
    ),
    row(
      statusCell("octave", octaveLabel, panelWidth, "cyan"),
      statusCell("voices", String(state.activeKeys.size), panelWidth, "green"),
    ),
    row(
      statusCell("last nav", state.lastNavAction, panelWidth, "pink"),
      statusCell("active midi", activeNotes, panelWidth, "amber"),
    ),
    divider(fullWidth),
    cell(modeHelp, fullWidth, "gray"),
    divider(fullWidth),
  ];
};
