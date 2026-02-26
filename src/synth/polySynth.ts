export type WaveForm = "sine" | "square" | "sawtooth" | "triangle";

interface Voice {
  osc: OscillatorNode;
  amp: GainNode;
  midi: number;
}

interface PolySynthOptions {
  maxVoices: number;
  attack: number;
  release: number;
  masterGain: number;
  wave: WaveForm;
}

const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const DEFAULTS: PolySynthOptions = {
  maxVoices: 8,
  attack: 0.01,
  release: 0.15,
  masterGain: 0.2,
  wave: "sawtooth",
};

export class PolySynth {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly voices = new Map<number, Voice>();
  private options: PolySynthOptions;

  constructor(ctx: AudioContext, options?: Partial<PolySynthOptions>) {
    this.ctx = ctx;
    this.options = { ...DEFAULTS, ...options };

    this.master = this.ctx.createGain();
    this.master.gain.value = this.options.masterGain;
    this.master.connect(this.ctx.destination);
  }

  async resumeIfNeeded(): Promise<void> {
    if (this.ctx.state !== "running") {
      await this.ctx.resume();
    }
  }

  setWave(wave: WaveForm): void {
    this.options.wave = wave;
  }

  setMasterGain(value: number): void {
    const next = Math.max(0, Math.min(1, value));
    this.master.gain.setValueAtTime(next, this.ctx.currentTime);
  }

  noteOn(midi: number, velocity = 1): void {
    if (this.voices.has(midi)) return;

    if (this.voices.size >= this.options.maxVoices) {
      const oldest = this.voices.keys().next().value as number | undefined;
      if (oldest !== undefined) this.noteOff(oldest);
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();

    osc.type = this.options.wave;
    osc.frequency.setValueAtTime(midiToHz(midi), now);

    const target = Math.max(0, Math.min(1, velocity));
    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(target, now + this.options.attack);

    osc.connect(amp);
    amp.connect(this.master);

    const voice: Voice = { osc, amp, midi };
    this.voices.set(midi, voice);

    osc.onended = () => {
      this.voices.delete(midi);
      osc.disconnect();
      amp.disconnect();
    };

    osc.start(now);
  }

  noteOff(midi: number): void {
    const voice = this.voices.get(midi);
    if (!voice) return;

    const now = this.ctx.currentTime;
    const end = now + this.options.release;

    voice.amp.gain.cancelScheduledValues(now);
    voice.amp.gain.setValueAtTime(voice.amp.gain.value, now);
    voice.amp.gain.linearRampToValueAtTime(0, end);

    voice.osc.stop(end + 0.02);
  }

  panic(): void {
    const active = [...this.voices.keys()];
    for (const midi of active) this.noteOff(midi);
  }
}
