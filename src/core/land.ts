// Growing the farm. Each expansion needs a level, a number of neighbors and
// coins. Neighbors move in as you level up, so the count comes from your
// level, the same way level comes from XP.
//
// New land is added along the far x and y edges, so everything already on
// the farm keeps its tile.

import { EXPANSIONS, type Expansion } from './data/expansions';
import { NEIGHBORS, NEIGHBOR_IDS, type NeighborId } from './data/neighbors';
import { levelForXp } from './levels';
import type { FarmState } from './state';

export function neighborsAt(level: number): NeighborId[] {
  return NEIGHBOR_IDS.filter((id) => NEIGHBORS[id].movesInAt <= level);
}

// The expansion after the current one, or null when the farm is as big as
// it gets.
export function nextExpansion(state: FarmState): (Expansion & { readonly index: number }) | null {
  const index = state.expansion + 1;
  const expansion = EXPANSIONS[index];
  return expansion ? { ...expansion, index } : null;
}

export type ExpandFailure =
  | { readonly code: 'fullSize' }
  | { readonly code: 'levelTooLow'; readonly level: number }
  | { readonly code: 'needNeighbors'; readonly needed: number; readonly have: number }
  | { readonly code: 'notEnoughCoins'; readonly needed: number };

export type ExpandOutcome =
  | { readonly ok: true; readonly state: FarmState; readonly size: number; readonly cost: number }
  | { readonly ok: false; readonly failure: ExpandFailure };

export function expand(state: FarmState, now: number): ExpandOutcome {
  const next = nextExpansion(state);
  if (!next) return { ok: false, failure: { code: 'fullSize' } };
  const level = levelForXp(state.xp);
  if (level < next.level) return { ok: false, failure: { code: 'levelTooLow', level: next.level } };
  const have = neighborsAt(level).length;
  if (have < next.neighbors) return { ok: false, failure: { code: 'needNeighbors', needed: next.neighbors, have } };
  if (state.coins < next.coins) return { ok: false, failure: { code: 'notEnoughCoins', needed: next.coins } };
  return {
    ok: true,
    state: { ...state, expansion: next.index, coins: state.coins - next.coins, lastSeenAt: now },
    size: next.size,
    cost: next.coins,
  };
}
