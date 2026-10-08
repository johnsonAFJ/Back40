// Trees, animals and decorations, from SPEC.md. Starting values, ours rather
// than documented; tune freely.
//
// Trees and animals produce on a repeating timer and never wither.
// Decorations just sit there looking nice, and pay their XP once, when bought.

export type Producer = {
  readonly name: string;
  readonly level: number;
  readonly price: number;
  readonly buyXp: number;
  readonly product: string;
  readonly hours: number;
  readonly sells: number;
};

export const TREES = {
  appleTree: { name: 'Apple tree', level: 1, price: 50, buyXp: 1, product: 'apples', hours: 72, sells: 30 },
  cherryTree: { name: 'Cherry tree', level: 3, price: 120, buyXp: 1, product: 'cherries', hours: 72, sells: 45 },
  lemonTree: { name: 'Lemon tree', level: 6, price: 200, buyXp: 2, product: 'lemons', hours: 72, sells: 60 },
  orangeTree: { name: 'Orange tree', level: 9, price: 300, buyXp: 3, product: 'oranges', hours: 72, sells: 75 },
  peachTree: { name: 'Peach tree', level: 13, price: 450, buyXp: 4, product: 'peaches', hours: 96, sells: 110 },
  plumTree: { name: 'Plum tree', level: 17, price: 650, buyXp: 6, product: 'plums', hours: 96, sells: 140 },
} as const satisfies Record<string, Producer>;

export const ANIMALS = {
  chicken: { name: 'Chicken', level: 2, price: 60, buyXp: 1, product: 'eggs', hours: 24, sells: 15 },
  cow: { name: 'Cow', level: 5, price: 250, buyXp: 2, product: 'milk', hours: 24, sells: 50 },
  sheep: { name: 'Sheep', level: 8, price: 400, buyXp: 4, product: 'wool', hours: 72, sells: 120 },
  pig: { name: 'Pig', level: 11, price: 600, buyXp: 6, product: 'truffles', hours: 48, sells: 140 },
  horse: { name: 'Horse', level: 15, price: 900, buyXp: 9, product: 'hair', hours: 72, sells: 260 },
} as const satisfies Record<string, Producer>;

export type Decoration = {
  readonly name: string;
  readonly level: number;
  readonly price: number;
  readonly buyXp: number;
  readonly width: number;
  readonly depth: number;
  // Fences and paths join up with matching neighbors on adjacent tiles.
  readonly connects: boolean;
};

export const DECORATIONS = {
  hayBale: { name: 'Hay bale', level: 1, price: 100, buyXp: 1, width: 1, depth: 1, connects: false },
  whiteFence: { name: 'White fence', level: 1, price: 50, buyXp: 1, width: 1, depth: 1, connects: true },
  picketFence: { name: 'Picket fence', level: 3, price: 75, buyXp: 1, width: 1, depth: 1, connects: true },
  dirtPath: { name: 'Dirt path', level: 1, price: 20, buyXp: 1, width: 1, depth: 1, connects: true },
  flowerPot: { name: 'Flower pot', level: 4, price: 150, buyXp: 2, width: 1, depth: 1, connects: false },
  scarecrow: { name: 'Scarecrow', level: 6, price: 300, buyXp: 3, width: 1, depth: 1, connects: false },
  wheelbarrow: { name: 'Wheelbarrow', level: 8, price: 400, buyXp: 4, width: 1, depth: 1, connects: false },
  waterPump: { name: 'Water pump', level: 12, price: 1_000, buyXp: 10, width: 1, depth: 1, connects: false },
  shed: { name: 'Shed', level: 15, price: 5_000, buyXp: 50, width: 2, depth: 2, connects: false },
  redBarn: { name: 'Red barn', level: 20, price: 20_000, buyXp: 200, width: 3, depth: 3, connects: false },
} as const satisfies Record<string, Decoration>;

export type TreeId = keyof typeof TREES;
export type AnimalId = keyof typeof ANIMALS;
export type DecorationId = keyof typeof DECORATIONS;

// Selling a tree, animal or decoration returns this share of its price.
export const SELL_BACK = 0.05;

// Object.keys loses the literal key types; these restore them for each table.
export const TREE_IDS = Object.keys(TREES) as TreeId[];
export const ANIMAL_IDS = Object.keys(ANIMALS) as AnimalId[];
export const DECORATION_IDS = Object.keys(DECORATIONS) as DecorationId[];

export const isTreeId = (v: unknown): v is TreeId => typeof v === 'string' && Object.hasOwn(TREES, v);
export const isAnimalId = (v: unknown): v is AnimalId => typeof v === 'string' && Object.hasOwn(ANIMALS, v);
export const isDecorationId = (v: unknown): v is DecorationId => typeof v === 'string' && Object.hasOwn(DECORATIONS, v);
