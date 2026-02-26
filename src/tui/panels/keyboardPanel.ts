import { cell, divider, keyCell } from "../ansi.js";
import { lowerPlayKeys, upperPlayKeys } from "../../app/keymap.js";
import type { AppState } from "../../app/types.js";

export const renderKeyboardPanel = (
  state: AppState,
  fullWidth: number,
): string[] => {
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

  return [
    cell("PLAYBOARD", fullWidth, "blue", true),
    `   ${upperKeyboardStrip}`,
    `  ${lowerKeyboardStrip}`,
    divider(fullWidth),
  ];
};
