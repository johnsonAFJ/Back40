// Test mode's cheats and time travel. Like every rule, these are pure
// functions on a farm; the test panel just calls them.
//
// Time travel works by moving the farm's own clock ahead of the real one.
// The farm stores how far ahead it is (`timeOffset`), and the game's time is
// always real time plus that offset. The offset only ever grows, so the
// game's clock never runs backward: a crop that's grown stays grown, even
// after turning the speed back down or reloading.

import { HOUR, MINUTE } from './clock';
import { CROPS } from './data/crops';
import { totalXpForLevel, levelForXp } from './levels';
import { producerData } from './producers';
import { witherTime, type FarmState } from './state';

// The farm's time: real time plus however far test mode has pushed it.
export function farmNow(state: FarmState, realNow: number): number {
  return realNow + state.timeOffset;
}

// Moves the farm's clock ahead. Negative amounts are ignored, so time can
// only go forward.
export function skipAhead(state: FarmState, ms: number): FarmState {
  return ms > 0 ? { ...state, timeOffset: state.timeOffset + ms } : state;
}

export function addCoins(state: FarmState, coins: number): FarmState {
  return { ...state, coins: state.coins + coins };
}

// Exactly enough XP to reach the next level.
export function levelUp(state: FarmState): FarmState {
  return { ...state, xp: totalXpForLevel(levelForXp(state.xp) + 1) };
}

// Makes every growing crop ripe and every tree and animal ready, without
// moving the clock (which would wither the short crops). Each ripened crop
// gets a fresh wither time from its new planting time.
export function readyEverything(state: FarmState, now: number): FarmState {
  const objects = state.objects.map((o) => {
    switch (o.kind) {
      case 'plot': {
        if (o.state !== 'planted') return o;
        // A minute past ripe, so it reads as ready immediately.
        const plantedAt = now - CROPS[o.cropId].hours * HOUR - MINUTE;
        return { ...o, plantedAt, witherAt: witherTime(o.cropId, plantedAt) };
      }
      case 'tree':
      case 'animal':
        return { ...o, lastHarvestAt: now - producerData(o).hours * HOUR - MINUTE };
      default:
        return o;
    }
  });
  return { ...state, objects };
}
