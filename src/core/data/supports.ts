// Things climbing crops grow on. A support is bought and placed like a
// decoration, but it's a plot: climbing crops grow on it and nowhere else,
// and nothing else grows on it. After a harvest it's ready to plant again,
// with no plowing. Our own addition; see DESIGN.md "Departures".

import type { CropId } from './crops';

export type Support = {
  readonly name: string;
  readonly level: number;
  readonly price: number;
  readonly buyXp: number;
};

export const SUPPORTS = {
  // Unlocks with grapes, the first climbing crop.
  trellis: { name: 'Trellis', level: 15, price: 100, buyXp: 1 },
} as const satisfies Record<string, Support>;

export type SupportId = keyof typeof SUPPORTS;

// Object.keys loses the literal key types; this restores them.
export const SUPPORT_IDS = Object.keys(SUPPORTS) as SupportId[];

export const isSupportId = (v: unknown): v is SupportId => typeof v === 'string' && Object.hasOwn(SUPPORTS, v);

// Crops that need a support to grow on.
export const CLIMBING_CROPS: ReadonlySet<CropId> = new Set<CropId>(['grapes']);
