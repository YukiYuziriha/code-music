# Roadmap

## Core Synth Blocks (Must-Have)

### Oscillator

- Stable phase behavior with optional phase reset on note-on
- Essential waveforms and wavetable position control
- Coarse/fine tune, octave/semitone, unison detune/spread
- Noise source mix for percussive textures

### Envelope

- Fast, snappy timing (drum-capable attack/decay)
- Exponential/curved segments (not only linear)
- Assignable amp envelope and modulation envelope
- Retrigger behavior that is predictable in mono/legato

### Filter

- Musical LP/HP/BP modes with reliable resonance
- Keytracking support
- Envelope amount to cutoff (and optionally resonance)
- Pre/post drive option for tone shaping

### LFO

- Free-rate and tempo-sync modes
- One-shot and looping behavior
- Assignable phase/start behavior
- Flexible routing depth to core targets

### Randomizer

- Per-note subtle random modulation (humanization)
- Assignable to pitch/cutoff/decay/level with amount limits
- Optional sample-and-hold style random source
- Deterministic seed option for reproducibility

## Cross-Block Essentials

- Mod matrix (Env/LFO/Velocity/Random -> multiple targets)
- Mono/legato/glide voice behavior for bass
- Saturation/clip stage for weight and character
- Clean gain staging and anti-aliasing-minded oscillator/filter behavior

## Oscillator Spectral Morph Modes (Priority by Impact)

### Must-Have (High impact, high production use)

- Low Pass
- High Pass
- Formant Scale
- Harmonic Stretch

### Strong Add (Medium-high impact)

- Inharmonic Stretch
- Smear
- Phase Disperse

### Nice-to-Have (Medium impact, style-dependent)

- Vocode
- Random Amplitudes
- Shepard Tone

### Coverage / Meh (Lower day-to-day use)

- Spectral Time Skew
- None
