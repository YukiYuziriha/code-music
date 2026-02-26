import { cell, divider } from "../ansi.js";

export const renderHeaderPanel = (fullWidth: number): string[] => {
  return [
    divider(fullWidth),
    cell("WAVETABLE CONTROL SURFACE", fullWidth, "blue", true),
    divider(fullWidth),
  ];
};
