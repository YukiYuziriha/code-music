export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export const clamp01 = (value: number): number => {
  return clamp(value, 0, 1);
};

export const midiToHz = (midi: number): number => {
  return 440 * 2 ** ((midi - 69) / 12);
};
