import { PolySynth, type WaveForm } from "../synth/polySynth.js";

interface EngineOptions {
  maxVoices: number;
  wave: WaveForm;
  masterGain: number;
}

const DEFAULT_ENGINE_OPTIONS: EngineOptions = {
  maxVoices: 8,
  wave: "sawtooth",
  masterGain: 0.2,
};

export class AudioEngine {
  private readonly synth: PolySynth;

  constructor(ctx: AudioContext, options?: Partial<EngineOptions>) {
    this.synth = new PolySynth(ctx, { ...DEFAULT_ENGINE_OPTIONS, ...options });
  }

  resumeIfNeeded(): Promise<void> {
    return this.synth.resumeIfNeeded();
  }

  noteOn(midi: number, velocity = 1): void {
    this.synth.noteOn(midi, velocity);
  }

  noteOff(midi: number): void {
    this.synth.noteOff(midi);
  }

  panic(): void {
    this.synth.panic();
  }

  setWave(wave: WaveForm): void {
    this.synth.setWave(wave);
  }
}
