import {
  cell,
  divider,
  row,
  statusCell,
  statusCellWithHint,
  type Tone,
} from "../ansi.js";
import type { AppState } from "../../app/types.js";

const toneByWave: Record<AppState["currentWave"], Tone> = {
  sine: "cyan",
  triangle: "green",
  sawtooth: "amber",
  square: "blue",
};

const morphLabelByMode: Record<AppState["oscMorphMode"], string> = {
  none: "None",
  "low-pass": "Low Pass",
  "high-pass": "High Pass",
  "harmonic-stretch": "Harmonic Stretch",
  "formant-scale": "Formant Scale",
  "inharmonic-stretch": "Inharmonic Stretch",
  smear: "Smear",
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
      statusCellWithHint(
        "wave",
        state.currentWave,
        "1-4 w e",
        panelWidth,
        toneByWave[state.currentWave],
        true,
      ),
      statusCellWithHint(
        "unison voices",
        String(state.unisonVoices),
        "y u",
        panelWidth,
        "pink",
      ),
    ),
    row(
      statusCellWithHint("octave", octaveLabel, "r t", panelWidth, "cyan"),
      statusCellWithHint(
        "unison detune",
        unisonDetuneLabel,
        "i o",
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
      statusCellWithHint(
        "morph",
        morphLabelByMode[state.oscMorphMode],
        "[ ]",
        panelWidth,
        "cyan",
      ),
    ),
    row(
      statusCell("active midi", activeNotes, panelWidth, "amber"),
      emptyRightCell,
    ),
    divider(fullWidth),
  ];
};
