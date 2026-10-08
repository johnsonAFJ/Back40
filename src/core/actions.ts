// Everything a player can do to the farm. Each action is a pure function:
// it takes a farm and returns either a new farm plus what was earned, or the
// reason it couldn't happen. It never changes the farm it was given, never
// reads the clock and never touches the screen.

import { productInfo, type Placeable } from './catalog';
import { CROPS, type CropId } from './data/crops';
import { FERTILIZED_BONUS_XP, HARVEST_XP, PLOW_COST, PLOW_XP } from './data/economy';
import { SELL_BACK } from './data/items';
import { stage } from './growth';
import { levelForXp } from './levels';
import { isProducerReady, producerData } from './producers';
import {
  areaBlocker,
  footprint,
  isOnFarm,
  objectAt,
  rollWitherAt,
  type FarmObject,
  type FarmState,
  type PlantedPlot,
  type Plot,
  type Producer,
} from './state';

export type Reward = { readonly coins: number; readonly xp: number };

export type Failure =
  | { readonly code: 'offFarm' }
  | { readonly code: 'blocked'; readonly by: FarmObject }
  | { readonly code: 'noRoom' }
  | { readonly code: 'alreadyPlowed' }
  | { readonly code: 'notPlowed' }
  | { readonly code: 'growing'; readonly plot: PlantedPlot }
  | { readonly code: 'producing'; readonly producer: Producer }
  | { readonly code: 'notEnoughCoins'; readonly needed: number }
  | { readonly code: 'levelTooLow'; readonly level: number }
  | { readonly code: 'nothingThere' }
  | { readonly code: 'cantSell'; readonly obj: FarmObject };

export type ActionKind = 'plow' | 'plant' | 'harvest' | 'place' | 'move' | 'sell';

export type Outcome =
  | {
      readonly ok: true;
      readonly kind: ActionKind;
      readonly state: FarmState;
      readonly reward: Reward;
      // The tile to show the reward over.
      readonly at: { readonly x: number; readonly y: number };
    }
  | { readonly ok: false; readonly failure: Failure };

const fail = (failure: Failure): Outcome => ({ ok: false, failure });
const NO_REWARD: Reward = { coins: 0, xp: 0 };

function succeed(
  kind: ActionKind,
  state: FarmState,
  reward: Reward,
  at: { readonly x: number; readonly y: number },
  now: number,
): Outcome {
  return {
    ok: true,
    kind,
    state: { ...state, coins: state.coins + reward.coins, xp: state.xp + reward.xp, lastSeenAt: now },
    reward,
    at: { x: at.x, y: at.y },
  };
}

// Adds an object, or replaces the one with the same id.
function put(state: FarmState, obj: FarmObject): FarmState {
  const exists = state.objects.some((o) => o.id === obj.id);
  return {
    ...state,
    objects: exists ? state.objects.map((o) => (o.id === obj.id ? obj : o)) : [...state.objects, obj],
    nextId: exists ? state.nextId : state.nextId + 1,
  };
}

function remove(state: FarmState, id: string): FarmState {
  return { ...state, objects: state.objects.filter((o) => o.id !== id) };
}

// ---- Crops ----

// Plow empty land, a harvested plot, or a withered crop.
export function plow(state: FarmState, x: number, y: number, now: number): Outcome {
  if (!isOnFarm(state, x, y)) return fail({ code: 'offFarm' });
  const existing = objectAt(state, x, y);
  if (existing) {
    if (existing.kind !== 'plot') return fail({ code: 'blocked', by: existing });
    if (existing.state === 'plowed') return fail({ code: 'alreadyPlowed' });
    if (existing.state === 'planted' && stage(existing, now) !== 'withered') {
      return fail({ code: 'growing', plot: existing });
    }
  }
  if (state.coins < PLOW_COST) return fail({ code: 'notEnoughCoins', needed: PLOW_COST });

  const plot: Plot = { id: existing?.id ?? `o${state.nextId}`, kind: 'plot', x, y, state: 'plowed' };
  return succeed('plow', put(state, plot), { coins: -PLOW_COST, xp: PLOW_XP }, plot, now);
}

export function plant(state: FarmState, x: number, y: number, cropId: CropId, now: number): Outcome {
  const existing = objectAt(state, x, y);
  if (!existing || existing.kind !== 'plot' || existing.state !== 'plowed') return fail({ code: 'notPlowed' });
  const crop = CROPS[cropId];
  if (levelForXp(state.xp) < crop.level) return fail({ code: 'levelTooLow', level: crop.level });
  if (state.coins < crop.seed) return fail({ code: 'notEnoughCoins', needed: crop.seed });

  const plot: Plot = {
    id: existing.id,
    kind: 'plot',
    x,
    y,
    state: 'planted',
    cropId,
    plantedAt: now,
    witherAt: rollWitherAt(state.seed, x, y, cropId, now),
    fertilized: false,
  };
  return succeed('plant', put(state, plot), { coins: -crop.seed, xp: crop.plantXp }, plot, now);
}

// Harvest a ripe crop, or collect from a ready tree or animal.
export function harvest(state: FarmState, x: number, y: number, now: number): Outcome {
  const existing = objectAt(state, x, y);
  if (!existing) return fail({ code: 'nothingThere' });

  if (existing.kind === 'tree' || existing.kind === 'animal') {
    if (!isProducerReady(existing, now)) return fail({ code: 'producing', producer: existing });
    const reward = { coins: producerData(existing).sells, xp: HARVEST_XP };
    return succeed('harvest', put(state, { ...existing, lastHarvestAt: now }), reward, existing, now);
  }

  if (existing.kind !== 'plot' || existing.state !== 'planted') return fail({ code: 'notPlowed' });
  if (stage(existing, now) !== 'ready') return fail({ code: 'growing', plot: existing });

  const plot: Plot = { id: existing.id, kind: 'plot', x, y, state: 'harvested' };
  const reward = {
    coins: CROPS[existing.cropId].sells,
    xp: HARVEST_XP + (existing.fertilized ? FERTILIZED_BONUS_XP : 0),
  };
  return succeed('harvest', put(state, plot), reward, plot, now);
}

// ---- Trees, animals and decorations ----

// Buy something from the market and place it with its top corner at (x, y).
export function place(state: FarmState, item: Placeable, x: number, y: number, now: number): Outcome {
  const info = productInfo(item);
  if (levelForXp(state.xp) < info.level) return fail({ code: 'levelTooLow', level: info.level });
  const blocker = areaBlocker(state, { x, y, width: info.width, depth: info.depth });
  if (blocker) return fail(blocker === 'offFarm' ? { code: 'noRoom' } : { code: 'blocked', by: blocker });
  if (state.coins < info.price) return fail({ code: 'notEnoughCoins', needed: info.price });

  const id = `o${state.nextId}`;
  const obj: FarmObject =
    item.kind === 'decoration'
      ? { id, kind: 'decoration', typeId: item.id, x, y }
      : item.kind === 'tree'
        ? { id, kind: 'tree', typeId: item.id, x, y, lastHarvestAt: now }
        : { id, kind: 'animal', typeId: item.id, x, y, lastHarvestAt: now };
  return succeed('place', put(state, obj), { coins: -info.price, xp: info.buyXp }, obj, now);
}

// Move any object, crops and all, so its top corner lands on (x, y). Free.
export function move(state: FarmState, id: string, x: number, y: number, now: number): Outcome {
  const obj = state.objects.find((o) => o.id === id);
  if (!obj) return fail({ code: 'nothingThere' });
  const { width, depth } = footprint(obj);
  const blocker = areaBlocker(state, { x, y, width, depth }, id);
  if (blocker) return fail(blocker === 'offFarm' ? { code: 'noRoom' } : { code: 'blocked', by: blocker });
  return succeed('move', put(state, { ...obj, x, y }), NO_REWARD, { x, y }, now);
}

// What selling this object would pay, or null if it can't be sold.
export function sellValue(obj: FarmObject): number | null {
  switch (obj.kind) {
    case 'building':
      return null;
    case 'plot':
      // Removing a plot pays nothing, and loses whatever was growing.
      return 0;
    case 'tree':
      return Math.floor(productInfo({ kind: 'tree', id: obj.typeId }).price * SELL_BACK);
    case 'animal':
      return Math.floor(productInfo({ kind: 'animal', id: obj.typeId }).price * SELL_BACK);
    case 'decoration':
      return Math.floor(productInfo({ kind: 'decoration', id: obj.typeId }).price * SELL_BACK);
    default: {
      const _exhaustive: never = obj;
      return _exhaustive;
    }
  }
}

export function sell(state: FarmState, id: string, now: number): Outcome {
  const obj = state.objects.find((o) => o.id === id);
  if (!obj) return fail({ code: 'nothingThere' });
  const value = sellValue(obj);
  if (value === null) return fail({ code: 'cantSell', obj });
  return succeed('sell', remove(state, id), { coins: value, xp: 0 }, obj, now);
}

// ---- The multi-tool ----

// One click does whatever makes sense for the tile.
export function useMultiTool(state: FarmState, x: number, y: number, seed: CropId, now: number): Outcome {
  const existing = objectAt(state, x, y);
  if (!existing) return plow(state, x, y, now);
  switch (existing.kind) {
    case 'plot':
      switch (existing.state) {
        case 'plowed':
          return plant(state, x, y, seed, now);
        case 'harvested':
          return plow(state, x, y, now);
        case 'planted':
          return stage(existing, now) === 'withered' ? plow(state, x, y, now) : harvest(state, x, y, now);
        default: {
          const _exhaustive: never = existing;
          return _exhaustive;
        }
      }
    case 'tree':
    case 'animal':
      return harvest(state, x, y, now);
    case 'building':
    case 'decoration':
      return fail({ code: 'blocked', by: existing });
    default: {
      const _exhaustive: never = existing;
      return _exhaustive;
    }
  }
}
