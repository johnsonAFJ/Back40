// The neighbors' farms. Each is laid out by hand in code and never saved:
// it's rebuilt whenever you visit. Each crop sits at its own stage for the
// whole day, from seeded randomness keyed by the day, so a visit looks a
// little different every day without anything being stored. They never
// ripen while you watch, so there's always something growing to help with.

import { CROPS, type CropId } from './data/crops';
import { CLIMBING_CROPS } from './data/supports';
import { HOUR } from './clock';
import type { AnimalId, DecorationId, TreeId } from './data/items';
import type { NeighborId } from './data/neighbors';
import { random01 } from './rng';
import { SAVE_VERSION, footprint, type FarmObject, type FarmState } from './state';

const SIZE = 16;
// Their farms are all 16 x 16, which is expansion 2.
const EXPANSION = 2;

// Collects objects for a farm, skipping any that would overlap one already
// placed or hang off the edge, so the layouts below can be written loosely.
class Builder {
  readonly objects: FarmObject[] = [];
  private readonly taken = new Set<string>();
  private next = 1;

  constructor(
    private readonly prefix: string,
    private readonly plantedAt: (x: number, y: number, crop: CropId) => number,
  ) {}

  private add(obj: FarmObject): void {
    const { width, depth } = footprint(obj);
    const tiles: string[] = [];
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < depth; dy++) {
        const x = obj.x + dx;
        const y = obj.y + dy;
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || this.taken.has(`${x},${y}`)) return;
        tiles.push(`${x},${y}`);
      }
    }
    for (const t of tiles) this.taken.add(t);
    this.objects.push(obj);
  }

  private id(): string {
    return `${this.prefix}-${this.next++}`;
  }

  house(x: number, y: number): void {
    this.add({ id: this.id(), kind: 'building', typeId: 'farmhouse', x, y });
  }

  plot(x: number, y: number, cropId: CropId): void {
    const plantedAt = this.plantedAt(x, y, cropId);
    // Neighbors' crops never wither while you're looking at them.
    const witherAt = plantedAt + 1000 * HOUR;
    // Climbing crops stand on a trellis, as they would on your farm.
    const support = CLIMBING_CROPS.has(cropId) ? 'trellis' : null;
    this.add({ id: this.id(), kind: 'plot', support, x, y, state: 'planted', cropId, plantedAt, witherAt, fertilized: false });
  }

  // Neighbors' trees always show fruit, which is the point of an orchard.
  // Their animals never show anything ready, so the only bubble over one is
  // the hungry one you can help with.
  tree(x: number, y: number, typeId: TreeId): void {
    this.add({ id: this.id(), kind: 'tree', typeId, x, y, lastHarvestAt: 0 });
  }

  animal(x: number, y: number, typeId: AnimalId): void {
    this.add({ id: this.id(), kind: 'animal', typeId, x, y, lastHarvestAt: Number.MAX_SAFE_INTEGER });
  }

  deco(x: number, y: number, typeId: DecorationId): void {
    this.add({ id: this.id(), kind: 'decoration', typeId, x, y });
  }
}

type Layout = (b: Builder) => void;

const LAYOUTS: Record<NeighborId, Layout> = {
  // An old orchard: rows of fruit trees, a few chickens, berry beds.
  martha: (b) => {
    b.house(0, 0);
    const trees: readonly TreeId[] = ['appleTree', 'cherryTree', 'peachTree', 'plumTree'];
    for (let y = 5; y < SIZE; y += 2) {
      for (let x = 4; x < SIZE; x += 2) b.tree(x, y, trees[((x + y) / 2) % trees.length] ?? 'appleTree');
    }
    for (let x = 5; x <= 13; x++) for (const y of [1, 2]) b.plot(x, y, x % 2 === 0 ? 'strawberries' : 'raspberries');
    for (const [x, y] of [[1, 5], [2, 7], [1, 9], [2, 11]] as const) b.animal(x, y, 'chicken');
  },
  // A dairy: a big red barn, a fenced pasture of cows, hay and wheat.
  gus: (b) => {
    b.house(0, 0);
    b.deco(5, 0, 'redBarn');
    for (const [x, y] of [[9, 1], [10, 1], [9, 2]] as const) b.deco(x, y, 'hayBale');
    for (let x = 3; x <= 11; x++) {
      b.deco(x, 5, 'whiteFence');
      b.deco(x, 14, 'whiteFence');
    }
    for (let y = 6; y <= 13; y++) {
      b.deco(3, y, 'whiteFence');
      b.deco(11, y, 'whiteFence');
    }
    for (const [x, y] of [[5, 7], [8, 7], [6, 9], [9, 10], [5, 12], [8, 12]] as const) b.animal(x, y, 'cow');
    for (let x = 13; x < SIZE; x++) for (let y = 2; y <= 13; y++) b.plot(x, y, 'wheat');
  },
  // Flower fields in neat color bands, with a path along the front.
  june: (b) => {
    b.house(0, 0);
    for (let x = 0; x < SIZE; x++) b.deco(x, 4, 'dirtPath');
    for (const [x, y] of [[4, 1], [5, 2], [4, 3]] as const) b.deco(x, y, 'flowerPot');
    const bands: readonly CropId[] = ['lilac', 'daffodils', 'redTulips', 'pinkRoses', 'morningGlory'];
    for (let y = 6; y < SIZE; y++) {
      const crop = bands[Math.floor((y - 6) / 2) % bands.length] ?? 'lilac';
      for (let x = 2; x < SIZE - 1; x++) b.plot(x, y, crop);
    }
  },
  // Crops as far as the eye can see, watched over by scarecrows.
  earl: (b) => {
    b.house(0, 0);
    b.deco(0, 5, 'shed');
    for (const [x, y] of [[8, 8], [12, 4], [6, 13]] as const) b.deco(x, y, 'scarecrow');
    const crops: readonly CropId[] = ['wheat', 'soybeans', 'cotton'];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 4; x < SIZE; x++) b.plot(x, y, crops[Math.floor(x / 4) % crops.length] ?? 'wheat');
    }
  },
  // A tidy hobby farm with one of everything.
  pearl: (b) => {
    b.house(0, 0);
    for (let y = 0; y < SIZE; y++) b.deco(4, y, 'picketFence');
    for (let x = 5; x < SIZE; x++) b.deco(x, 7, 'dirtPath');
    for (const [x, y, d] of [
      [6, 1, 'flowerPot'],
      [8, 1, 'waterPump'],
      [10, 1, 'wheelbarrow'],
      [12, 1, 'scarecrow'],
      [14, 1, 'hayBale'],
      [1, 5, 'flowerPot'],
      [2, 5, 'flowerPot'],
    ] as const) {
      b.deco(x, y, d);
    }
    for (const [x, y, a] of [[6, 4, 'chicken'], [8, 4, 'pig'], [10, 4, 'sheep'], [12, 4, 'horse'], [14, 4, 'cow']] as const) {
      b.animal(x, y, a);
    }
    for (const [x, y, t] of [[1, 8, 'lemonTree'], [1, 11, 'orangeTree'], [1, 14, 'peachTree']] as const) b.tree(x, y, t);
    const crops: readonly CropId[] = ['tomatoes', 'blueberries', 'pumpkin'];
    for (let y = 9; y < SIZE; y++) for (let x = 6; x < SIZE; x++) b.plot(x, y, crops[(y - 9) % crops.length] ?? 'tomatoes');
  },
};

const NEIGHBOR_INDEX: Record<NeighborId, number> = { martha: 1, gus: 2, june: 3, earl: 4, pearl: 5 };

// Builds a neighbor's farm as it looks at `now` on `day`.
export function neighborFarm(seed: number, id: NeighborId, day: number, now: number): FarmState {
  const n = NEIGHBOR_INDEX[id];
  // Each plot is somewhere between just planted and nearly ripe, and stays
  // there all day: its planting time is measured back from now.
  const plantedAt = (x: number, y: number, crop: CropId): number =>
    now - (0.1 + 0.85 * random01(seed, n, day, x, y)) * CROPS[crop].hours * HOUR;
  const b = new Builder(id, plantedAt);
  LAYOUTS[id](b);
  return {
    version: SAVE_VERSION,
    seed,
    createdAt: now,
    lastSeenAt: now,
    coins: 0,
    xp: 0,
    expansion: EXPANSION,
    nextId: b.objects.length + 1,
    objects: b.objects,
    timeOffset: 0,
    basket: {},
    neighbors: {},
    gifts: [],
    feed: [],
    neighborsCheckedAt: now,
  };
}

