import type { OscMorphMode, SynthPatch } from "./params.js";
import { midiToHz } from "./utils.js";

interface VoiceBlockInput {
  ctx: AudioContext;
  midi: number;
  patch: SynthPatch;
  output: AudioNode;
}

export interface VoiceBlocks {
  oscs: OscillatorNode[];
  oscMix: GainNode;
  morph: MorphChain;
  amp: GainNode;
}

export interface MorphChain {
  readonly input: GainNode;
  readonly output: AudioNode;
  setMode: (mode: OscMorphMode, now: number) => void;
}

const buildIdentityCurve = (): Float32Array => {
  const size = 1024;
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    curve[i] = (i / (size - 1)) * 2 - 1;
  }
  return curve;
};

const buildSaturatingCurve = (drive: number, skew: number): Float32Array => {
  const size = 1024;
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    const x = (i / (size - 1)) * 2 - 1;
    const y = Math.tanh(drive * (x + skew * x * x * x));
    curve[i] = Math.max(-1, Math.min(1, y));
  }
  return curve;
};

const identityCurve = buildIdentityCurve();
const harmonicStretchCurve = buildSaturatingCurve(1.8, 0.2);
const inharmonicStretchCurve = buildSaturatingCurve(2.8, 0.45);
const smearCurve = buildSaturatingCurve(1.25, 0.05);

const toCurve = (curve: Float32Array): Float32Array<ArrayBuffer> => {
  return curve as Float32Array<ArrayBuffer>;
};

const createMorphChain = (ctx: AudioContext): MorphChain => {
  const input = ctx.createGain();
  const preGain = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const filterA = ctx.createBiquadFilter();
  const filterB = ctx.createBiquadFilter();

  input.connect(preGain);
  preGain.connect(shaper);
  shaper.connect(filterA);
  filterA.connect(filterB);

  const setMode = (mode: OscMorphMode, now: number): void => {
    switch (mode) {
      case "none": {
        preGain.gain.setValueAtTime(1, now);
        shaper.curve = toCurve(identityCurve);
        filterA.type = "allpass";
        filterA.frequency.setValueAtTime(1200, now);
        filterA.Q.setValueAtTime(0.7, now);
        filterB.type = "allpass";
        filterB.frequency.setValueAtTime(2400, now);
        filterB.Q.setValueAtTime(0.7, now);
        break;
      }
      case "low-pass": {
        preGain.gain.setValueAtTime(1, now);
        shaper.curve = toCurve(identityCurve);
        filterA.type = "lowpass";
        filterA.frequency.setValueAtTime(1800, now);
        filterA.Q.setValueAtTime(0.9, now);
        filterB.type = "lowpass";
        filterB.frequency.setValueAtTime(5200, now);
        filterB.Q.setValueAtTime(0.6, now);
        break;
      }
      case "high-pass": {
        preGain.gain.setValueAtTime(1, now);
        shaper.curve = toCurve(identityCurve);
        filterA.type = "highpass";
        filterA.frequency.setValueAtTime(420, now);
        filterA.Q.setValueAtTime(0.8, now);
        filterB.type = "highpass";
        filterB.frequency.setValueAtTime(980, now);
        filterB.Q.setValueAtTime(0.7, now);
        break;
      }
      case "harmonic-stretch": {
        preGain.gain.setValueAtTime(1.15, now);
        shaper.curve = toCurve(harmonicStretchCurve);
        filterA.type = "highshelf";
        filterA.frequency.setValueAtTime(2400, now);
        filterA.gain.setValueAtTime(6, now);
        filterB.type = "peaking";
        filterB.frequency.setValueAtTime(3200, now);
        filterB.Q.setValueAtTime(1.1, now);
        filterB.gain.setValueAtTime(2.5, now);
        break;
      }
      case "formant-scale": {
        preGain.gain.setValueAtTime(1, now);
        shaper.curve = toCurve(identityCurve);
        filterA.type = "bandpass";
        filterA.frequency.setValueAtTime(850, now);
        filterA.Q.setValueAtTime(2.8, now);
        filterB.type = "peaking";
        filterB.frequency.setValueAtTime(2200, now);
        filterB.Q.setValueAtTime(1.8, now);
        filterB.gain.setValueAtTime(5.5, now);
        break;
      }
      case "inharmonic-stretch": {
        preGain.gain.setValueAtTime(1.28, now);
        shaper.curve = toCurve(inharmonicStretchCurve);
        filterA.type = "highpass";
        filterA.frequency.setValueAtTime(260, now);
        filterA.Q.setValueAtTime(0.9, now);
        filterB.type = "peaking";
        filterB.frequency.setValueAtTime(3800, now);
        filterB.Q.setValueAtTime(1.6, now);
        filterB.gain.setValueAtTime(7, now);
        break;
      }
      case "smear": {
        preGain.gain.setValueAtTime(1, now);
        shaper.curve = toCurve(smearCurve);
        filterA.type = "lowpass";
        filterA.frequency.setValueAtTime(1400, now);
        filterA.Q.setValueAtTime(0.5, now);
        filterB.type = "lowpass";
        filterB.frequency.setValueAtTime(2800, now);
        filterB.Q.setValueAtTime(0.5, now);
        break;
      }
    }
  };

  setMode("none", ctx.currentTime);

  return {
    input,
    output: filterB,
    setMode,
  };
};

const buildUnisonDetuneOffsets = (
  unisonVoices: number,
  unisonDetuneCents: number,
): number[] => {
  if (unisonVoices <= 1 || unisonDetuneCents <= 0) {
    return [0];
  }

  const center = (unisonVoices - 1) / 2;
  const scale = center === 0 ? 0 : 1 / center;
  const offsets: number[] = [];

  for (let index = 0; index < unisonVoices; index += 1) {
    const normalized = (index - center) * scale;
    offsets.push(normalized * unisonDetuneCents);
  }

  return offsets;
};

export const unisonGainScale = (unisonVoices: number): number => {
  if (unisonVoices <= 1) return 1;
  return 1 / Math.sqrt(unisonVoices);
};

export const createVoiceBlocks = (input: VoiceBlockInput): VoiceBlocks => {
  const amp = input.ctx.createGain();
  const morph = createMorphChain(input.ctx);
  const oscMix = input.ctx.createGain();

  const detuneOffsets = buildUnisonDetuneOffsets(
    input.patch.voice.osc.unisonVoices,
    input.patch.voice.osc.unisonDetuneCents,
  );
  const oscs = detuneOffsets.map((detuneOffset) => {
    const osc = input.ctx.createOscillator();
    osc.type = input.patch.voice.osc.wave;
    osc.frequency.setValueAtTime(midiToHz(input.midi), input.ctx.currentTime);
    osc.detune.setValueAtTime(
      input.patch.voice.osc.detuneCents + detuneOffset,
      input.ctx.currentTime,
    );
    osc.connect(oscMix);
    return osc;
  });

  oscMix.connect(morph.input);
  morph.setMode(input.patch.voice.osc.morphMode, input.ctx.currentTime);
  morph.output.connect(amp);
  amp.connect(input.output);

  return { oscs, oscMix, morph, amp };
};

export const scheduleAmpEnvelopeStart = (
  amp: GainNode,
  now: number,
  targetLevel: number,
  env: {
    delay: number;
    attack: number;
    hold: number;
    decay: number;
    sustain: number;
  },
): void => {
  amp.gain.cancelScheduledValues(now);
  amp.gain.setValueAtTime(0, now);

  const delayEnd = now + Math.max(0, env.delay);
  amp.gain.setValueAtTime(0, delayEnd);

  const attackEnd = delayEnd + Math.max(0, env.attack);
  if (env.attack <= 0) {
    amp.gain.setValueAtTime(targetLevel, delayEnd);
  } else {
    amp.gain.linearRampToValueAtTime(targetLevel, attackEnd);
  }

  const holdEnd = attackEnd + Math.max(0, env.hold);
  amp.gain.setValueAtTime(targetLevel, holdEnd);

  const sustainLevel = targetLevel * Math.max(0, Math.min(1, env.sustain));
  const decayEnd = holdEnd + Math.max(0, env.decay);
  if (env.decay <= 0) {
    amp.gain.setValueAtTime(sustainLevel, holdEnd);
    return;
  }

  amp.gain.linearRampToValueAtTime(sustainLevel, decayEnd);
};

export const scheduleAmpRelease = (
  amp: GainNode,
  now: number,
  release: number,
): number => {
  const end = now + Math.max(0, release);

  amp.gain.cancelScheduledValues(now);
  amp.gain.setValueAtTime(amp.gain.value, now);
  amp.gain.linearRampToValueAtTime(0, end);

  return end;
};
