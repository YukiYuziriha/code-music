# Progress Bar Rendering

## Purpose

Provide one shared visual behavior for value rows in the TUI status blocks.

- Show value position across full row width.
- Keep style subtle and consistent with existing cell backgrounds.
- Update live from direct edits and modulation/matrix preview values.

## Single Source of Truth

All progress background rendering is centralized in `src/tui/ansi.ts`:

- `progressStatusCell(...)`
- `progressStatusCellWithHint(...)`

Both helpers use the same internal pipeline:

1. Build row text content (label/value, optional hint).
2. Convert normalized progress (`0..1`) to filled width across the full rendered row.
3. Paint per-character ANSI background colors:
   - filled side: subtle gradient near base tone background
   - unfilled side: slightly dimmed base tone background

Rules:

- Minimum value still paints exactly one character cell as filled.
- Maximum value paints the entire row as filled.

## Architecture in Status Panel

`src/tui/panels/statusPanel.ts` owns value-to-progress mapping via `getCellProgress(...)`.

- Continuous params use numeric normalization (`min..max` -> `0..1`).
- Discrete params use indexed state normalization (first state `0`, last state `1`).
- Matrix/non-range rows return `null` and fall back to normal non-progress cells.

This split keeps:

- **Rendering policy** in `ansi.ts`
- **Domain normalization policy** in `statusPanel.ts`

## Covered Rows

Progress backgrounds are applied to all rows with range/state progression, including:

- OSC: wave, octave, unison voices, unison detune, morph
- ENV: delay, attack, hold, decay, sustain, release
- LFO: top out row, shape, rate mode, rate, depth, phase, retrigger, bipolar, smooth

Rows like matrix summaries are intentionally excluded.
