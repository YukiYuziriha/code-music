import {
  createVoiceBlocks,
  type MorphChain,
  scheduleAmpEnvelopeStart,
  scheduleAmpRelease,
  unisonGainScale,
} from "./blocks.js";
import { getLfoPhaseAtTime, sampleLfoShape } from "./lfo.js";
import type { ModRoute } from "./matrix.js";
import { resolveTargetValue } from "./modulation.js";
import type {
  LfoMode,
  LfoPoint,
  OscMorphMode,
  SynthPatch,
  WaveForm,
} from "./params.js";
import { clamp01, midiToHz } from "./utils.js";

interface SynthVoiceOptions {
  ctx: AudioContext;
  output: AudioNode;
  patch: SynthPatch;
  modRoutes: readonly ModRoute[];
  midi: number;
  velocity: number;
  onEnded: (midi: number) => void;
}

type VoiceState = "idle" | "active" | "released" | "stopped";

interface UnisonStack {
  readonly oscs: OscillatorNode[];
  readonly mix: GainNode;
}

const EPSILON_SECONDS = 1e-6;
const UNISON_CROSSFADE_SECONDS = 0.012;
const MODULATION_TICK_MS = 16;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const getPreReleaseEnvLevel = (
  elapsed: number,
  env: SynthPatch["voice"]["ampEnv"],
): number => {
  const safeElapsed = Math.max(0, elapsed);
  const delayEnd = env.delay;
  const attackEnd = delayEnd + env.attack;
  const holdEnd = attackEnd + env.hold;
  const decayEnd = holdEnd + env.decay;

  if (safeElapsed < delayEnd) return 0;

  if (safeElapsed < attackEnd) {
    if (env.attack <= EPSILON_SECONDS) return 1;
    const attackProgress = (safeElapsed - delayEnd) / env.attack;
    return clamp(attackProgress, 0, 1);
  }

  if (safeElapsed < holdEnd) return 1;

  if (safeElapsed < decayEnd) {
    if (env.decay <= EPSILON_SECONDS) return env.sustain;
    const decayProgress = (safeElapsed - holdEnd) / env.decay;
    return 1 + (env.sustain - 1) * clamp(decayProgress, 0, 1);
  }

  return env.sustain;
};

const buildUnisonOffsets = (voices: number, detuneCents: number): number[] => {
  if (voices <= 1 || detuneCents <= 0) {
    return [0];
  }

  const center = (voices - 1) / 2;
  const scale = center === 0 ? 0 : 1 / center;
  const offsets: number[] = [];
  for (let index = 0; index < voices; index += 1) {
    offsets.push((index - center) * scale * detuneCents);
  }
  return offsets;
};

export class SynthVoice {
  readonly midi: number;

  private readonly ctx: AudioContext;
  private patch: SynthPatch;
  private readonly velocity: number;
  private readonly morph: MorphChain;
  private readonly amp: GainNode;
  private readonly onEnded: (midi: number) => void;
  private readonly lifecycleOsc: OscillatorNode;

  private activeStack: UnisonStack;
  private readonly retiringStacks = new Set<UnisonStack>();
  private readonly retireTimeouts = new Set<ReturnType<typeof setTimeout>>();

  private modRoutes: readonly ModRoute[];
  private noteOnTime = 0;
  private releasedAt: number | null = null;
  private releaseStartEnvLevel = 0;
  private currentModUnisonDetune = 0;
  private currentModUnisonVoices = 1;
  private modulationTimer: ReturnType<typeof setInterval> | null = null;
  private state: VoiceState = "idle";

  constructor(options: SynthVoiceOptions) {
    this.midi = options.midi;
    this.ctx = options.ctx;
    this.patch = options.patch;
    this.modRoutes = options.modRoutes;
    this.velocity = clamp01(options.velocity);
    this.onEnded = options.onEnded;

    const blocks = createVoiceBlocks({
      ctx: options.ctx,
      midi: options.midi,
      patch: this.patch,
      output: options.output,
    });

    this.activeStack = {
      oscs: blocks.oscs,
      mix: blocks.oscMix,
    };
    this.morph = blocks.morph;
    this.amp = blocks.amp;

    const lifecycleOsc = this.ctx.createOscillator();
    lifecycleOsc.frequency.setValueAtTime(0, this.ctx.currentTime);
    this.lifecycleOsc = lifecycleOsc;

    this.currentModUnisonDetune = this.patch.voice.osc.unisonDetuneCents;
    this.currentModUnisonVoices = Math.max(1, this.activeStack.oscs.length);

    this.lifecycleOsc.onended = () => {
      if (this.state === "stopped") return;
      this.state = "stopped";
      this.stopModulationTimer();
      this.clearRetireTimeouts();
      this.disconnectStack(this.activeStack);
      for (const stack of this.retiringStacks) {
        this.disconnectStack(stack);
      }
      this.retiringStacks.clear();
      this.amp.disconnect();
      this.onEnded(this.midi);
    };
  }

  start(now: number): void {
    if (this.state !== "idle") return;

    this.noteOnTime = now;
    this.releasedAt = null;
    this.releaseStartEnvLevel = 0;
    this.refreshModulation(now);

    scheduleAmpEnvelopeStart(
      this.amp,
      now,
      this.velocity * unisonGainScale(this.patch.voice.osc.unisonVoices),
      this.patch.voice.ampEnv,
    );
    this.lifecycleOsc.start(now);
    for (const osc of this.activeStack.oscs) {
      osc.start(now);
    }
    this.startModulationTimer();
    this.state = "active";
  }

  release(now: number): void {
    if (this.state !== "active") return;

    this.releaseStartEnvLevel = this.getEnvLevelAt(now);
    this.releasedAt = now;
    this.refreshModulation(now);

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

    for (const stack of this.allStacks()) {
      for (const osc of stack.oscs) {
        osc.type = wave;
      }
    }
  }

  setUnisonVoices(unisonVoices: number): void {
    this.patch = {
      ...this.patch,
      voice: {
        ...this.patch.voice,
        osc: {
          ...this.patch.voice.osc,
          unisonVoices,
        },
      },
    };

    this.refreshModulation(this.ctx.currentTime);
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

    this.refreshModulation(this.ctx.currentTime);
  }

  setModRoutes(routes: readonly ModRoute[], now: number): void {
    this.modRoutes = routes;
    this.refreshModulation(now);
  }

  setLfoMode(mode: LfoMode, now: number): void {
    this.patch = {
      ...this.patch,
      voice: {
        ...this.patch.voice,
        lfo: {
          ...this.patch.voice.lfo,
          mode,
        },
      },
    };

    if (mode !== "sync") {
      this.noteOnTime = now;
    }
    this.refreshModulation(now);
  }

  setLfoRateHz(rateHz: number): void {
    this.patch = {
      ...this.patch,
      voice: {
        ...this.patch.voice,
        lfo: {
          ...this.patch.voice.lfo,
          rateHz,
        },
      },
    };

    this.refreshModulation(this.ctx.currentTime);
  }

  setLfoPhaseOffset(phaseOffset: number): void {
    this.patch = {
      ...this.patch,
      voice: {
        ...this.patch.voice,
        lfo: {
          ...this.patch.voice.lfo,
          phaseOffset,
        },
      },
    };

    this.refreshModulation(this.ctx.currentTime);
  }

  setLfoPoints(points: readonly LfoPoint[]): void {
    this.patch = {
      ...this.patch,
      voice: {
        ...this.patch.voice,
        lfo: {
          ...this.patch.voice.lfo,
          points,
        },
      },
    };

    this.refreshModulation(this.ctx.currentTime);
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
    for (const stack of this.allStacks()) {
      for (const osc of stack.oscs) {
        try {
          osc.stop(time);
        } catch {
          continue;
        }
      }
    }

    try {
      this.lifecycleOsc.stop(time);
    } catch {
      return;
    }
  }

  private getEnvLevelAt(now: number): number {
    const elapsedSinceOn = Math.max(0, now - this.noteOnTime);

    if (this.releasedAt === null) {
      return getPreReleaseEnvLevel(elapsedSinceOn, this.patch.voice.ampEnv);
    }

    const elapsedSinceRelease = Math.max(0, now - this.releasedAt);
    const releaseTime = Math.max(0, this.patch.voice.ampEnv.release);
    if (releaseTime <= EPSILON_SECONDS) return 0;

    const releaseProgress = clamp(elapsedSinceRelease / releaseTime, 0, 1);
    return this.releaseStartEnvLevel * (1 - releaseProgress);
  }

  private refreshModulation(now: number): void {
    if (this.state === "stopped") return;

    const envValue = this.getEnvLevelAt(now);
    const lfoValue = this.getLfoLevelAt(now);
    const targetDetune = resolveTargetValue(
      this.modRoutes,
      "osc.unisonDetuneCents",
      this.patch.voice.osc.unisonDetuneCents,
      { env1: envValue, lfo1: lfoValue },
    );
    const targetVoices = Math.round(
      resolveTargetValue(
        this.modRoutes,
        "osc.unisonVoices",
        this.patch.voice.osc.unisonVoices,
        { env1: envValue, lfo1: lfoValue },
      ),
    );

    if (targetVoices !== this.currentModUnisonVoices) {
      this.rebuildUnisonStack(targetVoices, targetDetune, now);
    } else {
      this.applyUnisonDetuneToStack(this.activeStack, targetDetune, now, true);
    }

    this.currentModUnisonDetune = targetDetune;
  }

  private getLfoLevelAt(now: number): number {
    const lfo = this.patch.voice.lfo;
    const phase = getLfoPhaseAtTime(
      lfo.mode,
      lfo.rateHz,
      lfo.phaseOffset,
      now,
      this.noteOnTime,
    );
    const bipolar = sampleLfoShape(lfo.points, phase);
    return clamp((bipolar + 1) * 0.5, 0, 1);
  }

  private rebuildUnisonStack(
    targetVoices: number,
    targetDetune: number,
    now: number,
  ): void {
    const voices = clamp(Math.round(targetVoices), 1, 16);
    const oldStack = this.activeStack;
    const nextStack = this.createUnisonStack(voices, targetDetune, now, 0);

    for (const osc of nextStack.oscs) {
      osc.start(now);
    }

    nextStack.mix.gain.setValueAtTime(0, now);
    nextStack.mix.gain.linearRampToValueAtTime(
      1,
      now + UNISON_CROSSFADE_SECONDS,
    );

    oldStack.mix.gain.cancelScheduledValues(now);
    oldStack.mix.gain.setValueAtTime(oldStack.mix.gain.value, now);
    oldStack.mix.gain.linearRampToValueAtTime(
      0,
      now + UNISON_CROSSFADE_SECONDS,
    );

    this.activeStack = nextStack;
    this.currentModUnisonVoices = voices;
    this.retiringStacks.add(oldStack);

    const timeoutId = setTimeout(
      () => {
        this.retiringStacks.delete(oldStack);
        for (const osc of oldStack.oscs) {
          try {
            osc.stop(this.ctx.currentTime + 0.001);
          } catch {
            continue;
          }
        }
        this.disconnectStack(oldStack);
        this.retireTimeouts.delete(timeoutId);
      },
      Math.ceil((UNISON_CROSSFADE_SECONDS + 0.03) * 1000),
    );
    this.retireTimeouts.add(timeoutId);
  }

  private applyUnisonDetuneToStack(
    stack: UnisonStack,
    unisonDetuneCents: number,
    now: number,
    smooth: boolean,
  ): void {
    const offsets = buildUnisonOffsets(stack.oscs.length, unisonDetuneCents);
    for (let index = 0; index < stack.oscs.length; index += 1) {
      const osc = stack.oscs[index];
      if (osc === undefined) continue;
      const detune = this.patch.voice.osc.detuneCents + (offsets[index] ?? 0);
      if (smooth) {
        osc.detune.linearRampToValueAtTime(detune, now + 0.02);
      } else {
        osc.detune.setValueAtTime(detune, now);
      }
    }
  }

  private createUnisonStack(
    voices: number,
    unisonDetuneCents: number,
    now: number,
    initialGain: number,
  ): UnisonStack {
    const mix = this.ctx.createGain();
    mix.gain.setValueAtTime(initialGain, now);
    mix.connect(this.morph.input);

    const offsets = buildUnisonOffsets(voices, unisonDetuneCents);
    const oscs = offsets.map((offset) => {
      const osc = this.ctx.createOscillator();
      osc.type = this.patch.voice.osc.wave;
      osc.frequency.setValueAtTime(midiToHz(this.midi), now);
      osc.detune.setValueAtTime(this.patch.voice.osc.detuneCents + offset, now);
      osc.connect(mix);
      return osc;
    });

    return { oscs, mix };
  }

  private disconnectStack(stack: UnisonStack): void {
    for (const osc of stack.oscs) {
      try {
        osc.disconnect();
      } catch {
        continue;
      }
    }
    try {
      stack.mix.disconnect();
    } catch {
      return;
    }
  }

  private allStacks(): readonly UnisonStack[] {
    return [this.activeStack, ...this.retiringStacks];
  }

  private startModulationTimer(): void {
    if (this.modulationTimer !== null) return;
    this.modulationTimer = setInterval(() => {
      if (this.state === "stopped") return;
      this.refreshModulation(this.ctx.currentTime);
    }, MODULATION_TICK_MS);
  }

  private stopModulationTimer(): void {
    if (this.modulationTimer === null) return;
    clearInterval(this.modulationTimer);
    this.modulationTimer = null;
  }

  private clearRetireTimeouts(): void {
    for (const timeoutId of this.retireTimeouts) {
      clearTimeout(timeoutId);
    }
    this.retireTimeouts.clear();
  }
}
