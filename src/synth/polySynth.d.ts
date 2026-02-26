export type WaveForm = "sine" | "square" | "sawtooth" | "triangle";
interface PolySynthOptions {
    maxVoices: number;
    attack: number;
    release: number;
    masterGain: number;
    wave: WaveForm;
}
export declare class PolySynth {
    private readonly ctx;
    private readonly master;
    private readonly voices;
    private options;
    constructor(ctx: AudioContext, options?: Partial<PolySynthOptions>);
    resumeIfNeeded(): Promise<void>;
    setWave(wave: WaveForm): void;
    setMasterGain(value: number): void;
    noteOn(midi: number, velocity?: number): void;
    noteOff(midi: number): void;
    panic(): void;
}
export {};
//# sourceMappingURL=polySynth.d.ts.map