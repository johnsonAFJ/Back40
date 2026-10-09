// What becomes available at each level: anything in the market whose unlock
// level matches, any land expansion, and any neighbor who moves in.

import { PRODUCT_KINDS, productInfo, productsOf, type Product } from './catalog';
import { EXPANSIONS } from './data/expansions';
import { NEIGHBORS, NEIGHBOR_IDS, type NeighborId } from './data/neighbors';

export type Unlock =
  | Product
  | { readonly kind: 'expansion'; readonly size: number }
  | { readonly kind: 'neighbor'; readonly id: NeighborId };

const PRODUCTS: readonly Product[] = PRODUCT_KINDS.flatMap(productsOf);

// The starting farm isn't an unlock; every expansion after it is.
const LAND = EXPANSIONS.slice(1);

function levelOf(u: Unlock): number {
  switch (u.kind) {
    case 'expansion':
      return LAND.find((e) => e.size === u.size)?.level ?? Infinity;
    case 'neighbor':
      return NEIGHBORS[u.id].movesInAt;
    default:
      return productInfo(u).level;
  }
}

const ALL: readonly Unlock[] = [
  ...PRODUCTS,
  ...LAND.map((e): Unlock => ({ kind: 'expansion', size: e.size })),
  ...NEIGHBOR_IDS.map((id): Unlock => ({ kind: 'neighbor', id })),
];

export function unlocksAt(level: number): Unlock[] {
  return ALL.filter((u) => levelOf(u) === level);
}

// Everything unlocked by going from `from` to `to`, for the rare harvest
// that jumps two levels at once.
export function unlocksBetween(from: number, to: number): Unlock[] {
  const all: Unlock[] = [];
  for (let level = from + 1; level <= to; level++) all.push(...unlocksAt(level));
  return all;
}

// The next level above `level` that unlocks anything, or null when there's
// nothing left to unlock.
export function nextUnlockLevel(level: number): number | null {
  const later = ALL.map(levelOf).filter((l) => l > level);
  return later.length > 0 ? Math.min(...later) : null;
}

export function isUnlocked(p: Product, level: number): boolean {
  return productInfo(p).level <= level;
}
