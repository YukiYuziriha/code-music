import {
  type LfoRateMode,
  type LfoShape,
  type LfoSyncDivision,
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
  lfoShape: "sine",
  lfoRateMode: "hz",
  lfoRateHz: 2,
  lfoRateSync: "1/4",
  lfoDepth: 1,
  lfoPhase: 0,
  lfoRetrigger: true,
  lfoBipolar: true,
  lfoSmooth: 0,
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

  setLfoShape(shape: LfoShape): void {
    this.synth.setLfoShape(shape);
  }

  setLfoRateMode(rateMode: LfoRateMode): void {
    this.synth.setLfoRateMode(rateMode);
  }

  setLfoRateHz(rateHz: number): void {
    this.synth.setLfoRateHz(rateHz);
  }

  setLfoRateSync(rateSync: LfoSyncDivision): void {
    this.synth.setLfoRateSync(rateSync);
  }

  setLfoDepth(depth: number): void {
    this.synth.setLfoDepth(depth);
  }

  setLfoPhase(phase: number): void {
    this.synth.setLfoPhase(phase);
  }

  setLfoRetrigger(retrigger: boolean): void {
    this.synth.setLfoRetrigger(retrigger);
  }

  setLfoBipolar(bipolar: boolean): void {
    this.synth.setLfoBipolar(bipolar);
  }

  setLfoSmooth(smooth: number): void {
    this.synth.setLfoSmooth(smooth);
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
