# LFO Migration Plan (TUI-first)

## Goal

Replace graph-based LFO editing with compact value cells that are faster and clearer in a terminal UI, while preserving musical usefulness for EDM workflows.

## Scope and constraints

- Keep LFO as a first-class modulation source in matrix routing.
- Remove graph UX and dedicated point-edit mode from the app UI.
- Keep behavior stable in OSC/ENV/matrix architecture before LFO internals are changed.
- Do not add LFO unit tests yet (explicitly deferred).

## Current architecture summary

- App state/UI currently stores and edits LFO as points (`points`, `selectedPointIndex`) and includes `lfo.graph` cell.
- Controller has a dedicated `edit` mode only for LFO graph point editing.
- Status panel renders a full-width LFO graph and point markers.
- Synth runtime samples LFO from point interpolation.
- Matrix source integration for `lfo1` already exists and reuses ENV flow.
- Matrix target effectiveness is currently limited by mapping in controller/preview code.

## Proposed target LFO model

Replace graph with value cells:

- `lfo.shape` enum: `sine | triangle | saw | square | random`
- `lfo.rateMode` enum: `hz | sync`
- `lfo.rate` value: `rateHz` when `hz`, `rateSync` when `sync`
- `lfo.depth` float `0..1`
- `lfo.phase` float `0..1` (or displayed in degrees)
- `lfo.retrigger` bool
- `lfo.bipolar` bool
- `lfo.smooth` float (small slew amount)
- `lfo.matrix` route entry point

Real-time feedback (no graph):

- Show `OUT: +/-x.xx` updated each frame.
- Optional compact meter can be added later.

## Migration sequence (low risk)

1. UI decoupling first
   - Remove graph-specific copy and hints.
   - Remove `edit` mode transitions for LFO graph behavior.
   - Keep existing synth point engine untouched during this step.

2. App data model swap
   - Replace point-oriented LFO fields in app state with scalar/value-cell fields.
   - Replace `lfo.graph` cell ID with new LFO cell IDs.
   - Update shortcuts and cell rendering to reflect new cells.

3. Controller updates
   - Remove point-edit actions and handlers.
   - Add per-cell increment/decrement/toggle/cycle behavior for new LFO fields.
   - Keep matrix pick/apply flow as-is for LFO source.

4. DSP/runtime updates
   - Implement waveform-based LFO output math.
   - Implement retrigger vs free-run behavior.
   - Implement bipolar/unipolar mapping and depth scaling.
   - Implement smooth slew after waveform generation.
   - Keep phase behavior deterministic.

5. Rate sync support
   - Add sync division mapping to Hz conversion.
   - Bind conversion to an explicit BPM source (internal constant or app parameter).

6. Matrix target pass
   - Ensure at least practical, audible destinations are routable and actually applied.
   - Keep matrix UX flow unchanged unless target architecture is improved.

## UX design notes (flexibility)

- Terminal-first means immediate value visibility is more important than curve visuals.
- Current row-shortcut model is fast but does not scale indefinitely.
- Recommended hybrid:
  - Keep direct per-row shortcuts for speed.
  - Also support focused-cell adjustment path for scalability (cursor/select + adjust).
- Keep header/help hints mode-aware and concise to avoid hidden controls.
- Keep live output readout always visible in LFO block for confidence while editing.

## Known risks to manage during migration

- Stale hints/mode text if graph mode is removed incompletely.
- Matrix target mismatch (UI targetable cells vs actually mapped synth targets).
- Behavioral drift in note-on timing/retrigger if phase handling is not locked.
- Regression in non-LFO behavior from shared state/controller refactors.

---

# Pre-LFO Unit Test Coverage Plan

This section defines test coverage to lock existing OSC, ENV, matrix, and core architecture behavior before LFO redesign. LFO-specific tests are intentionally excluded for now.

## Test tooling bootstrap

Recommended stack:

- `bun test` (built-in Bun test runner)
- Bun coverage via `bun test --coverage`
- Node-compatible unit tests with lightweight mocks for WebAudio-facing modules

Suggested script additions:

- `test`: `bun test`
- `test:watch`: `bun test --watch`
- `test:coverage`: `bun test --coverage`

## Coverage priorities

### P0: synth parameter safety and patch normalization

Files:

- `src/synth/params.ts`

Cases:

- Clamp boundaries for ENV times, sustain, unison values, max voices.
- Patch creation defaults for OSC/ENV/global fields.
- `with*` updaters mutate only intended slices and preserve other fields.
- `copyPatch` deep-copy behavior for nested structures.

Why:

- Prevents broad regressions in many code paths before touching LFO-related state shape.

### P0: modulation mapping and target resolution

Files:

- `src/synth/modulation.ts`
- `src/synth/matrix.ts`

Cases:

- Route amount clamping in `ModMatrix`.
- Unipolar vs bipolar source conversion logic.
- Contribution sum clamping to signed range.
- Descriptor-based mapping (min/max/depth/quantize).
- Target resolution for `osc.unisonVoices` and `osc.unisonDetuneCents`.

Why:

- Matrix behavior is shared architecture and should stay stable during LFO migration.

### P0: app reducer behavior for OSC/ENV/navigation/matrix

Files:

- `src/app/state.ts`

Cases:

- OSC controls: octave shift, unison voices shift, detune shift, morph cycle.
- ENV controls: delay/attack/hold/decay/sustain/release stepping and clamping.
- Navigation: block cycle, cell cycle, selected cell persistence by block.
- Matrix state machine: mode transitions, selection updates, target block/cell cycle.
- Route toggle semantics: add/remove route, no duplicate for same source+target.
- Note on/off + panic state transitions for `activeKeys` and env preview timestamps.

Why:

- Locks user-input behavior and matrix routing semantics before controller/UI changes.

### P1: controller shortcut routing (non-LFO)

Files:

- `src/app/controller.ts`

Cases:

- Selected-block shortcuts dispatch expected actions for OSC and ENV.
- Backtick mode cycling behavior for play/nav paths.
- Matrix enter flow for ENV source: starts pick mode and initializes selection.
- Matrix navigation keys in `pick-block` and `pick-cell` modes.
- Escape behavior: step back matrix modes, then quit behavior.

Why:

- Prevents control-map regressions while refactoring LFO controls in same controller.

### P1: TUI status value formatting (non-LFO-specific assertions)

Files:

- `src/tui/panels/statusPanel.ts`
- `src/tui/panels/headerPanel.ts`

Cases:

- Basic rendering includes OSC and ENV titles and expected cell labels.
- Value formatting for seconds, octave labels, unison strings.
- Matrix route summary text for ENV matrix cell.
- Header mode line changes for play/nav.

Why:

- Keeps presentation stable during structural changes to LFO block rendering.

### P2: synth voice behavior (targeted and deterministic)

Files:

- `src/synth/voice.ts`
- `src/synth/blocks.ts`

Cases:

- Unison detune offset generation behavior via observable oscillator detune values.
- Rebuild path when modulated unison voice count changes.
- Envelope schedule helpers (`scheduleAmpEnvelopeStart`, `scheduleAmpRelease`) using mocked `GainNode` automation calls.

Why:

- Higher setup cost due to WebAudio mocking, but valuable for preventing hidden audio regressions.

## Test data and fixtures

- Create reusable factory helpers for app state and synth patch setup.
- Use deterministic timestamps for reducer/controller time-sensitive tests.
- Prefer small table-driven cases for clamp/step logic.

## Coverage gate recommendation

Initial (pre-LFO-change) gate:

- Global statements: >= 70%
- Critical modules (`app/state.ts`, `synth/modulation.ts`, `synth/params.ts`): >= 90%

Rationale:

- Strong confidence on behavior-critical logic without forcing brittle UI string tests everywhere.

## Execution order

1. Add test tooling and baseline test command.
2. Implement P0 suites first (`params`, `modulation`, `state`).
3. Add P1 controller suites with dependency stubs/mocks.
4. Add selective P1 TUI formatting assertions.
5. Add P2 voice/block tests if mocking overhead is acceptable.
6. Freeze baseline coverage report before starting LFO refactor.

## Explicit deferment

- No LFO behavior tests are included in this phase by request.
- LFO tests can be added after the new value-cell implementation is stable.
