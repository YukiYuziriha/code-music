import { cell, divider, keyCell, row, statusCell } from "../ansi.js";
import { lowerPlayKeys, upperPlayKeys } from "../../app/keymap.js";
import type { AppState } from "../../app/types.js";

export const renderKeyboardPanel = (
  state: AppState,
  fullWidth: number,
): string[] => {
  const panelWidth = (fullWidth - 1) / 2;
  const lowerKeyboardStrip = lowerPlayKeys
    .map((key) => keyCell(key, state.activeKeys.has(key)))
    .join(" ");

  const upperKeyboardStrip = [
    keyCell(upperPlayKeys[0], state.activeKeys.has(upperPlayKeys[0])),
    keyCell(upperPlayKeys[1], state.activeKeys.has(upperPlayKeys[1])),
    "    ",
    keyCell(upperPlayKeys[2], state.activeKeys.has(upperPlayKeys[2])),
    keyCell(upperPlayKeys[3], state.activeKeys.has(upperPlayKeys[3])),
    keyCell(upperPlayKeys[4], state.activeKeys.has(upperPlayKeys[4])),
  ].join(" ");

  const activeNotes =
    state.activeKeys.size > 0
      ? Array.from(state.activeKeys.values()).join(" ")
      : "none";

  return [
    cell("PLAYBOARD", fullWidth, "blue", true),
    `   ${upperKeyboardStrip}`,
    `  ${lowerKeyboardStrip}`,
    row(
      statusCell(
        "active voices",
        String(state.activeKeys.size),
        panelWidth,
        "green",
      ),
      statusCell("active midi", activeNotes, panelWidth, "amber"),
    ),
    divider(fullWidth),
  ];
};
