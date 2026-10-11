// A safety net for a farm that's run out of money. With nothing growing and
// too few coins for a plow and seeds, a farm has no way to earn its way back.
// Under BAILOUT_UNDER coins you can claim BAILOUT_COINS, at most once every
// BAILOUT_EVERY_DAYS days of farm time. It's a gift, not a loan. Our own
// addition; see DESIGN.md "Departures".

import { DAY } from './clock';
import { BAILOUT_COINS, BAILOUT_EVERY_DAYS, BAILOUT_UNDER } from './data/economy';
import type { FarmState } from './state';

export type BailoutStatus =
  | { readonly kind: 'notNeeded' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'waiting'; readonly readyAt: number };

export function bailoutStatus(state: FarmState, now: number): BailoutStatus {
  if (state.coins >= BAILOUT_UNDER) return { kind: 'notNeeded' };
  if (state.lastBailoutAt === null) return { kind: 'ready' };
  const readyAt = state.lastBailoutAt + BAILOUT_EVERY_DAYS * DAY;
  return now >= readyAt ? { kind: 'ready' } : { kind: 'waiting', readyAt };
}

export type BailoutOutcome =
  | { readonly ok: true; readonly state: FarmState; readonly coins: number }
  | { readonly ok: false; readonly status: Exclude<BailoutStatus, { kind: 'ready' }> };

export function bailout(state: FarmState, now: number): BailoutOutcome {
  const status = bailoutStatus(state, now);
  if (status.kind !== 'ready') return { ok: false, status };
  return {
    ok: true,
    state: { ...state, coins: state.coins + BAILOUT_COINS, lastBailoutAt: now, lastSeenAt: now },
    coins: BAILOUT_COINS,
  };
}
