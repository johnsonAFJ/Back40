// Everything a player can do to the farm. Each action is a pure function:
// it takes a farm and returns either a new farm plus what was earned, or the
// reason it couldn't happen. It never changes the farm it was given, never
// reads the clock and never touches the screen.

import { CROPS, type CropId } from './data/crops';
import { FERTILIZED_BONUS_XP, HARVEST_XP, PLOW_COST, PLOW_XP } from './data/economy';
import { stage } from './growth';
import { levelForXp } from './levels';
import { isOnFarm, objectAt, rollWitherAt, type FarmObject, type FarmState, type PlantedPlot, type Plot } from './state';

export type Reward = { readonly coins: number; readonly xp: number };

export type Failure =
  | { readonly code: 'offFarm' }
  | { readonly code: 'blocked'; readonly by: FarmObject }
  | { readonly code: 'alreadyPlowed' }
  | { readonly code: 'notPlowed' }
  | { readonly code: 'growing'; readonly plot: PlantedPlot }
  | { readonly code: 'notEnoughCoins'; readonly needed: number }
  | { readonly code: 'levelTooLow'; readonly level: number };

export type ActionKind = 'plow' | 'plant' | 'harvest';

export type Outcome =
  | { readonly ok: true; readonly kind: ActionKind; readonly state: FarmState; readonly reward: Reward; readonly at: Plot }
  | { readonly ok: false; readonly failure: Failure };

const fail = (failure: Failure): Outcome => ({ ok: false, failure });

function applyReward(state: FarmState, reward: Reward, now: number): FarmState {
  return { ...state, coins: state.coins + reward.coins, xp: state.xp + reward.xp, lastSeenAt: now };
}

function putPlot(state: FarmState, plot: Plot): FarmState {
  const exists = state.objects.some((o) => o.id === plot.id);
  return {
    ...state,
    objects: exists ? state.objects.map((o) => (o.id === plot.id ? plot : o)) : [...state.objects, plot],
    nextId: exists ? state.nextId : state.nextId + 1,
  };
}

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
  const reward = { coins: -PLOW_COST, xp: PLOW_XP };
  return { ok: true, kind: 'plow', state: applyReward(putPlot(state, plot), reward, now), reward, at: plot };
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
  const reward = { coins: -crop.seed, xp: crop.plantXp };
  return { ok: true, kind: 'plant', state: applyReward(putPlot(state, plot), reward, now), reward, at: plot };
}

export function harvest(state: FarmState, x: number, y: number, now: number): Outcome {
  const existing = objectAt(state, x, y);
  if (!existing || existing.kind !== 'plot' || existing.state !== 'planted') return fail({ code: 'notPlowed' });
  if (stage(existing, now) !== 'ready') return fail({ code: 'growing', plot: existing });

  const plot: Plot = { id: existing.id, kind: 'plot', x, y, state: 'harvested' };
  const reward = {
    coins: CROPS[existing.cropId].sells,
    xp: HARVEST_XP + (existing.fertilized ? FERTILIZED_BONUS_XP : 0),
  };
  return { ok: true, kind: 'harvest', state: applyReward(putPlot(state, plot), reward, now), reward, at: plot };
}

// The multi-tool: one click does whatever makes sense for the tile.
export function useMultiTool(state: FarmState, x: number, y: number, seed: CropId, now: number): Outcome {
  const existing = objectAt(state, x, y);
  if (existing?.kind === 'plot') {
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
  }
  return plow(state, x, y, now);
}
