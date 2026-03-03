import {
  cell,
  divider,
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
import {
  getLfoPhaseAtTime,
  resolveLfoRateHz,
  sampleLfoShape,
} from "../../synth/lfo.js";

const LFO_PREVIEW_BPM = 128;

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

const lfoShapeLabelByShape: Record<AppState["lfo"]["shape"], string> = {
  sine: "Sine",
  triangle: "Triangle",
  saw: "Saw",
  square: "Square",
  random: "Random",
};

const formatSeconds = (value: number): string => {
  return `${value.toFixed(2)}s`;
};

const clamp01 = (value: number): number => {
  return Math.max(0, Math.min(1, value));
};

const toSynthRoutes = (
  state: AppState,
  includeLfo: boolean,
): readonly SynthModRoute[] => {
  const routes: SynthModRoute[] = [];

  for (const route of state.modRoutes) {
    if (!route.enabled) continue;
    if (!includeLfo && route.source === "lfo1") continue;
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

const getLfoPreview = (
  state: AppState,
  nowMs: number,
): { signedOut: number; normalized: number } => {
  if (state.activeKeys.size === 0) {
    return { signedOut: 0, normalized: 0.5 };
  }

  const nowSeconds = nowMs / 1000;
  const noteOnSeconds = (state.envPreview.gateOnAtMs ?? nowMs) / 1000;
  const rateHz = resolveLfoRateHz(
    state.lfo.rateMode,
    state.lfo.rateHz,
    state.lfo.rateSync,
    LFO_PREVIEW_BPM,
  );
  const phase = getLfoPhaseAtTime(
    rateHz,
    state.lfo.phase,
    nowSeconds,
    noteOnSeconds,
    state.lfo.retrigger,
  );
  const raw = sampleLfoShape(state.lfo.shape, phase, 0);
  const signedOut = state.lfo.bipolar
    ? raw * state.lfo.depth
    : (raw + 1) * 0.5 * state.lfo.depth * 2 - 1;
  const normalized = state.lfo.bipolar
    ? clamp01((raw * state.lfo.depth + 1) * 0.5)
    : clamp01((raw + 1) * 0.5 * state.lfo.depth);
  return { signedOut, normalized };
};

const getCellValue = (
  state: AppState,
  cellId: CellId,
  nowMs: number,
): string => {
  const octaveLabel = `${state.octaveOffset >= 0 ? "+" : ""}${state.octaveOffset}`;
  const lfoActive = state.activeKeys.size > 0;
  const synthRoutes = toSynthRoutes(state, lfoActive);
  const envPreview = getEnvPreviewLevel(state, nowMs);
  const lfoPreview = getLfoPreview(state, nowMs).normalized;

  switch (cellId) {
    case "osc.wave":
      return state.currentWave;
    case "osc.octave":
      return octaveLabel;
    case "osc.unisonVoices":
      if (
        !hasEnvRouteForTarget(state, "osc.unisonVoices") &&
        (!lfoActive || !hasLfoRouteForTarget(state, "osc.unisonVoices"))
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
        (!lfoActive || !hasLfoRouteForTarget(state, "osc.unisonDetuneCents"))
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
    case "lfo.shape":
      return lfoShapeLabelByShape[state.lfo.shape];
    case "lfo.rateMode":
      return state.lfo.rateMode === "hz" ? "Hz" : "Sync";
    case "lfo.rate":
      return state.lfo.rateMode === "hz"
        ? `${state.lfo.rateHz.toFixed(2)}Hz`
        : state.lfo.rateSync;
    case "lfo.depth":
      return state.lfo.depth.toFixed(2);
    case "lfo.phase":
      return `${Math.round(state.lfo.phase * 360)}deg`;
    case "lfo.retrigger":
      return state.lfo.retrigger ? "On" : "Off";
    case "lfo.bipolar":
      return state.lfo.bipolar ? "On" : "Off";
    case "lfo.smooth":
      return state.lfo.smooth.toFixed(2);
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

const renderLfoPanel = (state: AppState, panelWidth: number): string[] => {
  const isFocused = state.selectedBlock === "lfo";
  const nowMs = performance.now();
  const preview = getLfoPreview(state, nowMs);
  const out = `${preview.signedOut >= 0 ? "+" : ""}${preview.signedOut.toFixed(2)}`;

  const rows: string[] = [
    statusCell(
      "LFO",
      `out ${out}`,
      panelWidth,
      isFocused ? "pink" : "gray",
      true,
    ),
  ];

  const cells = getBlockCells("lfo");
  for (let index = 0; index < cells.length; index += 1) {
    const cellMeta = cells[index];
    if (cellMeta === undefined) continue;
    const hint = getCellHint(state, "lfo", index, isFocused);
    const value = getCellValue(state, cellMeta.id, nowMs);
    const tone = isFocused ? "blue" : "gray";
    rows.push(
      hint.length > 0
        ? statusCellWithHint(
            cellMeta.label,
            value,
            hint,
            panelWidth,
            tone,
            false,
          )
        : statusCell(cellMeta.label, value, panelWidth, tone, false),
    );
  }

  return rows;
};

const renderBlock = (
  state: AppState,
  blockId: BlockId,
  width: number,
): string[] => {
  return blockId === "lfo"
    ? renderLfoPanel(state, width)
    : renderBlockColumn(state, blockId, width);
};

const joinColumns = (columns: readonly string[]): string => {
  const [first, ...rest] = columns;
  if (first === undefined) return "";
  return rest.reduce((acc, col) => row(acc, col), first);
};

const makeRows = (
  blocks: readonly BlockId[],
  minBlockWidth: number,
  totalWidth: number,
): BlockId[][] => {
  const rows: BlockId[][] = [];
  let current: BlockId[] = [];
  let usedWidth = 0;

  for (const block of blocks) {
    const needed = (current.length > 0 ? 1 : 0) + minBlockWidth;
    if (current.length > 0 && usedWidth + needed > totalWidth) {
      rows.push(current);
      current = [block];
      usedWidth = minBlockWidth;
      continue;
    }

    current.push(block);
    usedWidth += needed;
  }

  if (current.length > 0) rows.push(current);
  return rows;
};

export const renderStatusPanel = (
  state: AppState,
  panelWidth: number,
  fullWidth: number,
): string[] => {
  const blockOrder: readonly BlockId[] = ["osc", "env", "lfo"];
  const blockRows = makeRows(blockOrder, panelWidth, fullWidth);
  const lines: string[] = [];

  for (let rowIndex = 0; rowIndex < blockRows.length; rowIndex += 1) {
    const blocksInRow = blockRows[rowIndex] ?? [];
    const rendered = blocksInRow.map((blockId) => {
      return renderBlock(state, blockId, panelWidth);
    });
    const rowHeight = Math.max(0, ...rendered.map((column) => column.length));

    for (let lineIndex = 0; lineIndex < rowHeight; lineIndex += 1) {
      const rowColumns = rendered.map((column) => {
        return column[lineIndex] ?? cell("", panelWidth, "gray");
      });
      lines.push(joinColumns(rowColumns));
    }

    if (rowIndex < blockRows.length - 1) {
      lines.push(divider(fullWidth));
    }
  }

  return lines;
};
