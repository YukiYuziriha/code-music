import {
  createVoiceBlocks,
  type MorphChain,
  scheduleAmpAttack,
  scheduleAmpRelease,
  unisonGainScale,
} from "./blocks.js";
import type { OscMorphMode, SynthPatch, WaveForm } from "./params.js";
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

  private readonly ctx: AudioContext;
  private patch: SynthPatch;
  private readonly velocity: number;
  private readonly oscs: OscillatorNode[];
  private readonly morph: MorphChain;
  private readonly amp: GainNode;
  private readonly onEnded: (midi: number) => void;
  private state: VoiceState = "idle";

  constructor(options: SynthVoiceOptions) {
    this.midi = options.midi;
    this.ctx = options.ctx;
    this.patch = options.patch;
    this.velocity = clamp01(options.velocity);
    this.onEnded = options.onEnded;

    const blocks = createVoiceBlocks({
      ctx: options.ctx,
      midi: options.midi,
      patch: this.patch,
      output: options.output,
    });

    this.oscs = blocks.oscs;
    this.morph = blocks.morph;
    this.amp = blocks.amp;

    const leadOsc = this.oscs[0];
    if (!leadOsc) {
      throw new Error("voice created without oscillators");
    }

    leadOsc.onended = () => {
      if (this.state === "stopped") return;
      this.state = "stopped";
      for (const osc of this.oscs) {
        osc.disconnect();
      }
      this.amp.disconnect();
      this.onEnded(this.midi);
    };
  }

  start(now: number): void {
    if (this.state !== "idle") return;

    scheduleAmpAttack(
      this.amp,
      now,
      this.velocity * unisonGainScale(this.patch.voice.osc.unisonVoices),
      this.patch.voice.ampEnv.attack,
    );
    for (const osc of this.oscs) {
      osc.start(now);
    }
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
    for (const osc of this.oscs) {
      osc.type = wave;
    }
  }

  setUnisonDetuneCents(unisonDetuneCents: number): void {
    this.patch = {
      ...this.patch,
      voice: {
        ...this.patch.voice,
        osc: {
          ...this.patch.voice.osc,
          unisonDetuneCents,
        },
      },
    };

    const count = this.oscs.length;
    const center = (count - 1) / 2;
    const scale = center === 0 ? 0 : 1 / center;
    const now = this.ctx.currentTime;

    for (let index = 0; index < count; index += 1) {
      const normalized = (index - center) * scale;
      const detune =
        this.patch.voice.osc.detuneCents + normalized * unisonDetuneCents;
      this.oscs[index]?.detune.setValueAtTime(detune, now);
    }
  }

  setMorphMode(mode: OscMorphMode): void {
    this.patch = {
      ...this.patch,
      voice: {
        ...this.patch.voice,
        osc: {
          ...this.patch.voice.osc,
          morphMode: mode,
        },
      },
    };

    this.morph.setMode(mode, this.ctx.currentTime);
  }

  private stopAt(time: number): void {
    for (const osc of this.oscs) {
      try {
        osc.stop(time);
      } catch {
        continue;
      }
    }
  }
}
