// What trees and animals give, and what each piece sells for from the
// basket. Starting values, ours rather than documented.

export type Produce = {
  // Plural and lowercase, for sentences: "12 eggs", "apples ready".
  readonly name: string;
  readonly single: string;
  readonly sells: number;
};

export const PRODUCE = {
  apples: { name: 'apples', single: 'apple', sells: 30 },
  cherries: { name: 'cherries', single: 'cherry', sells: 45 },
  lemons: { name: 'lemons', single: 'lemon', sells: 60 },
  oranges: { name: 'oranges', single: 'orange', sells: 75 },
  peaches: { name: 'peaches', single: 'peach', sells: 110 },
  plums: { name: 'plums', single: 'plum', sells: 140 },
  eggs: { name: 'eggs', single: 'egg', sells: 15 },
  milk: { name: 'milk', single: 'milk', sells: 50 },
  wool: { name: 'wool', single: 'wool', sells: 120 },
  truffles: { name: 'truffles', single: 'truffle', sells: 140 },
  hair: { name: 'horsehair', single: 'horsehair', sells: 260 },
} as const satisfies Record<string, Produce>;

export type ProduceId = keyof typeof PRODUCE;

// Object.keys loses the literal key types; this restores them.
export const PRODUCE_IDS = Object.keys(PRODUCE) as ProduceId[];

export const isProduceId = (v: unknown): v is ProduceId => typeof v === 'string' && Object.hasOwn(PRODUCE, v);
