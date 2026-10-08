import { describe, expect, it } from 'vitest';
import { harvest, plant, plow, place, type Outcome } from '../src/core/actions';
import { addCoins, farmNow, levelUp, readyEverything, skipAhead } from '../src/core/cheats';
import { HOUR } from '../src/core/clock';
import { stage } from '../src/core/growth';
import { levelForXp, totalXpForLevel } from '../src/core/levels';
import { isProducerReady } from '../src/core/producers';
import { parseSave } from '../src/core/save';
import { newFarm, objectAt, type FarmState } from '../src/core/state';

const START = Date.UTC(2026, 9, 8, 9, 0);

function ok(outcome: Outcome): FarmState {
  if (!outcome.ok) throw new Error(`Expected success, got ${outcome.failure.code}`);
  return outcome.state;
}

describe('the farm clock', () => {
  it('runs on real time until test mode moves it', () => {
    expect(farmNow(newFarm(START, 1), START + 5)).toBe(START + 5);
  });

  it('skips ahead, and grows crops as if the time had really passed', () => {
    let farm = ok(plow(newFarm(START, 1), 9, 9, START));
    farm = ok(plant(farm, 9, 9, 'strawberries', START));
    farm = skipAhead(farm, 4 * HOUR);
    // No real time has passed, but the farm thinks four hours have.
    const now = farmNow(farm, START);
    expect(ok(harvest(farm, 9, 9, now)).coins).toBe(farm.coins + 35);
  });

  it('never runs backward', () => {
    const farm = skipAhead(newFarm(START, 1), HOUR);
    expect(skipAhead(farm, -2 * HOUR).timeOffset).toBe(HOUR);
  });

  it('survives a save and reload', () => {
    const farm = skipAhead(newFarm(START, 1), 3 * HOUR);
    expect(parseSave(JSON.parse(JSON.stringify(farm))).timeOffset).toBe(3 * HOUR);
  });
});

describe('cheats', () => {
  it('add coins', () => {
    expect(addCoins(newFarm(START, 1), 10_000).coins).toBe(10_200);
  });

  it('level up by exactly one level', () => {
    const farm = levelUp({ ...newFarm(START, 1), xp: 60 });
    expect(levelForXp(farm.xp)).toBe(4);
    expect(farm.xp).toBe(totalXpForLevel(4));
  });

  it('ready every crop, tree and animal without withering anything', () => {
    let farm = { ...newFarm(START, 1), coins: 10_000, xp: 10_000 };
    farm = ok(plow(farm, 9, 9, START));
    farm = ok(plant(farm, 9, 9, 'watermelon', START));
    farm = ok(place(farm, { kind: 'animal', id: 'horse' }, 10, 10, START));
    farm = readyEverything(farm, START);

    const melon = objectAt(farm, 9, 9);
    const horse = objectAt(farm, 10, 10);
    const strawberry = objectAt(farm, 5, 5);
    if (melon?.kind !== 'plot' || melon.state !== 'planted') throw new Error('melon missing');
    if (horse?.kind !== 'animal') throw new Error('horse missing');
    if (strawberry?.kind !== 'plot' || strawberry.state !== 'planted') throw new Error('strawberry missing');
    expect(stage(melon, START)).toBe('ready');
    expect(stage(strawberry, START)).toBe('ready');
    expect(isProducerReady(horse, START)).toBe(true);
  });
});
