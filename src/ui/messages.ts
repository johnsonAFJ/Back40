// Every sentence the game shows about a tile or a failed action.

import type { Failure } from '../core/actions';
import { BUILDINGS } from '../core/data/buildings';
import { CROPS, type CropId } from '../core/data/crops';
import { PLOW_COST } from '../core/data/economy';
import { stage, timeUntilReady } from '../core/growth';
import { isOnFarm, objectAt, type FarmState } from '../core/state';
import { formatCoins, formatDuration } from './format';

// What clicking this tile would do, or what's on it.
export function describeTile(farm: FarmState, x: number, y: number, seed: CropId, now: number): string | null {
  if (!isOnFarm(farm, x, y)) return null;
  const obj = objectAt(farm, x, y);
  if (!obj) return `Plow for ${PLOW_COST} coins`;
  if (obj.kind === 'building') return BUILDINGS[obj.typeId].name;

  switch (obj.state) {
    case 'plowed':
      return `Plant ${CROPS[seed].name} for ${formatCoins(CROPS[seed].seed)} coins`;
    case 'harvested':
      return `Harvested. Plow again for ${PLOW_COST} coins`;
    case 'planted': {
      const name = CROPS[obj.cropId].name;
      switch (stage(obj, now)) {
        case 'ready':
          return `${name}: ready to harvest`;
        case 'withered':
          return `${name}: withered. Plow to clear for ${PLOW_COST} coins`;
        default:
          return `${name}: ready in ${formatDuration(timeUntilReady(obj, now))}`;
      }
    }
    default: {
      const _exhaustive: never = obj;
      return _exhaustive;
    }
  }
}

export function failureMessage(failure: Failure, now: number): string {
  switch (failure.code) {
    case 'offFarm':
      return "That's outside your farm";
    case 'blocked':
      return `The ${failure.by.kind === 'building' ? BUILDINGS[failure.by.typeId].name.toLowerCase() : 'plot'} is in the way`;
    case 'alreadyPlowed':
      return 'Already plowed';
    case 'notPlowed':
      return 'Plow it first';
    case 'growing':
      return `${CROPS[failure.plot.cropId].name}: ready in ${formatDuration(timeUntilReady(failure.plot, now))}`;
    case 'notEnoughCoins':
      return `Not enough coins. You need ${formatCoins(failure.needed)}`;
    case 'levelTooLow':
      return `Unlocks at level ${failure.level}`;
    default: {
      const _exhaustive: never = failure;
      return _exhaustive;
    }
  }
}
