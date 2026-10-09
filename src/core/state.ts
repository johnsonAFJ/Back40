// The shape of a farm, which is also the shape of the save file. Only facts
// that can't be recomputed live here: level comes from xp, a crop's growth
// stage from plantedAt and the clock.

import { BUILDINGS, type BuildingId } from './data/buildings';
import { ANIMAL_SPACE, DECORATIONS, SQUARE_SPACE, type AnimalId, type DecorationId, type TreeId } from './data/items';
import type { NeighborId } from './data/neighbors';
import type { ProduceId } from './data/produce';
import type { Placeable } from './catalog';
import { CROPS, type CropId } from './data/crops';
import { STARTER_CROP_MINUTES_LEFT, STARTING_COINS, WITHER_GROW_TIMES } from './data/economy';
import { EXPANSIONS } from './data/expansions';
import { HOUR, MINUTE } from './clock';

export const SAVE_VERSION = 6;

// A plot is always in exactly one of these states. Fields that only make
// sense for a growing crop only exist on the 'planted' variant, so a plowed
// plot with a cropId can't be represented at all.
export type PlotState =
  | { readonly state: 'plowed' }
  | { readonly state: 'harvested' }
  | {
      readonly state: 'planted';
      readonly cropId: CropId;
      readonly plantedAt: number;
      readonly witherAt: number;
      readonly fertilized: boolean;
    };

type Placed = { readonly id: string; readonly x: number; readonly y: number };

export type Plot = Placed & { readonly kind: 'plot' } & PlotState;
export type PlantedPlot = Extract<Plot, { state: 'planted' }>;
export type BuildingObject = Placed & { readonly kind: 'building'; readonly typeId: BuildingId };
// Trees and animals produce again a set time after their last harvest. A new
// one counts as harvested the moment it's placed.
export type TreeObject = Placed & { readonly kind: 'tree'; readonly typeId: TreeId; readonly lastHarvestAt: number };
export type AnimalObject = Placed & { readonly kind: 'animal'; readonly typeId: AnimalId; readonly lastHarvestAt: number };
export type DecorationObject = Placed & { readonly kind: 'decoration'; readonly typeId: DecorationId };
export type Producer = TreeObject | AnimalObject;
export type FarmObject = Plot | BuildingObject | TreeObject | AnimalObject | DecorationObject;

export type FarmState = {
  readonly version: typeof SAVE_VERSION;
  readonly seed: number;
  readonly createdAt: number;
  readonly lastSeenAt: number;
  readonly coins: number;
  readonly xp: number;
  readonly expansion: number;
  readonly nextId: number;
  readonly objects: readonly FarmObject[];
  // How far test mode has moved this farm's clock ahead of real time, in
  // milliseconds. Zero for any farm that's never been in test mode. See
  // core/cheats.ts.
  readonly timeOffset: number;
  // Eggs, fruit and the rest, collected from trees and animals and waiting
  // to be sold. A missing entry means none.
  readonly basket: Basket;
  // Neighbors who have moved in, and how you've helped each one today.
  readonly neighbors: { readonly [id in NeighborId]?: NeighborRecord };
  // Gifts from neighbors, waiting to be placed for free.
  readonly gifts: readonly Placeable[];
  // The news feed, oldest first, at most FEED_LENGTH entries.
  readonly feed: readonly FeedEvent[];
  // The farm time up to which neighbor visits, gifts and news have been
  // worked out. See core/neighbors.ts.
  readonly neighborsCheckedAt: number;
};

// `day` is the day number (core/neighbors.ts dayIndex) that `helped` belongs
// to; on any other day the list counts as empty.
export type NeighborRecord = { readonly day: number; readonly helped: readonly string[] };

export type FeedEvent =
  | { readonly kind: 'movedIn'; readonly at: number; readonly neighbor: NeighborId }
  | { readonly kind: 'fertilized'; readonly at: number; readonly neighbor: NeighborId; readonly count: number }
  | { readonly kind: 'gift'; readonly at: number; readonly neighbor: NeighborId; readonly gift: Placeable }
  | { readonly kind: 'harvested'; readonly at: number; readonly neighbor: NeighborId; readonly crop: CropId; readonly count: number };

export const FEED_LENGTH = 30;

export type Basket = { readonly [id in ProduceId]?: number };

export function farmSize(state: FarmState): number {
  const expansion = EXPANSIONS[state.expansion] ?? EXPANSIONS[0];
  return expansion.size;
}

export function isOnFarm(state: FarmState, x: number, y: number): boolean {
  const size = farmSize(state);
  return x >= 0 && y >= 0 && x < size && y < size;
}

// The tiles an object covers. Plots take one tile; buildings take their
// width x depth starting from their (x, y) corner.
export function footprint(obj: FarmObject): { readonly width: number; readonly depth: number } {
  switch (obj.kind) {
    case 'plot':
    case 'tree':
    case 'animal':
      return { width: 1, depth: 1 };
    case 'building':
      return BUILDINGS[obj.typeId];
    case 'decoration':
      return DECORATIONS[obj.typeId];
    default: {
      const _exhaustive: never = obj;
      return _exhaustive;
    }
  }
}

// Everything on a tile. Usually one thing; a square of animals can hold
// several.
export function objectsAt(state: FarmState, x: number, y: number): FarmObject[] {
  return state.objects.filter((obj) => {
    const { width, depth } = footprint(obj);
    return x >= obj.x && x < obj.x + width && y >= obj.y && y < obj.y + depth;
  });
}

// The first thing on a tile, for rules where it only matters whether the
// tile is taken and by what kind of thing.
export function objectAt(state: FarmState, x: number, y: number): FarmObject | null {
  return objectsAt(state, x, y)[0] ?? null;
}

// How much of a square's space its animals use, or null if something other
// than animals is there (which leaves no room for any).
export function spaceUsed(objects: readonly FarmObject[]): number | null {
  let used = 0;
  for (const o of objects) {
    if (o.kind !== 'animal') return null;
    used += ANIMAL_SPACE[o.typeId];
  }
  return used;
}

type Area = { readonly x: number; readonly y: number; readonly width: number; readonly depth: number };

// What's going into an area: an animal can share a square with other
// animals if there's space; anything else needs the area empty. `ignoreId` is
// the object being moved, which doesn't block its own new spot.
export type Incoming = { readonly animal?: AnimalId; readonly ignoreId?: string };

// Why an area can't take something: part of it is off the farm, a square of
// animals is full, or the first object in the way. Null when it fits.
export function areaBlocker(state: FarmState, area: Area, incoming: Incoming = {}): 'offFarm' | 'full' | FarmObject | null {
  for (let dx = 0; dx < area.width; dx++) {
    for (let dy = 0; dy < area.depth; dy++) {
      if (!isOnFarm(state, area.x + dx, area.y + dy)) return 'offFarm';
    }
  }
  for (let dx = 0; dx < area.width; dx++) {
    for (let dy = 0; dy < area.depth; dy++) {
      const there = objectsAt(state, area.x + dx, area.y + dy).filter((o) => o.id !== incoming.ignoreId);
      const first = there[0];
      if (!first) continue;
      const used = spaceUsed(there);
      if (incoming.animal === undefined || used === null) return first;
      if (used + ANIMAL_SPACE[incoming.animal] > SQUARE_SPACE) return 'full';
    }
  }
  return null;
}

export function isAreaFree(state: FarmState, area: Area, incoming: Incoming = {}): boolean {
  return areaBlocker(state, area, incoming) === null;
}

// When a crop withers: 2.5 grow times after planting. Stored at planting, so
// changing the rule later doesn't move crops already in the ground.
export function witherTime(cropId: CropId, plantedAt: number): number {
  return plantedAt + CROPS[cropId].hours * HOUR * WITHER_GROW_TIMES;
}

// A brand new farm: farmhouse at the back corner, and six plots of
// strawberries that ripen a few minutes after the farm is created.
export function newFarm(now: number, seed: number): FarmState {
  const starterCrop: CropId = 'strawberries';
  const plantedAt = now - CROPS[starterCrop].hours * HOUR + STARTER_CROP_MINUTES_LEFT * MINUTE;
  const objects: FarmObject[] = [{ id: 'o1', kind: 'building', typeId: 'farmhouse', x: 0, y: 0 }];
  let nextId = 2;
  for (const y of [5, 6]) {
    for (const x of [5, 6, 7]) {
      objects.push({
        id: `o${nextId++}`,
        kind: 'plot',
        x,
        y,
        state: 'planted',
        cropId: starterCrop,
        plantedAt,
        witherAt: witherTime(starterCrop, plantedAt),
        fertilized: false,
      });
    }
  }
  return {
    version: SAVE_VERSION,
    seed,
    createdAt: now,
    lastSeenAt: now,
    coins: STARTING_COINS,
    xp: 0,
    expansion: 0,
    nextId,
    objects,
    timeOffset: 0,
    basket: {},
    neighbors: {},
    gifts: [],
    feed: [],
    neighborsCheckedAt: now,
  };
}
