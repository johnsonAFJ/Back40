// Every sentence the game shows about a tile or a failed action.

import { sellValue, type Failure } from '../core/actions';
import type { ExpandFailure } from '../core/land';
import type { HelpFailure, Visit } from '../core/neighbors';
import { BUILDINGS } from '../core/data/buildings';
import { CROPS, type CropId } from '../core/data/crops';
import { PLOW_COST } from '../core/data/economy';
import { ANIMALS, DECORATIONS, TREES } from '../core/data/items';
import { PRODUCE } from '../core/data/produce';
import { CLIMBING_CROPS, SUPPORTS } from '../core/data/supports';
import { stage, timeUntilReady } from '../core/growth';
import { isProducerReady, producerData, timeUntilProduce } from '../core/producers';
import { isOnFarm, objectAt, objectsAt, type FarmObject, type FarmState, type Producer } from '../core/state';
import { formatCoins, formatDuration } from './format';

export function objectName(obj: FarmObject): string {
  switch (obj.kind) {
    case 'plot':
      if (obj.state === 'planted') return CROPS[obj.cropId].name;
      return obj.support === null ? 'Plot' : SUPPORTS[obj.support].name;
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

// The crops that grow on a trellis, as a phrase: "grapes".
function climberNames(): string {
  return [...CLIMBING_CROPS].map((id) => CROPS[id].name.toLowerCase()).join(' and ');
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
      // A square several animals share is described as a group.
      const group = objectsAt(farm, x, y).filter((o): o is Producer => o.kind === 'animal');
      if (group.length > 1) {
        const ready = group.filter((o) => isProducerReady(o, now)).length;
        if (ready > 0) return `${group.length} animals: ${ready} ready to collect`;
        const soonest = Math.min(...group.map((o) => timeUntilProduce(o, now)));
        return `${group.length} animals: next ready in ${formatDuration(soonest)}`;
      }
      const data = producerData(obj);
      const produce = PRODUCE[data.product].name;
      return isProducerReady(obj, now)
        ? `${data.name}: ${produce} ready to collect`
        : `${data.name}: ${produce} in ${formatDuration(timeUntilProduce(obj, now))}`;
    }
    case 'plot':
      switch (obj.state) {
        case 'plowed':
          if (obj.support !== null && !CLIMBING_CROPS.has(seed)) return `${SUPPORTS[obj.support].name}: plant ${climberNames()} here`;
          if (obj.support === null && CLIMBING_CROPS.has(seed)) return `${CROPS[seed].name} grow on a trellis`;
          return `Plant ${CROPS[seed].name} for ${formatCoins(CROPS[seed].seed)} coins`;
        case 'harvested':
          return `Harvested. Plow again for ${PLOW_COST} coins`;
        case 'planted': {
          const name = CROPS[obj.cropId].name;
          switch (stage(obj, now)) {
            case 'ready':
              return `${name}: ready to harvest`;
            case 'withered':
              return obj.support === null ? `${name}: withered. Plow to clear for ${PLOW_COST} coins` : `${name}: withered. Click to clear`;
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

// What the Sell tool would do to this object.
export function describeSell(obj: FarmObject | null): string | null {
  if (!obj) return null;
  const value = sellValue(obj);
  if (value === null) return `The ${objectName(obj).toLowerCase()} can't be sold`;
  if (obj.kind === 'plot' && obj.support !== null) {
    const what = SUPPORTS[obj.support].name.toLowerCase();
    const and = obj.state === 'planted' ? ` and ${CROPS[obj.cropId].name.toLowerCase()}` : '';
    return `Sell ${what}${and} for ${formatCoins(value)} coins`;
  }
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
    case 'squareFull':
      return 'No room for another animal on that square';
    case 'alreadyPlowed':
      return 'Already plowed';
    case 'notPlowed':
      return 'Plow it first';
    case 'needsSupport':
      return `${CROPS[failure.cropId].name} grow on a trellis. Buy one in the market`;
    case 'climbersOnly':
      return `Only ${climberNames()} grow on a ${SUPPORTS[failure.support].name.toLowerCase()}`;
    case 'growing':
      return `${CROPS[failure.plot.cropId].name}: ready in ${formatDuration(timeUntilReady(failure.plot, now))}`;
    case 'producing': {
      const data = producerData(failure.producer);
      return `${data.name}: ${PRODUCE[data.product].name} in ${formatDuration(timeUntilProduce(failure.producer, now))}`;
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

export function expandFailureMessage(failure: ExpandFailure): string {
  switch (failure.code) {
    case 'fullSize':
      return 'Your farm is as big as it gets';
    case 'levelTooLow':
      return `Reach level ${failure.level} to expand`;
    case 'needNeighbors':
      return `You need ${failure.needed} neighbors to expand, and have ${failure.have}`;
    case 'notEnoughCoins':
      return `Not enough coins. You need ${formatCoins(failure.needed)}`;
    default: {
      const _exhaustive: never = failure;
      return _exhaustive;
    }
  }
}

// What clicking this tile on a neighbor's farm would do.
export function describeChore(v: Visit, x: number, y: number, now: number): string | null {
  const obj = objectAt(v.farm, x, y);
  if (!obj) return null;
  if (v.helpsLeft <= 0) return objectName(obj);
  if (v.crows.has(obj.id)) return `Chase the crows off the ${objectName(obj).toLowerCase()}`;
  if (v.hungry.has(obj.id)) return `Feed the ${objectName(obj).toLowerCase()}`;
  if (obj.kind === 'plot' && obj.state === 'planted' && !obj.fertilized) {
    const s = stage(obj, now);
    if (s !== 'ready' && s !== 'withered') return `Fertilize the ${objectName(obj).toLowerCase()}`;
  }
  return objectName(obj);
}

export function helpFailureMessage(failure: HelpFailure, name: string): string {
  switch (failure.code) {
    case 'notHere':
      return `${name} hasn't moved in yet`;
    case 'noHelpsLeft':
      return `You've helped ${name} all you can today. Come back tomorrow`;
    case 'alreadyHelped':
      return 'You already helped with that today';
    case 'nothingToDo':
      return 'Nothing to help with there';
    default: {
      const _exhaustive: never = failure;
      return _exhaustive;
    }
  }
}
