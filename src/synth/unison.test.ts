import { describe, expect, test } from "bun:test";
import {
  buildActivationOrder,
  buildIntegerUnisonLayout,
  buildUnisonLayout,
} from "./unison.js";
import { createVoiceBlocks } from "./blocks.js";
import { createPatch } from "./params.js";

class TestParam {
  value = 0;
  setValueAtTime(value: number): void {
    this.value = value;
  }
  linearRampToValueAtTime(value: number): void {
    this.value = value;
  }
  cancelScheduledValues(): void {}
}

class TestNode {
  connect(): void {}
  disconnect(): void {}
}

class TestGainNode extends TestNode {
  gain = new TestParam();
}

class TestOscillatorNode extends TestNode {
  type: OscillatorType = "sine";
  frequency = new TestParam();
  detune = new TestParam();
  onended: (() => void) | null = null;
  start(): void {}
  stop(): void {
    this.onended?.();
  }
}

class TestBiquadFilterNode extends TestNode {
  type: BiquadFilterType = "allpass";
  frequency = new TestParam();
  Q = new TestParam();
  gain = new TestParam();
}

class TestWaveShaperNode extends TestNode {
  curve: Float32Array<ArrayBuffer> | null = null;
}

class TestAudioContext {
  currentTime = 0;
  destination = new TestNode() as unknown as AudioDestinationNode;

  createGain(): GainNode {
    return new TestGainNode() as unknown as GainNode;
  }

  createOscillator(): OscillatorNode {
    return new TestOscillatorNode() as unknown as OscillatorNode;
  }

  createWaveShaper(): WaveShaperNode {
    return new TestWaveShaperNode() as unknown as WaveShaperNode;
  }

  createBiquadFilter(): BiquadFilterNode {
    return new TestBiquadFilterNode() as unknown as BiquadFilterNode;
  }
}

describe("synth/unison", () => {
  test("buildActivationOrder expands from the center outward", () => {
    expect(buildActivationOrder(8)).toEqual([3, 4, 2, 5, 1, 6, 0, 7]);
  });

  test("buildIntegerUnisonLayout centers active voices and detune offsets", () => {
    const layout = buildIntegerUnisonLayout(4, 40);

    expect(layout.weights).toEqual([
      0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0,
    ]);
    expect(layout.offsets[6]).toBe(-40);
    expect(layout.offsets[7]).toBeCloseTo(-13.3333333333);
    expect(layout.offsets[8]).toBeCloseTo(13.3333333333);
    expect(layout.offsets[9]).toBe(40);
  });

  test("buildUnisonLayout blends adjacent voice counts smoothly", () => {
    const layout = buildUnisonLayout(3.5, 30);

    expect(layout.weights[6]).toBe(1);
    expect(layout.weights[7]).toBe(1);
    expect(layout.weights[8]).toBe(1);
    expect(layout.weights[9]).toBe(0.5);
    expect(layout.offsets[6]).toBeCloseTo(-30);
    expect(layout.offsets[7]).toBeCloseTo(-5);
    expect(layout.offsets[8]).toBeCloseTo(20);
    expect(layout.offsets[9]).toBeCloseTo(15);
  });

  test("createVoiceBlocks builds full persistent pool even at zero detune", () => {
    const ctx = new TestAudioContext() as unknown as AudioContext;
    const blocks = createVoiceBlocks({
      ctx,
      midi: 60,
      patch: createPatch({ unisonVoices: 1, unisonDetuneCents: 0 }),
      output: ctx.destination,
      unisonPoolVoices: 16,
    });

    expect(blocks.oscs).toHaveLength(16);
    expect(blocks.voiceGains).toHaveLength(16);
  });
});
