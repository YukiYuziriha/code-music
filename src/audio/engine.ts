import {
  PolySynth,
  type ModRoute,
  type PolySynthOptions,
  type SynthPatch,
  type WaveForm,
} from "../synth/polySynth.js";

type EngineOptions = PolySynthOptions;

const DEFAULT_ENGINE_OPTIONS: EngineOptions = {
  maxVoices: 8,
  attack: 0.01,
  release: 0.15,
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

  setMasterGain(value: number): void {
    this.synth.setMasterGain(value);
  }

  setAttack(value: number): void {
    this.synth.setAttack(value);
  }

  setRelease(value: number): void {
    this.synth.setRelease(value);
  }

  setMaxVoices(value: number): void {
    this.synth.setMaxVoices(value);
  }

  setModRoutes(routes: readonly ModRoute[]): void {
    this.synth.setModRoutes(routes);
  }

  getPatch(): SynthPatch {
    return this.synth.getPatch();
  }
}
