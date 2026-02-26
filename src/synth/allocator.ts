import type { SynthVoice } from "./voice.js";

const clampVoices = (value: number): number => {
  return Math.max(1, Math.floor(value));
};

export class VoiceRegistry {
  private readonly voices = new Map<number, SynthVoice>();
  private maxVoices: number;

  constructor(maxVoices: number) {
    this.maxVoices = clampVoices(maxVoices);
  }

  has(midi: number): boolean {
    return this.voices.has(midi);
  }

  setMaxVoices(maxVoices: number, now: number): void {
    this.maxVoices = clampVoices(maxVoices);
    this.trimToLimit(now);
  }

  add(voice: SynthVoice, now: number): void {
    this.trimForInsert(now);
    this.voices.set(voice.midi, voice);
  }

  release(midi: number, now: number): void {
    const voice = this.voices.get(midi);
    if (!voice) return;
    voice.release(now);
  }

  remove(midi: number): void {
    this.voices.delete(midi);
  }

  panic(now: number): void {
    const currentVoices = [...this.voices.values()];
    for (const voice of currentVoices) {
      voice.forceStop(now);
    }
    this.voices.clear();
  }

  forEachVoice(run: (voice: SynthVoice) => void): void {
    for (const voice of this.voices.values()) {
      run(voice);
    }
  }

  private trimForInsert(now: number): void {
    while (this.voices.size >= this.maxVoices) {
      const oldestMidi = this.voices.keys().next().value as number | undefined;
      if (oldestMidi === undefined) return;
      const oldestVoice = this.voices.get(oldestMidi);
      this.voices.delete(oldestMidi);
      if (!oldestVoice) continue;
      oldestVoice.forceStop(now);
    }
  }

  private trimToLimit(now: number): void {
    while (this.voices.size > this.maxVoices) {
      const oldestMidi = this.voices.keys().next().value as number | undefined;
      if (oldestMidi === undefined) return;
      const oldestVoice = this.voices.get(oldestMidi);
      this.voices.delete(oldestMidi);
      if (!oldestVoice) continue;
      oldestVoice.forceStop(now);
    }
  }
}
