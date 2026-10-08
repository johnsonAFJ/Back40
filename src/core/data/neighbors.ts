// The simulated neighbors, from SPEC.md "Neighbors". Each moves in at a set
// level and stays. Milestone 6 gives them farms, visits and gifts; for now
// they count toward land expansions.

export type Neighbor = {
  readonly name: string;
  readonly movesInAt: number;
  readonly farm: string;
};

export const NEIGHBORS = {
  martha: { name: 'Martha', movesInAt: 3, farm: 'An old orchard, rows of fruit trees' },
  gus: { name: 'Gus', movesInAt: 6, farm: 'A dairy with cows and a big red barn' },
  june: { name: 'June', movesInAt: 10, farm: 'Flower fields in neat color bands' },
  earl: { name: 'Earl', movesInAt: 15, farm: 'Corn and wheat as far as the eye can see' },
  pearl: { name: 'Pearl', movesInAt: 20, farm: 'A tidy hobby farm with every decoration she can find' },
} as const satisfies Record<string, Neighbor>;

export type NeighborId = keyof typeof NEIGHBORS;

// Object.keys loses the literal key types; this restores them.
export const NEIGHBOR_IDS = Object.keys(NEIGHBORS) as NeighborId[];
