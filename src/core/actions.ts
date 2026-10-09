// Everything a player can do to the farm. Each action is a pure function:
// it takes a farm and returns either a new farm plus what was earned, or the
// reason it couldn't happen. It never changes the farm it was given, never
// reads the clock and never touches the screen.

import { productInfo, type Placeable } from './catalog';
import { CROPS, type CropId } from './data/crops';
import { FERTILIZED_BONUS_XP, HARVEST_XP, PLOW_COST, PLOW_XP } from './data/economy';
import { SELL_BACK } from './data/items';
import type { ProduceId } from './data/produce';
import { stage } from './growth';
import { levelForXp } from './levels';
import { isProducerReady, producerData, producerReadyAt } from './producers';
import {
  areaBlocker,
  footprint,
  isOnFarm,
  objectAt,
  objectsAt,
  rollWitherAt,
  type FarmObject,
  type FarmState,
  type PlantedPlot,
  type Plot,
  type Producer,
} from './state';

// What an action earned. `produce` lists the eggs, fruit and so on collected
// into the basket rather than paid out; several animals sharing a square
// can give several at once.
export type Reward = { readonly coins: number; readonly xp: number; readonly produce: readonly ProduceId[] };

export type Failure =
  | { readonly code: 'offFarm' }
  | { readonly code: 'blocked'; readonly by: FarmObject }
  | { readonly code: 'noRoom' }
  | { readonly code: 'squareFull' }
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
const NO_REWARD: Reward = { coins: 0, xp: 0, produce: [] };

// Turns areaBlocker's answer into the failure to report.
function blockedBy(blocker: 'offFarm' | 'full' | FarmObject): Failure {
  if (blocker === 'offFarm') return { code: 'noRoom' };
  if (blocker === 'full') return { code: 'squareFull' };
  return { code: 'blocked', by: blocker };
}

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
  return succeed('plow', put(state, plot), { coins: -PLOW_COST, xp: PLOW_XP, produce: [] }, plot, now);
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
  return succeed('plant', put(state, plot), { coins: -crop.seed, xp: crop.plantXp, produce: [] }, plot, now);
}

// Harvest a ripe crop, or collect from a ready tree, or from every ready
// animal sharing the square.
export function harvest(state: FarmState, x: number, y: number, now: number): Outcome {
  const existing = objectAt(state, x, y);
  if (!existing) return fail({ code: 'nothingThere' });

  // Trees and animals fill the basket instead of paying on the spot.
  if (existing.kind === 'tree' || existing.kind === 'animal') {
    const producers = objectsAt(state, x, y).filter((o): o is Producer => o.kind === 'tree' || o.kind === 'animal');
    const ready = producers.filter((o) => isProducerReady(o, now));
    if (ready.length === 0) {
      // Report whichever will be ready soonest.
      const next = producers.reduce((a, b) => (producerReadyAt(b) < producerReadyAt(a) ? b : a));
      return fail({ code: 'producing', producer: next });
    }
    let collected = state;
    const basket = { ...state.basket };
    const produce: ProduceId[] = [];
    for (const p of ready) {
      collected = put(collected, { ...p, lastHarvestAt: now });
      const id = producerData(p).product;
      basket[id] = (basket[id] ?? 0) + 1;
      produce.push(id);
    }
    const reward = { coins: 0, xp: HARVEST_XP * ready.length, produce };
    return succeed('harvest', { ...collected, basket }, reward, existing, now);
  }

  if (existing.kind !== 'plot' || existing.state !== 'planted') return fail({ code: 'notPlowed' });
  if (stage(existing, now) !== 'ready') return fail({ code: 'growing', plot: existing });

  const plot: Plot = { id: existing.id, kind: 'plot', x, y, state: 'harvested' };
  const reward = {
    coins: CROPS[existing.cropId].sells,
    xp: HARVEST_XP + (existing.fertilized ? FERTILIZED_BONUS_XP : 0),
    produce: [],
  };
  return succeed('harvest', put(state, plot), reward, plot, now);
}

// ---- Trees, animals and decorations ----

// Buy something from the market and place it with its top corner at (x, y).
export function place(state: FarmState, item: Placeable, x: number, y: number, now: number): Outcome {
  const info = productInfo(item);
  if (levelForXp(state.xp) < info.level) return fail({ code: 'levelTooLow', level: info.level });
  const animal = item.kind === 'animal' ? { animal: item.id } : {};
  const blocker = areaBlocker(state, { x, y, width: info.width, depth: info.depth }, animal);
  if (blocker) return fail(blockedBy(blocker));
  if (state.coins < info.price) return fail({ code: 'notEnoughCoins', needed: info.price });

  const id = `o${state.nextId}`;
  const obj: FarmObject =
    item.kind === 'decoration'
      ? { id, kind: 'decoration', typeId: item.id, x, y }
      : item.kind === 'tree'
        ? { id, kind: 'tree', typeId: item.id, x, y, lastHarvestAt: now }
        : { id, kind: 'animal', typeId: item.id, x, y, lastHarvestAt: now };
  return succeed('place', put(state, obj), { coins: -info.price, xp: info.buyXp, produce: [] }, obj, now);
}

// Place gift number `index` from the gift box. Gifts are free and give no XP;
// the neighbor already paid.
export function placeGift(state: FarmState, index: number, x: number, y: number, now: number): Outcome {
  const gift = state.gifts[index];
  if (!gift) return fail({ code: 'nothingThere' });
  const { width, depth } = productInfo(gift);
  const animal = gift.kind === 'animal' ? { animal: gift.id } : {};
  const blocker = areaBlocker(state, { x, y, width, depth }, animal);
  if (blocker) return fail(blockedBy(blocker));

  const id = `o${state.nextId}`;
  const obj: FarmObject =
    gift.kind === 'decoration'
      ? { id, kind: 'decoration', typeId: gift.id, x, y }
      : gift.kind === 'tree'
        ? { id, kind: 'tree', typeId: gift.id, x, y, lastHarvestAt: now }
        : { id, kind: 'animal', typeId: gift.id, x, y, lastHarvestAt: now };
  const gifts = state.gifts.filter((_, i) => i !== index);
  return succeed('place', { ...put(state, obj), gifts }, NO_REWARD, obj, now);
}

// Move any object, crops and all, so its top corner lands on (x, y). Free.
export function move(state: FarmState, id: string, x: number, y: number, now: number): Outcome {
  const obj = state.objects.find((o) => o.id === id);
  if (!obj) return fail({ code: 'nothingThere' });
  const { width, depth } = footprint(obj);
  const blocker = areaBlocker(state, { x, y, width, depth }, { ignoreId: id, ...(obj.kind === 'animal' ? { animal: obj.typeId } : {}) });
  if (blocker) return fail(blockedBy(blocker));
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
  return succeed('sell', remove(state, id), { coins: value, xp: 0, produce: [] }, obj, now);
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
