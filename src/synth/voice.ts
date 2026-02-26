import {
  createVoiceBlocks,
  scheduleAmpAttack,
  scheduleAmpRelease,
} from "./blocks.js";
import type { SynthPatch, WaveForm } from "./params.js";
import { clamp01 } from "./utils.js";

interface SynthVoiceOptions {
  ctx: AudioContext;
  output: AudioNode;
  patch: SynthPatch;
  midi: number;
  velocity: number;
  onEnded: (midi: number) => void;
}

type VoiceState = "idle" | "active" | "released" | "stopped";

export class SynthVoice {
  readonly midi: number;

  private patch: SynthPatch;
  private readonly velocity: number;
  private readonly osc: OscillatorNode;
  private readonly amp: GainNode;
  private readonly onEnded: (midi: number) => void;
  private state: VoiceState = "idle";

  constructor(options: SynthVoiceOptions) {
    this.midi = options.midi;
    this.patch = options.patch;
    this.velocity = clamp01(options.velocity);
    this.onEnded = options.onEnded;

    const blocks = createVoiceBlocks({
      ctx: options.ctx,
      midi: options.midi,
      patch: this.patch,
      output: options.output,
    });

    this.osc = blocks.osc;
    this.amp = blocks.amp;

    this.osc.onended = () => {
      if (this.state === "stopped") return;
      this.state = "stopped";
      this.osc.disconnect();
      this.amp.disconnect();
      this.onEnded(this.midi);
    };
  }

  start(now: number): void {
    if (this.state !== "idle") return;

    scheduleAmpAttack(
      this.amp,
      now,
      this.velocity,
      this.patch.voice.ampEnv.attack,
    );
    this.osc.start(now);
    this.state = "active";
  }

  release(now: number): void {
    if (this.state !== "active") return;

    const end = scheduleAmpRelease(
      this.amp,
      now,
      this.patch.voice.ampEnv.release,
    );
    this.stopAt(end + 0.02);
    this.state = "released";
  }

  forceStop(now: number): void {
    if (this.state === "stopped") return;

    this.amp.gain.cancelScheduledValues(now);
    this.amp.gain.setValueAtTime(0, now);
    this.stopAt(now + 0.001);
    this.state = "released";
  }

  setWave(wave: WaveForm): void {
    this.patch = {
      ...this.patch,
      voice: {
        ...this.patch.voice,
        osc: {
          ...this.patch.voice.osc,
          wave,
        },
      },
    };
    this.osc.type = wave;
  }

  private stopAt(time: number): void {
    try {
      this.osc.stop(time);
    } catch {
      return;
    }
  }
}
