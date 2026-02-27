import type { BlockId, CellId } from "./types.js";

export interface BlockCell {
  readonly id: CellId;
  readonly label: string;
  readonly shortLabel: string;
  readonly targetable: boolean;
}

const OSC_CELLS: readonly BlockCell[] = [
  { id: "osc.wave", label: "wave", shortLabel: "OSCWave", targetable: false },
  {
    id: "osc.octave",
    label: "octave",
    shortLabel: "OSCOct",
    targetable: false,
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
    targetable: false,
  },
  {
    id: "osc.activeVoices",
    label: "active voices",
    shortLabel: "OSCActV",
    targetable: false,
  },
  {
    id: "osc.activeMidi",
    label: "active midi",
    shortLabel: "OSCActM",
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

export const BLOCK_ORDER: readonly BlockId[] = ["osc", "env"];

export const getBlockCells = (blockId: BlockId): readonly BlockCell[] => {
  return blockId === "osc" ? OSC_CELLS : ENV_CELLS;
};

export const getCellShortLabel = (cellId: CellId): string => {
  const allCells = [...OSC_CELLS, ...ENV_CELLS];
  const found = allCells.find((cell) => cell.id === cellId);
  return found?.shortLabel ?? cellId;
};
