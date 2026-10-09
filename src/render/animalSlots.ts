// Where each animal stands within its square. A square is split into four
// quarters; a chicken takes one, a sheep or pig takes a half (two quarters
// side by side), and a cow or horse takes the whole square. Animals are laid
// out biggest first, then by id, so the same square always looks the same.
//
// This is only about drawing: the save just says which square each animal
// is on. When animals start to wander (milestone 7), these spots are where
// they wander from.

import { ANIMAL_SPACE } from '../core/data/items';
import type { AnimalObject, FarmObject } from '../core/state';

// A spot within a square, in tile fractions: (0.5, 0.5) is the middle.
export type Slot = { readonly u: number; readonly v: number };

const QUARTERS: readonly Slot[] = [
  { u: 0.3, v: 0.3 },
  { u: 0.72, v: 0.3 },
  { u: 0.3, v: 0.72 },
  { u: 0.72, v: 0.72 },
];
// The two halves, each a pair of quarters along the tile's x axis.
const HALVES: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [2, 3],
];
const MIDDLE: Slot = { u: 0.5, v: 0.5 };

function layout(animals: readonly AnimalObject[]): Map<string, Slot> {
  const slots = new Map<string, Slot>();
  if (animals.length === 1 && animals[0]) {
    slots.set(animals[0].id, MIDDLE);
    return slots;
  }
  const taken = [false, false, false, false];
  const sorted = [...animals].sort((a, b) => ANIMAL_SPACE[b.typeId] - ANIMAL_SPACE[a.typeId] || (a.id < b.id ? -1 : 1));
  for (const a of sorted) {
    const space = ANIMAL_SPACE[a.typeId];
    if (space >= 4) {
      slots.set(a.id, MIDDLE);
      continue;
    }
    if (space === 2) {
      const half = HALVES.find(([i, j]) => !taken[i] && !taken[j]) ?? HALVES[0];
      if (!half) continue;
      const [i, j] = half;
      taken[i] = taken[j] = true;
      const qi = QUARTERS[i] ?? MIDDLE;
      const qj = QUARTERS[j] ?? MIDDLE;
      slots.set(a.id, { u: (qi.u + qj.u) / 2, v: qi.v });
      continue;
    }
    const q = taken.findIndex((t) => !t);
    const index = q === -1 ? 0 : q;
    taken[index] = true;
    slots.set(a.id, QUARTERS[index] ?? MIDDLE);
  }
  return slots;
}

// Spots for every animal on the farm, keyed by id.
export function animalSlots(objects: readonly FarmObject[]): Map<string, Slot> {
  const bySquare = new Map<string, AnimalObject[]>();
  for (const o of objects) {
    if (o.kind !== 'animal') continue;
    const key = `${o.x},${o.y}`;
    bySquare.set(key, [...(bySquare.get(key) ?? []), o]);
  }
  const slots = new Map<string, Slot>();
  for (const animals of bySquare.values()) for (const [id, slot] of layout(animals)) slots.set(id, slot);
  return slots;
}
