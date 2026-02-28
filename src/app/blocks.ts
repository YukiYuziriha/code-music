import type { BlockId, CellId } from "./types.js";

export interface BlockCell {
  readonly id: CellId;
  readonly label: string;
  readonly shortLabel: string;
  readonly targetable: boolean;
}

const OSC_CELLS: readonly BlockCell[] = [
  { id: "osc.wave", label: "wave", shortLabel: "OSCWave", targetable: true },
  {
    id: "osc.octave",
    label: "octave",
    shortLabel: "OSCOct",
    targetable: true,
  },
  {
    id: "osc.unisonVoices",
    label: "unison voices",
    shortLabel: "OSCUnVo",
    targetable: true,
  },
  {
    id: "osc.unisonDetuneCents",
    label: "unison detune",
    shortLabel: "OSCDet",
    targetable: true,
  },
  {
    id: "osc.morph",
    label: "morph",
    shortLabel: "OSCMorph",
    targetable: true,
  },
  {
    id: "osc.emptyA",
    label: "",
    shortLabel: "OSC---",
    targetable: false,
  },
  {
    id: "osc.emptyB",
    label: "",
    shortLabel: "OSC---",
    targetable: false,
  },
  { id: "osc.empty", label: "", shortLabel: "OSC---", targetable: false },
];

const ENV_CELLS: readonly BlockCell[] = [
  { id: "env.delay", label: "delay", shortLabel: "ENVDel", targetable: false },
  {
    id: "env.attack",
    label: "attack",
    shortLabel: "ENVAtk",
    targetable: false,
  },
  { id: "env.hold", label: "hold", shortLabel: "ENVHold", targetable: false },
  { id: "env.decay", label: "decay", shortLabel: "ENVDec", targetable: false },
  {
    id: "env.sustain",
    label: "sustain",
    shortLabel: "ENVSus",
    targetable: false,
  },
  {
    id: "env.release",
    label: "release",
    shortLabel: "ENVRel",
    targetable: false,
  },
  {
    id: "env.matrix",
    label: "matrix",
    shortLabel: "ENVMat",
    targetable: false,
  },
  { id: "env.empty", label: "", shortLabel: "ENV---", targetable: false },
];

const LFO_CELLS: readonly BlockCell[] = [
  { id: "lfo.rate", label: "rate", shortLabel: "LFORate", targetable: false },
  {
    id: "lfo.phase",
    label: "phase",
    shortLabel: "LFOPhase",
    targetable: false,
  },
  { id: "lfo.mode", label: "mode", shortLabel: "LFOMode", targetable: false },
  {
    id: "lfo.graph",
    label: "graph",
    shortLabel: "LFOGraph",
    targetable: false,
  },
  { id: "lfo.emptyA", label: "", shortLabel: "LFO---", targetable: false },
  { id: "lfo.emptyB", label: "", shortLabel: "LFO---", targetable: false },
  {
    id: "lfo.matrix",
    label: "matrix",
    shortLabel: "LFOMat",
    targetable: false,
  },
  { id: "lfo.empty", label: "", shortLabel: "LFO---", targetable: false },
];

export const BLOCK_ORDER: readonly BlockId[] = ["osc", "env", "lfo"];

export const getBlockCells = (blockId: BlockId): readonly BlockCell[] => {
  if (blockId === "osc") return OSC_CELLS;
  if (blockId === "env") return ENV_CELLS;
  return LFO_CELLS;
};

export const getCellShortLabel = (cellId: CellId): string => {
  const allCells = [...OSC_CELLS, ...ENV_CELLS, ...LFO_CELLS];
  const found = allCells.find((cell) => cell.id === cellId);
  return found?.shortLabel ?? cellId;
};
