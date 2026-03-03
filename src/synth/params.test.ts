import { describe, expect, test } from "bun:test";
import {
  copyPatch,
  createPatch,
  withAttack,
  withDecay,
  withDelay,
  withHold,
  withMasterGain,
  withMaxVoices,
  withRelease,
  withSustain,
  withUnisonDetuneCents,
  withUnisonVoices,
  withWave,
} from "./params.js";

describe("synth/params", () => {
  test("createPatch applies defaults", () => {
    const patch = createPatch();

    expect(patch.voice.osc.wave).toBe("sawtooth");
    expect(patch.voice.osc.unisonVoices).toBe(1);
    expect(patch.voice.osc.unisonDetuneCents).toBe(0);
    expect(patch.voice.ampEnv.attack).toBe(0.01);
    expect(patch.voice.ampEnv.sustain).toBe(0.8);
    expect(patch.global.maxVoices).toBe(8);
    expect(patch.global.masterGain).toBe(0.2);
    expect(patch.voice.lfo.shape).toBe("sine");
    expect(patch.voice.lfo.rateMode).toBe("hz");
    expect(patch.voice.lfo.rateSync).toBe("1/4");
  });

  test("createPatch clamps voice/env/global boundaries", () => {
    const patch = createPatch({
      maxVoices: 500,
      masterGain: 5,
      delay: -1,
      attack: 99,
      hold: -4,
      decay: 11,
      sustain: -3,
      release: 22,
      unisonVoices: 100,
      unisonDetuneCents: -10,
    });

    expect(patch.global.maxVoices).toBe(64);
    expect(patch.global.masterGain).toBe(1);
    expect(patch.voice.ampEnv.delay).toBe(0);
    expect(patch.voice.ampEnv.attack).toBe(8);
    expect(patch.voice.ampEnv.hold).toBe(0);
    expect(patch.voice.ampEnv.decay).toBe(8);
    expect(patch.voice.ampEnv.sustain).toBe(0);
    expect(patch.voice.ampEnv.release).toBe(8);
    expect(patch.voice.osc.unisonVoices).toBe(16);
    expect(patch.voice.osc.unisonDetuneCents).toBe(0);
  });

  test("with* updaters change only intended slices", () => {
    const patch = createPatch();
    const next = withRelease(
      withSustain(
        withDecay(
          withHold(
            withDelay(
              withAttack(
                withUnisonDetuneCents(
                  withUnisonVoices(
                    withMaxVoices(
                      withMasterGain(withWave(patch, "square"), 0.7),
                      12,
                    ),
                    6,
                  ),
                  32,
                ),
                0.2,
              ),
              0.1,
            ),
            0.05,
          ),
          0.4,
        ),
        0.45,
      ),
      0.3,
    );

    expect(next.voice.osc.wave).toBe("square");
    expect(next.global.masterGain).toBe(0.7);
    expect(next.global.maxVoices).toBe(12);
    expect(next.voice.osc.unisonVoices).toBe(6);
    expect(next.voice.osc.unisonDetuneCents).toBe(32);
    expect(next.voice.ampEnv.attack).toBe(0.2);
    expect(next.voice.ampEnv.delay).toBe(0.1);
    expect(next.voice.ampEnv.hold).toBe(0.05);
    expect(next.voice.ampEnv.decay).toBe(0.4);
    expect(next.voice.ampEnv.sustain).toBe(0.45);
    expect(next.voice.ampEnv.release).toBe(0.3);

    expect(next.voice.lfo).toEqual(patch.voice.lfo);
    expect(next.voice.osc.detuneCents).toBe(patch.voice.osc.detuneCents);
  });

  test("copyPatch deep-copies nested structures", () => {
    const patch = createPatch();
    const copied = copyPatch(patch);

    expect(copied).toEqual(patch);
    expect(copied).not.toBe(patch);
    expect(copied.voice).not.toBe(patch.voice);
    expect(copied.voice.osc).not.toBe(patch.voice.osc);
    expect(copied.voice.ampEnv).not.toBe(patch.voice.ampEnv);
    expect(copied.voice.lfo).not.toBe(patch.voice.lfo);
  });
});
