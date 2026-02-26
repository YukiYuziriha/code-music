import type { SynthPatch } from "./params.js";
import { midiToHz } from "./utils.js";

interface VoiceBlockInput {
  ctx: AudioContext;
  midi: number;
  patch: SynthPatch;
  output: AudioNode;
}

export interface VoiceBlocks {
  osc: OscillatorNode;
  amp: GainNode;
}

export const createVoiceBlocks = (input: VoiceBlockInput): VoiceBlocks => {
  const osc = input.ctx.createOscillator();
  const amp = input.ctx.createGain();

  osc.type = input.patch.voice.osc.wave;
  osc.frequency.setValueAtTime(midiToHz(input.midi), input.ctx.currentTime);
  osc.detune.setValueAtTime(
    input.patch.voice.osc.detuneCents,
    input.ctx.currentTime,
  );

  osc.connect(amp);
  amp.connect(input.output);

  return { osc, amp };
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
