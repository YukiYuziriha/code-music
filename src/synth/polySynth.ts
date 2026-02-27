import { VoiceRegistry } from "./allocator.js";
import { ModMatrix, type ModRoute } from "./matrix.js";
import {
  copyPatch,
  createPatch,
  withAttack,
  withMasterGain,
  withMaxVoices,
  withRelease,
  withUnisonDetuneCents,
  withUnisonVoices,
  withWave,
  type PolySynthOptions,
  type SynthPatch,
  type WaveForm,
} from "./params.js";
import { clamp01 } from "./utils.js";
import { SynthVoice } from "./voice.js";

export type { PolySynthOptions, SynthPatch, WaveForm } from "./params.js";
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

  setRelease(value: number): void {
    this.patch = withRelease(this.patch, value);
  }

  setUnisonVoices(value: number): void {
    this.patch = withUnisonVoices(this.patch, value);
  }

  setUnisonDetuneCents(value: number): void {
    this.patch = withUnisonDetuneCents(this.patch, value);
    this.voices.forEachVoice((voice) => {
      voice.setUnisonDetuneCents(this.patch.voice.osc.unisonDetuneCents);
    });
  }

  setMaxVoices(value: number): void {
    this.patch = withMaxVoices(this.patch, value);
    this.voices.setMaxVoices(this.patch.global.maxVoices, this.ctx.currentTime);
  }

  setModRoutes(routes: readonly ModRoute[]): void {
    this.modMatrix.setRoutes(routes);
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
