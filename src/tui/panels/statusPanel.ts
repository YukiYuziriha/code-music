import {
  cell,
  divider,
  paint,
  row,
  statusCell,
  statusCellWithHint,
  type Tone,
} from "../ansi.js";
import { getBlockCells, getCellShortLabel } from "../../app/blocks.js";
import { CELL_SHORTCUTS, LFO_CELL_SHORTCUTS } from "../../app/shortcuts.js";
import type { AppState, BlockId, CellId } from "../../app/types.js";
import type { ModRoute as SynthModRoute } from "../../synth/matrix.js";
import { resolveTargetValue } from "../../synth/modulation.js";
import { getLfoPhaseAtTime, sampleLfoShape } from "../../synth/lfo.js";

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

const lfoModeLabelByMode: Record<AppState["lfo"]["mode"], string> = {
  trigger: "Trigger",
  sync: "Sync",
  envelope: "Envelope",
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
        source: route.source,
        target: "osc.unisonDetuneCents",
        amount: route.amount,
        bipolar: true,
      });
      continue;
    }

    if (route.target === "osc.unisonVoices") {
      routes.push({
        source: route.source,
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

const hasLfoRouteForTarget = (state: AppState, target: CellId): boolean => {
  return state.modRoutes.some(
    (route) =>
      route.enabled && route.source === "lfo1" && route.target === target,
  );
};

const getLfoPreviewValue = (state: AppState, nowMs: number): number => {
  const nowSeconds = nowMs / 1000;
  const noteOnSeconds = (state.envPreview.gateOnAtMs ?? nowMs) / 1000;
  const phase = getLfoPhaseAtTime(
    state.lfo.mode,
    state.lfo.rateHz,
    state.lfo.phaseOffset,
    nowSeconds,
    noteOnSeconds,
  );
  const bipolar = sampleLfoShape(state.lfo.points, phase);
  return clamp01((bipolar + 1) * 0.5);
};

const getCellValue = (
  state: AppState,
  cellId: CellId,
  nowMs: number,
): string => {
  const octaveLabel = `${state.octaveOffset >= 0 ? "+" : ""}${state.octaveOffset}`;
  const synthRoutes = toSynthRoutes(state);
  const envPreview = getEnvPreviewLevel(state, nowMs);
  const lfoPreview = getLfoPreviewValue(state, nowMs);

  switch (cellId) {
    case "osc.wave":
      return state.currentWave;
    case "osc.octave":
      return octaveLabel;
    case "osc.unisonVoices":
      if (
        !hasEnvRouteForTarget(state, "osc.unisonVoices") &&
        !hasLfoRouteForTarget(state, "osc.unisonVoices")
      ) {
        return String(state.unisonVoices);
      }

      return `${state.unisonVoices}>${Math.round(
        resolveTargetValue(
          synthRoutes,
          "osc.unisonVoices",
          state.unisonVoices,
          {
            env1: envPreview,
            lfo1: lfoPreview,
          },
        ),
      )}`;
    case "osc.unisonDetuneCents": {
      const base = state.unisonDetuneCents;
      if (
        !hasEnvRouteForTarget(state, "osc.unisonDetuneCents") &&
        !hasLfoRouteForTarget(state, "osc.unisonDetuneCents")
      ) {
        return `${base.toFixed(1)}c`;
      }

      const modulated = resolveTargetValue(
        synthRoutes,
        "osc.unisonDetuneCents",
        base,
        { env1: envPreview, lfo1: lfoPreview },
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
    case "lfo.rate":
      return `${state.lfo.rateHz.toFixed(2)}Hz`;
    case "lfo.phase":
      return `${Math.round(state.lfo.phaseOffset * 360)}deg`;
    case "lfo.mode":
      return lfoModeLabelByMode[state.lfo.mode];
    case "lfo.graph":
      return `${state.lfo.points.length} pts`;
    case "lfo.matrix": {
      const routes = state.modRoutes
        .filter((route) => route.source === "lfo1")
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
  const shortcuts = blockId === "lfo" ? LFO_CELL_SHORTCUTS : CELL_SHORTCUTS;
  return shortcuts[cellIndex]?.hint ?? "";
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
  if (blockId !== "osc") return false;
  const source = state.selectedBlock === "lfo" ? "lfo1" : "env1";
  return state.modRoutes.some(
    (route) =>
      route.source === source && route.target === cellId && route.enabled,
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
  const titleText =
    blockId === "osc" ? "OSCILLATOR" : blockId === "env" ? "ENVELOPE" : "LFO";
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

const plotLine = (
  grid: string[][],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void => {
  const width = grid[0]?.length ?? 0;
  const height = grid.length;
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const row = grid[y];
      const char =
        x === x1 && y === y1
          ? (row?.[x] ?? "-")
          : dx === 0
            ? "|"
            : dy === 0
              ? "-"
              : sy < 0
                ? "/"
                : "\\";
      if (row !== undefined && row[x] !== "□" && row[x] !== "■") {
        row[x] = char;
      }
    }
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
};

const renderLfoGraph = (
  state: AppState,
  width: number,
  height: number,
): string[] => {
  const w = Math.max(8, width);
  const h = Math.max(4, height);
  const grid: string[][] = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => "⣶"),
  );
  const toCol = (x: number): number => Math.round(clamp01(x) * (w - 1));
  const toRow = (y: number): number =>
    Math.round((1 - clamp01((y + 1) * 0.5)) * (h - 1));

  for (let index = 0; index < state.lfo.points.length - 1; index += 1) {
    const left = state.lfo.points[index];
    const right = state.lfo.points[index + 1];
    if (left === undefined || right === undefined) continue;
    plotLine(
      grid,
      toCol(left.x),
      toRow(left.y),
      toCol(right.x),
      toRow(right.y),
    );
  }

  for (let index = 0; index < state.lfo.points.length; index += 1) {
    const point = state.lfo.points[index];
    if (point === undefined) continue;
    const col = toCol(point.x);
    const row = toRow(point.y);
    const line = grid[row];
    if (line === undefined || line[col] === undefined) continue;
    line[col] = index === state.lfo.selectedPointIndex ? "■" : "□";
  }

  return grid.map((chars) => paint(chars.join(""), "gray", false));
};

const renderLfoPanel = (state: AppState, fullWidth: number): string[] => {
  const title = cell(
    "LFO",
    fullWidth,
    state.selectedBlock === "lfo" ? "pink" : "gray",
    true,
  );
  const nowMs = performance.now();
  const phase = getLfoPhaseAtTime(
    state.lfo.mode,
    state.lfo.rateHz,
    state.lfo.phaseOffset,
    nowMs / 1000,
    (state.envPreview.gateOnAtMs ?? nowMs) / 1000,
  );
  const preview = sampleLfoShape(state.lfo.points, phase);
  const controls = statusCellWithHint(
    "rate phase mode",
    `${state.lfo.rateHz.toFixed(2)}Hz ${Math.round(state.lfo.phaseOffset * 360)}deg ${lfoModeLabelByMode[state.lfo.mode]} out ${preview.toFixed(2)}`,
    state.selectedBlock === "lfo" && state.inputMode === "edit"
      ? "edit"
      : "` edit",
    fullWidth,
    state.selectedBlock === "lfo" ? "blue" : "gray",
    false,
  );
  const graph = renderLfoGraph(state, fullWidth, 8);
  return [title, controls, ...graph, divider(fullWidth)];
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

  rows.push(...renderLfoPanel(state, fullWidth));
  return rows;
};
