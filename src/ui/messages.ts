// Every sentence the game shows about a tile or a failed action.

import { sellValue, type Failure } from '../core/actions';
import { BUILDINGS } from '../core/data/buildings';
import { CROPS, type CropId } from '../core/data/crops';
import { PLOW_COST } from '../core/data/economy';
import { ANIMALS, DECORATIONS, TREES } from '../core/data/items';
import { stage, timeUntilReady } from '../core/growth';
import { isProducerReady, producerData, timeUntilProduce } from '../core/producers';
import { isOnFarm, objectAt, type FarmObject, type FarmState } from '../core/state';
import { formatCoins, formatDuration } from './format';

export function objectName(obj: FarmObject): string {
  switch (obj.kind) {
    case 'plot':
      return obj.state === 'planted' ? CROPS[obj.cropId].name : 'Plot';
    case 'building':
      return BUILDINGS[obj.typeId].name;
    case 'tree':
      return TREES[obj.typeId].name;
    case 'animal':
      return ANIMALS[obj.typeId].name;
    case 'decoration':
      return DECORATIONS[obj.typeId].name;
    default: {
      const _exhaustive: never = obj;
      return _exhaustive;
    }
  }
}

// What clicking this tile with the multi-tool would do, or what's on it.
export function describeTile(farm: FarmState, x: number, y: number, seed: CropId, now: number): string | null {
  if (!isOnFarm(farm, x, y)) return null;
  const obj = objectAt(farm, x, y);
  if (!obj) return `Plow for ${PLOW_COST} coins`;

  switch (obj.kind) {
    case 'building':
    case 'decoration':
      return objectName(obj);
    case 'tree':
    case 'animal': {
      const data = producerData(obj);
      return isProducerReady(obj, now)
        ? `${data.name}: ${data.product} ready to collect`
        : `${data.name}: ${data.product} in ${formatDuration(timeUntilProduce(obj, now))}`;
    }
    case 'plot':
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
    default: {
      const _exhaustive: never = obj;
      return _exhaustive;
    }
  }
}

// What the Sell tool would do to this tile.
export function describeSell(farm: FarmState, x: number, y: number): string | null {
  const obj = objectAt(farm, x, y);
  if (!obj) return null;
  const value = sellValue(obj);
  if (value === null) return `The ${objectName(obj).toLowerCase()} can't be sold`;
  if (obj.kind === 'plot') return obj.state === 'planted' ? `Remove plot and ${objectName(obj).toLowerCase()}` : 'Remove plot';
  return `Sell ${objectName(obj).toLowerCase()} for ${formatCoins(value)} coins`;
}

export function failureMessage(failure: Failure, now: number): string {
  switch (failure.code) {
    case 'offFarm':
      return "That's outside your farm";
    case 'blocked':
      return `The ${objectName(failure.by).toLowerCase()} is in the way`;
    case 'noRoom':
      return "It doesn't fit there";
    case 'alreadyPlowed':
      return 'Already plowed';
    case 'notPlowed':
      return 'Plow it first';
    case 'growing':
      return `${CROPS[failure.plot.cropId].name}: ready in ${formatDuration(timeUntilReady(failure.plot, now))}`;
    case 'producing': {
      const data = producerData(failure.producer);
      return `${data.name}: ${data.product} in ${formatDuration(timeUntilProduce(failure.producer, now))}`;
    }
    case 'notEnoughCoins':
      return `Not enough coins. You need ${formatCoins(failure.needed)}`;
    case 'levelTooLow':
      return `Unlocks at level ${failure.level}`;
    case 'nothingThere':
      return 'Nothing there';
    case 'cantSell':
      return `The ${objectName(failure.obj).toLowerCase()} can't be sold`;
    default: {
      const _exhaustive: never = failure;
      return _exhaustive;
    }
  }
}
