// The shape of a farm, which is also the shape of the save file. Only facts
// that can't be recomputed live here: level comes from xp, a crop's growth
// stage from plantedAt and the clock.

import { BUILDINGS, type BuildingId } from './data/buildings';
import { CROPS, type CropId } from './data/crops';
import { CUSHION_GROW_TIMES, SAFE_GROW_TIMES, STARTER_CROP_MINUTES_LEFT, STARTING_COINS } from './data/economy';
import { EXPANSIONS } from './data/expansions';
import { HOUR, MINUTE } from './clock';
import { random01 } from './rng';

export const SAVE_VERSION = 1;

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
export type FarmObject = Plot | BuildingObject;

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
};

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
      return { width: 1, depth: 1 };
    case 'building':
      return BUILDINGS[obj.typeId];
    default: {
      const _exhaustive: never = obj;
      return _exhaustive;
    }
  }
}

export function objectAt(state: FarmState, x: number, y: number): FarmObject | null {
  for (const obj of state.objects) {
    const { width, depth } = footprint(obj);
    if (x >= obj.x && x < obj.x + width && y >= obj.y && y < obj.y + depth) return obj;
  }
  return null;
}

// When a crop withers: safe for one grow time after ripening, then a seeded
// random moment within the cushion. Rolled once, at planting, and stored.
export function rollWitherAt(seed: number, x: number, y: number, cropId: CropId, plantedAt: number): number {
  const grow = CROPS[cropId].hours * HOUR;
  const safeUntil = plantedAt + grow + grow * SAFE_GROW_TIMES;
  return Math.round(safeUntil + random01(seed, x, y, plantedAt) * grow * CUSHION_GROW_TIMES);
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
        witherAt: rollWitherAt(seed, x, y, starterCrop, plantedAt),
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
  };
}
