// Farm sizes and what each expansion requires. See SPEC.md, "Expansions".

export type Expansion = {
  readonly size: number;
  readonly level: number;
  readonly neighbors: number;
  readonly coins: number;
};

export const EXPANSIONS = [
  { size: 12, level: 1, neighbors: 0, coins: 0 },
  { size: 14, level: 5, neighbors: 1, coins: 2_000 },
  { size: 16, level: 10, neighbors: 2, coins: 10_000 },
  { size: 18, level: 15, neighbors: 3, coins: 30_000 },
  { size: 20, level: 20, neighbors: 4, coins: 75_000 },
  { size: 22, level: 25, neighbors: 5, coins: 150_000 },
] as const satisfies readonly [Expansion, ...Expansion[]];

export const STARTING_FARM_SIZE = EXPANSIONS[0].size;
