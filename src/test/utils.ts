import type { AppState } from "../app/types.js";

export const stripAnsi = (value: string): string => {
  return value.replace(/\x1b\[[0-9;]*m/g, "");
};

export const stripAnsiLines = (lines: readonly string[]): readonly string[] => {
  return lines.map((line) => stripAnsi(line));
};

export const withState = (
  state: AppState,
  overrides: Partial<AppState>,
): AppState => {
  return {
    ...state,
    ...overrides,
  };
};
