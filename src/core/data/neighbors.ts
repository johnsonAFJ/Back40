// The simulated neighbors, from SPEC.md "Neighbors". Each moves in at a set
// level and stays. Milestone 6 gives them farms, visits and gifts; for now
// they count toward land expansions.

import type { CropId } from './crops';

export type Neighbor = {
  readonly name: string;
  readonly movesInAt: number;
  readonly farm: string;
  // Portrait colors: background and hair.
  readonly color: string;
  readonly hair: string;
  // What shows up in their news ("June harvested 40 daffodils").
  readonly crops: readonly [CropId, ...CropId[]];
};

export const NEIGHBORS = {
  martha: {
    name: 'Martha',
    movesInAt: 3,
    farm: 'An old orchard, rows of fruit trees',
    color: '#e8a0a8',
    hair: '#d9d4cc',
    crops: ['strawberries', 'raspberries'],
  },
  gus: {
    name: 'Gus',
    movesInAt: 6,
    farm: 'A dairy with cows and a big red barn',
    color: '#8fb8de',
    hair: '#5a3a20',
    crops: ['wheat'],
  },
  june: {
    name: 'June',
    movesInAt: 10,
    farm: 'Flower fields in neat color bands',
    color: '#c7a3e0',
    hair: '#b5432f',
    crops: ['lilac', 'daffodils', 'redTulips', 'pinkRoses', 'morningGlory'],
  },
  earl: {
    name: 'Earl',
    movesInAt: 15,
    farm: 'Wheat, soybeans and cotton as far as the eye can see',
    color: '#e3c27a',
    hair: '#8a8a8a',
    crops: ['wheat', 'soybeans', 'cotton'],
  },
  pearl: {
    name: 'Pearl',
    movesInAt: 20,
    farm: 'A tidy hobby farm with every decoration she can find',
    color: '#9fd3b0',
    hair: '#2e2e2e',
    crops: ['tomatoes', 'blueberries', 'pumpkin'],
  },
} as const satisfies Record<string, Neighbor>;

export type NeighborId = keyof typeof NEIGHBORS;

// Object.keys loses the literal key types; this restores them.
export const NEIGHBOR_IDS = Object.keys(NEIGHBORS) as NeighborId[];
