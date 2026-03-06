import { MAX_UNISON_VOICES } from "./params.js";

export interface UnisonLayout {
  readonly weights: number[];
  readonly offsets: number[];
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const lerp = (from: number, to: number, amount: number): number => {
  return from + (to - from) * amount;
};

export const buildUnisonOffsets = (
  voices: number,
  detuneCents: number,
): number[] => {
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

export const buildActivationOrder = (maxVoices: number): number[] => {
  const leftCenter = Math.floor((maxVoices - 1) / 2);
  const rightCenter = leftCenter + 1;
  const order: number[] = [leftCenter];

  if (rightCenter < maxVoices) {
    order.push(rightCenter);
  }

  for (let distance = 1; order.length < maxVoices; distance += 1) {
    const left = leftCenter - distance;
    const right = rightCenter + distance;
    if (left >= 0) order.push(left);
    if (right < maxVoices) order.push(right);
  }

  return order;
};

const UNISON_ACTIVATION_ORDER = buildActivationOrder(MAX_UNISON_VOICES);

export const buildIntegerUnisonLayout = (
  voices: number,
  detuneCents: number,
): UnisonLayout => {
  const safeVoices = clamp(Math.round(voices), 1, MAX_UNISON_VOICES);
  const activeIndices = UNISON_ACTIVATION_ORDER.slice(0, safeVoices).sort(
    (left, right) => left - right,
  );
  const offsets = new Array<number>(MAX_UNISON_VOICES).fill(0);
  const weights = new Array<number>(MAX_UNISON_VOICES).fill(0);
  const activeOffsets = buildUnisonOffsets(safeVoices, detuneCents);

  for (let index = 0; index < activeIndices.length; index += 1) {
    const slot = activeIndices[index];
    if (slot === undefined) continue;
    weights[slot] = 1;
    offsets[slot] = activeOffsets[index] ?? 0;
  }

  return { weights, offsets };
};

export const buildUnisonLayout = (
  voices: number,
  detuneCents: number,
): UnisonLayout => {
  const safeVoices = clamp(voices, 1, MAX_UNISON_VOICES);
  const lower = Math.floor(safeVoices);
  const upper = Math.ceil(safeVoices);
  const blend = safeVoices - lower;

  if (upper === lower) {
    return buildIntegerUnisonLayout(lower, detuneCents);
  }

  const lowerLayout = buildIntegerUnisonLayout(lower, detuneCents);
  const upperLayout = buildIntegerUnisonLayout(upper, detuneCents);

  return {
    weights: lowerLayout.weights.map((weight, index) => {
      return lerp(weight, upperLayout.weights[index] ?? 0, blend);
    }),
    offsets: lowerLayout.offsets.map((offset, index) => {
      return lerp(offset, upperLayout.offsets[index] ?? 0, blend);
    }),
  };
};
