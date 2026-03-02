import { describe, expect, test } from "bun:test";
import { createInitialState } from "../../app/state.js";
import type { AppState } from "../../app/types.js";
import { renderHeaderPanel } from "./headerPanel.js";
import { renderStatusPanel } from "./statusPanel.js";
import { stripAnsiLines } from "../../test/utils.js";

describe("tui/panels", () => {
  test("status panel includes OSC and ENV sections", () => {
    const state = createInitialState();
    const lines = stripAnsiLines(renderStatusPanel(state, 32, 65));

    expect(lines.some((line) => line.includes("OSCILLATOR"))).toBe(true);
    expect(lines.some((line) => line.includes("ENVELOPE"))).toBe(true);
    expect(lines.some((line) => line.includes("LFO"))).toBe(true);
  });

  test("status panel formats key values and env matrix summary", () => {
    const state: AppState = {
      ...createInitialState(),
      octaveOffset: 2,
      unisonVoices: 3,
      env: {
        delay: 0,
        attack: 0.5,
        hold: 0,
        decay: 0.2,
        sustain: 0.8,
        release: 0.15,
      },
      modRoutes: [
        { source: "env1", target: "osc.wave", amount: 1, enabled: true },
        {
          source: "env1",
          target: "osc.unisonVoices",
          amount: 1,
          enabled: true,
        },
      ],
    };

    const lines = stripAnsiLines(renderStatusPanel(state, 38, 77));
    const text = lines.join("\n");

    expect(text).toContain("OCTAVE  +2");
    expect(text).toContain("ATTACK  0.50s");
    expect(text).toContain("MATRIX  OSCWave+1");
    expect(text).toContain("UNISON VOICES  3>");
  });

  test("header panel shows mode-specific details", () => {
    const playLines = stripAnsiLines(
      renderHeaderPanel(
        { inputMode: "play", matrixMode: "idle", selectedBlock: "osc" },
        80,
      ),
    );
    expect(playLines[1]).toContain("CURRENT MODE: PLAY");
    expect(playLines[2]).toContain("SHORTCUTS ACTIVE: OSCILLATOR");

    const navLines = stripAnsiLines(
      renderHeaderPanel(
        {
          inputMode: "nav",
          matrixMode: "pick-block",
          selectedBlock: "env",
        },
        80,
      ),
    );
    expect(navLines[1]).toContain("CURRENT MODE: NAV");
    expect(navLines[2]).toContain("BLOCK: ENVELOPE  MATRIX: PICK-BLOCK");
  });
});
