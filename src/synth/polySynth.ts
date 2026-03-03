import { VoiceRegistry } from "./allocator.js";
import { ModMatrix, type ModRoute } from "./matrix.js";
import {
  copyPatch,
  createPatch,
  withAttack,
  withDecay,
  withDelay,
  withHold,
  withMasterGain,
  withMaxVoices,
  withLfoBipolar,
  withLfoDepth,
  withLfoPhase,
  withLfoRateHz,
  withLfoRateMode,
  withLfoRateSync,
  withLfoRetrigger,
  withLfoShape,
  withLfoSmooth,
  withMorphMode,
  withRelease,
  withSustain,
  withUnisonDetuneCents,
  withUnisonVoices,
  withWave,
  type OscMorphMode,
  type LfoRateMode,
  type LfoShape,
  type LfoSyncDivision,
  type PolySynthOptions,
  type SynthPatch,
  type WaveForm,
} from "./params.js";
import { clamp01 } from "./utils.js";
import { SynthVoice } from "./voice.js";

export type {
  LfoRateMode,
  LfoShape,
  LfoSyncDivision,
  OscMorphMode,
  PolySynthOptions,
  SynthPatch,
  WaveForm,
} from "./params.js";
export type { ModRoute } from "./matrix.js";

export class PolySynth {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly voices: VoiceRegistry;
  private readonly modMatrix: ModMatrix;
  private patch: SynthPatch;

  constructor(ctx: AudioContext, options?: Partial<PolySynthOptions>) {
    this.ctx = ctx;
    this.patch = createPatch(options);

    this.master = this.ctx.createGain();
    this.master.gain.value = this.patch.global.masterGain;
    this.master.connect(this.ctx.destination);

    this.voices = new VoiceRegistry(this.patch.global.maxVoices);
    this.modMatrix = new ModMatrix();
  }

  async resumeIfNeeded(): Promise<void> {
    if (this.ctx.state !== "running") {
      await this.ctx.resume();
    }
  }

  setWave(wave: WaveForm): void {
    this.patch = withWave(this.patch, wave);
    this.voices.forEachVoice((voice) => {
      voice.setWave(wave);
    });
  }

  setMasterGain(value: number): void {
    this.patch = withMasterGain(this.patch, value);
    this.master.gain.setValueAtTime(
      this.patch.global.masterGain,
      this.ctx.currentTime,
    );
  }

  setAttack(value: number): void {
    this.patch = withAttack(this.patch, value);
  }

  setDelay(value: number): void {
    this.patch = withDelay(this.patch, value);
  }

  setHold(value: number): void {
    this.patch = withHold(this.patch, value);
  }

  setDecay(value: number): void {
    this.patch = withDecay(this.patch, value);
  }

  setSustain(value: number): void {
    this.patch = withSustain(this.patch, value);
  }

  setRelease(value: number): void {
    this.patch = withRelease(this.patch, value);
  }

  setUnisonVoices(value: number): void {
    this.patch = withUnisonVoices(this.patch, value);
    this.voices.forEachVoice((voice) => {
      voice.setUnisonVoices(this.patch.voice.osc.unisonVoices);
    });
  }

  setUnisonDetuneCents(value: number): void {
    this.patch = withUnisonDetuneCents(this.patch, value);
    this.voices.forEachVoice((voice) => {
      voice.setUnisonDetuneCents(this.patch.voice.osc.unisonDetuneCents);
    });
  }

  setOscMorphMode(mode: OscMorphMode): void {
    this.patch = withMorphMode(this.patch, mode);
    this.voices.forEachVoice((voice) => {
      voice.setMorphMode(mode);
    });
  }

  setLfoShape(shape: LfoShape): void {
    this.patch = withLfoShape(this.patch, shape);
    this.voices.forEachVoice((voice) => {
      voice.setLfoShape(this.patch.voice.lfo.shape);
    });
  }

  setLfoRateMode(rateMode: LfoRateMode): void {
    this.patch = withLfoRateMode(this.patch, rateMode);
    this.voices.forEachVoice((voice) => {
      voice.setLfoRateMode(this.patch.voice.lfo.rateMode);
    });
  }

  setLfoRateHz(rateHz: number): void {
    this.patch = withLfoRateHz(this.patch, rateHz);
    this.voices.forEachVoice((voice) => {
      voice.setLfoRateHz(this.patch.voice.lfo.rateHz);
    });
  }

  setLfoRateSync(rateSync: LfoSyncDivision): void {
    this.patch = withLfoRateSync(this.patch, rateSync);
    this.voices.forEachVoice((voice) => {
      voice.setLfoRateSync(this.patch.voice.lfo.rateSync);
    });
  }

  setLfoDepth(depth: number): void {
    this.patch = withLfoDepth(this.patch, depth);
    this.voices.forEachVoice((voice) => {
      voice.setLfoDepth(this.patch.voice.lfo.depth);
    });
  }

  setLfoPhase(phase: number): void {
    this.patch = withLfoPhase(this.patch, phase);
    this.voices.forEachVoice((voice) => {
      voice.setLfoPhase(this.patch.voice.lfo.phase);
    });
  }

  setLfoRetrigger(retrigger: boolean): void {
    this.patch = withLfoRetrigger(this.patch, retrigger);
    this.voices.forEachVoice((voice) => {
      voice.setLfoRetrigger(
        this.patch.voice.lfo.retrigger,
        this.ctx.currentTime,
      );
    });
  }

  setLfoBipolar(bipolar: boolean): void {
    this.patch = withLfoBipolar(this.patch, bipolar);
    this.voices.forEachVoice((voice) => {
      voice.setLfoBipolar(this.patch.voice.lfo.bipolar);
    });
  }

  setLfoSmooth(smooth: number): void {
    this.patch = withLfoSmooth(this.patch, smooth);
    this.voices.forEachVoice((voice) => {
      voice.setLfoSmooth(this.patch.voice.lfo.smooth);
    });
  }

  setMaxVoices(value: number): void {
    this.patch = withMaxVoices(this.patch, value);
    this.voices.setMaxVoices(this.patch.global.maxVoices, this.ctx.currentTime);
  }

  setModRoutes(routes: readonly ModRoute[]): void {
    this.modMatrix.setRoutes(routes);
    const resolvedRoutes = this.modMatrix.getRoutes();
    this.voices.forEachVoice((voice) => {
      voice.setModRoutes(resolvedRoutes, this.ctx.currentTime);
    });
  }

  getModRoutes(): readonly ModRoute[] {
    return this.modMatrix.getRoutes();
  }

  getPatch(): SynthPatch {
    return copyPatch(this.patch);
  }

  noteOn(midi: number, velocity = 1): void {
    if (this.voices.has(midi)) return;

    const now = this.ctx.currentTime;
    const voice = new SynthVoice({
      ctx: this.ctx,
      output: this.master,
      patch: copyPatch(this.patch),
      modRoutes: this.modMatrix.getRoutes(),
      midi,
      velocity: clamp01(velocity),
      onEnded: (endedMidi) => {
        this.voices.remove(endedMidi);
      },
    });

    this.voices.add(voice, now);
    voice.start(now);
  }

  noteOff(midi: number): void {
    this.voices.release(midi, this.ctx.currentTime);
  }

  panic(): void {
    this.voices.panic(this.ctx.currentTime);
  }
}
