import {
  type LfoMode,
  type LfoPoint,
  type OscMorphMode,
  PolySynth,
  type ModRoute,
  type PolySynthOptions,
  type SynthPatch,
  type WaveForm,
} from "../synth/polySynth.js";

type EngineOptions = PolySynthOptions;

const DEFAULT_ENGINE_OPTIONS: EngineOptions = {
  maxVoices: 8,
  delay: 0,
  attack: 0.01,
  hold: 0,
  decay: 0.2,
  sustain: 0.8,
  release: 0.15,
  wave: "sawtooth",
  morphMode: "none",
  masterGain: 0.2,
  unisonVoices: 1,
  unisonDetuneCents: 0,
  lfoRateHz: 2,
  lfoPhaseOffset: 0,
  lfoMode: "trigger",
  lfoPoints: [
    { x: 0, y: 0 },
    { x: 0.25, y: 1 },
    { x: 0.5, y: 0 },
    { x: 0.75, y: -1 },
    { x: 1, y: 0 },
  ],
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

  setDelay(value: number): void {
    this.synth.setDelay(value);
  }

  setHold(value: number): void {
    this.synth.setHold(value);
  }

  setDecay(value: number): void {
    this.synth.setDecay(value);
  }

  setSustain(value: number): void {
    this.synth.setSustain(value);
  }

  setRelease(value: number): void {
    this.synth.setRelease(value);
  }

  setUnisonVoices(value: number): void {
    this.synth.setUnisonVoices(value);
  }

  setUnisonDetuneCents(value: number): void {
    this.synth.setUnisonDetuneCents(value);
  }

  setOscMorphMode(mode: OscMorphMode): void {
    this.synth.setOscMorphMode(mode);
  }

  setLfoMode(mode: LfoMode): void {
    this.synth.setLfoMode(mode);
  }

  setLfoRateHz(rateHz: number): void {
    this.synth.setLfoRateHz(rateHz);
  }

  setLfoPhaseOffset(phaseOffset: number): void {
    this.synth.setLfoPhaseOffset(phaseOffset);
  }

  setLfoPoints(points: readonly LfoPoint[]): void {
    this.synth.setLfoPoints(points);
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
