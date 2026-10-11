import { describe, expect, it } from 'vitest';
import { bailout, bailoutStatus } from '../src/core/bailout';
import { DAY, HOUR } from '../src/core/clock';
import { BAILOUT_COINS } from '../src/core/data/economy';
import { parseSave } from '../src/core/save';
import { newFarm, type FarmState } from '../src/core/state';

const START = Date.UTC(2026, 9, 10, 9, 0);

function broke(coins = 5): FarmState {
  return { ...newFarm(START, 3), coins };
}

describe('the bailout', () => {
  it('is only there for a farm under 20 coins', () => {
    expect(bailoutStatus(broke(19), START)).toEqual({ kind: 'ready' });
    expect(bailoutStatus(broke(20), START)).toEqual({ kind: 'notNeeded' });
    expect(bailout(broke(20), START)).toMatchObject({ ok: false, status: { kind: 'notNeeded' } });
  });

  it('gives 100 coins and remembers when', () => {
    const outcome = bailout(broke(5), START);
    if (!outcome.ok) throw new Error('expected a bailout');
    expect(outcome.state.coins).toBe(5 + BAILOUT_COINS);
    expect(outcome.state.lastBailoutAt).toBe(START);
  });

  it('comes round again three days later, not before', () => {
    const outcome = bailout(broke(5), START);
    if (!outcome.ok) throw new Error('expected a bailout');
    const brokeAgain = { ...outcome.state, coins: 0 };
    expect(bailoutStatus(brokeAgain, START + 3 * DAY - HOUR)).toEqual({ kind: 'waiting', readyAt: START + 3 * DAY });
    expect(bailout(brokeAgain, START + DAY).ok).toBe(false);
    expect(bailout(brokeAgain, START + 3 * DAY).ok).toBe(true);
  });

  it('starts unclaimed in a save from before it existed', () => {
    const { lastBailoutAt: _, ...v7 } = { ...newFarm(START, 3), version: 7 };
    expect(parseSave(JSON.parse(JSON.stringify(v7))).lastBailoutAt).toBeNull();
  });
});
