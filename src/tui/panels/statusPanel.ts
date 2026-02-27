import {
  cell,
  divider,
  row,
  statusCell,
  statusCellWithHint,
  type Tone,
} from "../ansi.js";
import { getBlockCells, getCellShortLabel } from "../../app/blocks.js";
import type { AppState, BlockId, CellId } from "../../app/types.js";

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

const formatSeconds = (value: number): string => {
  return `${value.toFixed(2)}s`;
};

const getCellValue = (state: AppState, cellId: CellId): string => {
  const activeNotes =
    state.activeKeys.size > 0
      ? Array.from(state.activeKeys.values()).join(" ")
      : "none";
  const octaveLabel = `${state.octaveOffset >= 0 ? "+" : ""}${state.octaveOffset}`;

  switch (cellId) {
    case "osc.wave":
      return state.currentWave;
    case "osc.octave":
      return octaveLabel;
    case "osc.unisonVoices":
      return String(state.unisonVoices);
    case "osc.unisonDetuneCents":
      return `${state.unisonDetuneCents.toFixed(1)}c`;
    case "osc.morph":
      return morphLabelByMode[state.oscMorphMode];
    case "osc.activeVoices":
      return String(state.activeKeys.size);
    case "osc.activeMidi":
      return activeNotes;
    case "env.delay":
      return formatSeconds(state.env.delay);
    case "env.attack":
      return formatSeconds(state.env.attack);
    case "env.hold":
      return formatSeconds(state.env.hold);
    case "env.decay":
      return formatSeconds(state.env.decay);
    case "env.sustain":
      return state.env.sustain.toFixed(2);
    case "env.release":
      return formatSeconds(state.env.release);
    case "env.matrix": {
      const routes = state.modRoutes
        .filter((route) => route.source === "env1")
        .map((route) => getCellShortLabel(route.target));
      if (routes.length === 0) return "none";
      const first = routes[0] ?? "none";
      return routes.length > 1 ? `${first}+${routes.length - 1}` : first;
    }
    default:
      return "";
  }
};

const getCellHint = (
  state: AppState,
  blockId: BlockId,
  cellId: CellId,
  isBlockFocused: boolean,
): string => {
  if (!isBlockFocused) return "";
  if (state.inputMode !== "nav") return "";
  if (state.matrixMode === "pick-block") {
    return blockId === state.matrixSelection?.targetBlock ? "enter" : "h l";
  }
  if (state.matrixMode === "pick-cell") {
    return blockId === state.matrixSelection?.targetBlock ? "j k enter" : "";
  }

  switch (cellId) {
    case "osc.wave":
      return "1-4 w e";
    case "osc.octave":
      return "r t";
    case "osc.unisonVoices":
      return "y u";
    case "osc.unisonDetuneCents":
      return "i o";
    case "osc.morph":
      return "[ ]";
    case "env.delay":
    case "env.attack":
    case "env.hold":
    case "env.decay":
    case "env.sustain":
    case "env.release":
      return "- =";
    case "env.matrix":
      return "enter";
    default:
      return "";
  }
};

const isLinkedByCurrentSource = (
  state: AppState,
  cellId: CellId,
  blockId: BlockId,
): boolean => {
  if (state.selectedBlock !== "env") return false;
  if (state.inputMode !== "nav") return false;
  if (blockId === "env") return false;
  return state.modRoutes.some(
    (route) =>
      route.source === "env1" && route.target === cellId && route.enabled,
  );
};

const getCellTone = (
  state: AppState,
  blockId: BlockId,
  cellId: CellId,
  index: number,
): { tone: Tone; bold: boolean } => {
  const isBlockFocused = state.selectedBlock === blockId;
  const isSelectedCell =
    state.inputMode === "nav" &&
    state.matrixMode === "idle" &&
    isBlockFocused &&
    state.selectedCellByBlock[blockId] === index;

  const isMatrixTargetCell =
    state.matrixMode === "pick-cell" &&
    blockId === state.matrixSelection?.targetBlock &&
    state.matrixSelection.targetCellIndex === index;

  if (isMatrixTargetCell) return { tone: "pink", bold: true };
  if (isSelectedCell) return { tone: "cyan", bold: true };
  if (isLinkedByCurrentSource(state, cellId, blockId)) {
    return { tone: "green", bold: false };
  }
  if (cellId === "osc.wave") {
    return { tone: toneByWave[state.currentWave], bold: false };
  }
  return { tone: isBlockFocused ? "blue" : "gray", bold: false };
};

const renderBlockColumn = (
  state: AppState,
  blockId: BlockId,
  panelWidth: number,
): string[] => {
  const cells = getBlockCells(blockId);
  const isFocused = state.selectedBlock === blockId;
  const titleText = `${blockId.toUpperCase()} BLOCK`;

  const rows = cells.map((cellMeta, index) => {
    if (cellMeta.id.endsWith(".empty")) {
      return cell("", panelWidth, isFocused ? "blue" : "gray", false);
    }

    const value = getCellValue(state, cellMeta.id);
    const hint = getCellHint(state, blockId, cellMeta.id, isFocused);
    const { tone, bold } = getCellTone(state, blockId, cellMeta.id, index);
    return hint.length > 0
      ? statusCellWithHint(cellMeta.label, value, hint, panelWidth, tone, bold)
      : statusCell(cellMeta.label, value, panelWidth, tone, bold);
  });

  return [
    cell(titleText, panelWidth, isFocused ? "pink" : "gray", true),
    ...rows,
  ];
};

export const renderStatusPanel = (
  state: AppState,
  panelWidth: number,
  fullWidth: number,
): string[] => {
  const leftLines = renderBlockColumn(state, "osc", panelWidth);
  const rightLines = renderBlockColumn(state, "env", panelWidth);
  const lineCount = Math.max(leftLines.length, rightLines.length);
  const rows: string[] = [];

  for (let i = 0; i < lineCount; i += 1) {
    rows.push(
      row(
        leftLines[i] ?? cell("", panelWidth, "gray"),
        rightLines[i] ?? cell("", panelWidth, "gray"),
      ),
    );
  }

  rows.push(divider(fullWidth));
  return rows;
};
