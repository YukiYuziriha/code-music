export interface CellShortcut {
  readonly decKey: string;
  readonly incKey: string;
  readonly hint: string;
}

export const CELL_SHORTCUTS: readonly CellShortcut[] = [
  { decKey: "w", incKey: "e", hint: "1-4 w e" },
  { decKey: "r", incKey: "t", hint: "r t" },
  { decKey: "y", incKey: "u", hint: "y u" },
  { decKey: "i", incKey: "o", hint: "i o" },
  { decKey: "[", incKey: "]", hint: "[ ]" },
  { decKey: "-", incKey: "=", hint: "- =" },
  { decKey: "enter", incKey: "enter", hint: "enter" },
  { decKey: "", incKey: "", hint: "" },
];
