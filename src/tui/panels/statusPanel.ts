import {
  cell,
  divider,
  row,
  statusCell,
  statusCellWithHint,
  type Tone,
} from "../ansi.js";
import { getBlockCells, getCellShortLabel } from "../../app/blocks.js";
import { CELL_SHORTCUTS } from "../../app/shortcuts.js";
import type { AppState, BlockId, CellId } from "../../app/types.js";
import type { ModRoute as SynthModRoute } from "../../synth/matrix.js";
import { resolveTargetValue } from "../../synth/modulation.js";

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

const clamp01 = (value: number): number => {
  return Math.max(0, Math.min(1, value));
};

const toSynthRoutes = (state: AppState): readonly SynthModRoute[] => {
  const routes: SynthModRoute[] = [];

  for (const route of state.modRoutes) {
    if (!route.enabled) continue;
    if (route.target === "osc.unisonDetuneCents") {
      routes.push({
        source: "env1",
        target: "osc.unisonDetuneCents",
        amount: route.amount,
        bipolar: true,
      });
      continue;
    }

    if (route.target === "osc.unisonVoices") {
      routes.push({
        source: "env1",
        target: "osc.unisonVoices",
        amount: route.amount,
        bipolar: false,
      });
    }
  }

  return routes;
};

const getEnvPreviewLevel = (state: AppState, nowMs: number): number => {
  const gateOnAtMs = state.envPreview.gateOnAtMs;
  if (gateOnAtMs === null) return 0;

  const elapsedSinceOn = Math.max(0, (nowMs - gateOnAtMs) / 1000);
  const delayEnd = state.env.delay;
  const attackEnd = delayEnd + state.env.attack;
  const holdEnd = attackEnd + state.env.hold;
  const decayEnd = holdEnd + state.env.decay;

  let preReleaseLevel = state.env.sustain;
  if (elapsedSinceOn < delayEnd) {
    preReleaseLevel = 0;
  } else if (elapsedSinceOn < attackEnd) {
    if (state.env.attack <= 0) {
      preReleaseLevel = 1;
    } else {
      preReleaseLevel = clamp01((elapsedSinceOn - delayEnd) / state.env.attack);
    }
  } else if (elapsedSinceOn < holdEnd) {
    preReleaseLevel = 1;
  } else if (elapsedSinceOn < decayEnd) {
    if (state.env.decay <= 0) {
      preReleaseLevel = state.env.sustain;
    } else {
      const decayProgress = clamp01(
        (elapsedSinceOn - holdEnd) / state.env.decay,
      );
      preReleaseLevel = 1 + (state.env.sustain - 1) * decayProgress;
    }
  }

  if (state.activeKeys.size > 0 || state.envPreview.gateOffAtMs === null) {
    return clamp01(preReleaseLevel);
  }

  const elapsedSinceRelease = Math.max(
    0,
    (nowMs - state.envPreview.gateOffAtMs) / 1000,
  );
  if (state.env.release <= 0) return 0;
  const releaseProgress = clamp01(elapsedSinceRelease / state.env.release);
  return clamp01(state.envPreview.releaseStartLevel * (1 - releaseProgress));
};

const hasEnvRouteForTarget = (state: AppState, target: CellId): boolean => {
  return state.modRoutes.some(
    (route) =>
      route.enabled && route.source === "env1" && route.target === target,
  );
};

const getCellValue = (
  state: AppState,
  cellId: CellId,
  nowMs: number,
): string => {
  const octaveLabel = `${state.octaveOffset >= 0 ? "+" : ""}${state.octaveOffset}`;
  const synthRoutes = toSynthRoutes(state);
  const envPreview = getEnvPreviewLevel(state, nowMs);

  switch (cellId) {
    case "osc.wave":
      return state.currentWave;
    case "osc.octave":
      return octaveLabel;
    case "osc.unisonVoices":
      if (!hasEnvRouteForTarget(state, "osc.unisonVoices")) {
        return String(state.unisonVoices);
      }

      return `${state.unisonVoices}>${Math.round(
        resolveTargetValue(
          synthRoutes,
          "osc.unisonVoices",
          state.unisonVoices,
          {
            env1: envPreview,
          },
        ),
      )}`;
    case "osc.unisonDetuneCents": {
      const base = state.unisonDetuneCents;
      if (!hasEnvRouteForTarget(state, "osc.unisonDetuneCents")) {
        return `${base.toFixed(1)}c`;
      }

      const modulated = resolveTargetValue(
        synthRoutes,
        "osc.unisonDetuneCents",
        base,
        { env1: envPreview },
      );
      return `${base.toFixed(1)}>${modulated.toFixed(1)}c`;
    }
    case "osc.morph":
      return morphLabelByMode[state.oscMorphMode];
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
  cellIndex: number,
  isBlockFocused: boolean,
): string => {
  if (!isBlockFocused) return "";
  if (state.matrixMode !== "idle") return "";

  return CELL_SHORTCUTS[cellIndex]?.hint ?? "";
};

const getBlockHeaderHint = (
  state: AppState,
  blockId: BlockId,
  isFocused: boolean,
): string => {
  if (!isFocused) return "";
  if (state.matrixMode === "pick-block") {
    return blockId === state.matrixSelection?.targetBlock ? "h l enter" : "";
  }
  if (state.matrixMode === "pick-cell") {
    return blockId === state.matrixSelection?.targetBlock ? "j k enter" : "";
  }
  return "";
};

const isLinkedByCurrentSource = (
  state: AppState,
  cellId: CellId,
  blockId: BlockId,
): boolean => {
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
  const isMatrixTargetCell =
    state.matrixMode === "pick-cell" &&
    blockId === state.matrixSelection?.targetBlock &&
    state.matrixSelection.targetCellIndex === index;

  if (isMatrixTargetCell) return { tone: "pink", bold: true };
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
  const titleText = blockId === "osc" ? "OSCILLATOR" : "ENVELOPE";
  const titleHint = getBlockHeaderHint(state, blockId, isFocused);
  const nowMs = performance.now();

  const rows = cells.map((cellMeta, index) => {
    if (cellMeta.id.endsWith(".empty")) {
      return cell("", panelWidth, isFocused ? "blue" : "gray", false);
    }

    const value = getCellValue(state, cellMeta.id, nowMs);
    const hint = getCellHint(state, blockId, index, isFocused);
    const { tone, bold } = getCellTone(state, blockId, cellMeta.id, index);
    return hint.length > 0
      ? statusCellWithHint(cellMeta.label, value, hint, panelWidth, tone, bold)
      : statusCell(cellMeta.label, value, panelWidth, tone, bold);
  });

  return [
    titleHint.length > 0
      ? statusCellWithHint(
          "",
          titleText,
          titleHint,
          panelWidth,
          isFocused ? "pink" : "gray",
          true,
        )
      : cell(titleText, panelWidth, isFocused ? "pink" : "gray", true),
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
