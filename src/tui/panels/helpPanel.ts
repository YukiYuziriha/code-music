import { divider, row, statusCell } from "../ansi.js";

export const renderHelpPanel = (
  panelWidth: number,
  fullWidth: number,
): string[] => {
  return [
    row(
      statusCell("waves", "1 sin 2 tri 3 saw 4 sqr", panelWidth, "gray"),
      statusCell("octave", "[ down   ] up", panelWidth, "gray"),
    ),
    row(
      statusCell("mode toggle", "`", panelWidth, "gray"),
      statusCell("nav", "h l j k", panelWidth, "gray"),
    ),
    row(
      statusCell("exit", "esc", panelWidth, "gray"),
      statusCell("audio", "resume on note", panelWidth, "gray"),
    ),
    divider(fullWidth),
  ];
};
