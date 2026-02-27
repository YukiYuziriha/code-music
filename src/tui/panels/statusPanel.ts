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
  const activeNotes =
    state.activeKeys.size > 0
      ? Array.from(state.activeKeys.values()).join(" ")
      : "none";
  const octaveLabel = `${state.octaveOffset >= 0 ? "+" : ""}${state.octaveOffset}`;
  const unisonDetuneLabel = `${state.unisonDetuneCents.toFixed(1)}c`;
  const emptyRightCell = cell("", panelWidth, "gray");

  return [
    row(
      statusCell(
        "wave",
        `${state.currentWave} [1-4]`,
        panelWidth,
        toneByWave[state.currentWave],
        true,
      ),
      statusCell(
        "unison voices",
        `${state.unisonVoices} {-+}`,
        panelWidth,
        "pink",
      ),
    ),
    row(
      statusCell("octave", `${octaveLabel} [-+]`, panelWidth, "cyan"),
      statusCell(
        "unison detune",
        `${unisonDetuneLabel} (-+)`,
        panelWidth,
        "blue",
      ),
    ),
    row(
      statusCell(
        "active voices",
        String(state.activeKeys.size),
        panelWidth,
        "green",
      ),
      emptyRightCell,
    ),
    row(
      statusCell("active midi", activeNotes, panelWidth, "amber"),
      emptyRightCell,
    ),
    divider(fullWidth),
  ];
};
