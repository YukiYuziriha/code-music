import { cell, divider } from "../ansi.js";

export const renderHeaderPanel = (
  mode: "play" | "nav",
  fullWidth: number,
): string[] => {
  const modeLabel =
    mode === "play"
      ? "CURRENT MODE: PLAY (` to toggle)"
      : "CURRENT MODE: NAV (` to toggle)";

  return [
    divider(fullWidth),
    cell(modeLabel, fullWidth, "blue", true),
    divider(fullWidth),
  ];
};
