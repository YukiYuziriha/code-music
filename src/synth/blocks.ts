import type { SynthPatch } from "./params.js";
import { midiToHz } from "./utils.js";

interface VoiceBlockInput {
  ctx: AudioContext;
  midi: number;
  patch: SynthPatch;
  output: AudioNode;
}

export interface VoiceBlocks {
  oscs: OscillatorNode[];
  amp: GainNode;
}

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
    osc.connect(amp);
    return osc;
  });

  amp.connect(input.output);

  return { oscs, amp };
};

export const scheduleAmpAttack = (
  amp: GainNode,
  now: number,
  targetLevel: number,
  attack: number,
): void => {
  amp.gain.cancelScheduledValues(now);
  amp.gain.setValueAtTime(0, now);

  if (attack <= 0) {
    amp.gain.setValueAtTime(targetLevel, now);
    return;
  }

  amp.gain.linearRampToValueAtTime(targetLevel, now + attack);
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
