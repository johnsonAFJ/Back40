import { describe, expect, it } from 'vitest';
import { harvest, plant, plow, useMultiTool, type Outcome } from '../src/core/actions';
import { HOUR, MINUTE } from '../src/core/clock';
import { stage, timeUntilReady } from '../src/core/growth';
import { newFarm, objectAt, witherTime, type FarmState, type PlantedPlot } from '../src/core/state';

const START = Date.UTC(2026, 9, 8, 9, 0);
const SEED = 1234;

function ok(outcome: Outcome): FarmState {
  if (!outcome.ok) throw new Error(`Expected success, got ${outcome.failure.code}`);
  return outcome.state;
}

function plotAt(state: FarmState, x: number, y: number): PlantedPlot {
  const obj = objectAt(state, x, y);
  if (obj?.kind !== 'plot' || obj.state !== 'planted') throw new Error(`No crop at ${x}, ${y}`);
  return obj;
}

describe('a new farm', () => {
  const farm = newFarm(START, SEED);

  it('starts with 200 coins, no XP and a farmhouse', () => {
    expect(farm.coins).toBe(200);
    expect(farm.xp).toBe(0);
    expect(objectAt(farm, 1, 1)).toMatchObject({ kind: 'building', typeId: 'farmhouse' });
  });

  it('has six strawberry plots that ripen five minutes in', () => {
    const plots = farm.objects.filter((o) => o.kind === 'plot');
    expect(plots).toHaveLength(6);
    const first = plotAt(farm, 5, 5);
    expect(timeUntilReady(first, START)).toBe(5 * MINUTE);
    expect(stage(first, START + 5 * MINUTE)).toBe('ready');
  });
});

describe('the farming loop', () => {
  it('plows, plants, grows and harvests', () => {
    let farm = newFarm(START, SEED);

    farm = ok(plow(farm, 9, 9, START));
    expect(farm.coins).toBe(185);
    expect(farm.xp).toBe(1);

    farm = ok(plant(farm, 9, 9, 'strawberries', START));
    expect(farm.coins).toBe(175);
    expect(farm.xp).toBe(2);

    const growing = plotAt(farm, 9, 9);
    expect(stage(growing, START + 1 * HOUR)).toBe('sprouting');
    expect(stage(growing, START + 3 * HOUR)).toBe('growing');

    const tooEarly = harvest(farm, 9, 9, START + 3 * HOUR);
    expect(tooEarly.ok).toBe(false);

    farm = ok(harvest(farm, 9, 9, START + 4 * HOUR));
    expect(farm.coins).toBe(210);
    expect(farm.xp).toBe(3);
    expect(objectAt(farm, 9, 9)).toMatchObject({ kind: 'plot', state: 'harvested' });
  });

  it('needs a fresh plow after every harvest', () => {
    let farm = ok(harvest(newFarm(START, SEED), 5, 5, START + 5 * MINUTE));
    const replant = plant(farm, 5, 5, 'wheat', START + 5 * MINUTE);
    expect(replant).toMatchObject({ ok: false, failure: { code: 'notPlowed' } });
    farm = ok(plow(farm, 5, 5, START + 5 * MINUTE));
    farm = ok(plant(farm, 5, 5, 'wheat', START + 5 * MINUTE));
    expect(plotAt(farm, 5, 5).cropId).toBe('wheat');
  });

  it('never changes the farm it was given', () => {
    const farm = newFarm(START, SEED);
    const before = JSON.stringify(farm);
    plow(farm, 9, 9, START);
    expect(JSON.stringify(farm)).toBe(before);
  });
});

describe('what you cannot do', () => {
  const farm = newFarm(START, SEED);

  it('cannot plow off the farm or under the farmhouse', () => {
    expect(plow(farm, -1, 3, START)).toMatchObject({ ok: false, failure: { code: 'offFarm' } });
    expect(plow(farm, 12, 3, START)).toMatchObject({ ok: false, failure: { code: 'offFarm' } });
    expect(plow(farm, 2, 2, START)).toMatchObject({ ok: false, failure: { code: 'blocked' } });
  });

  it('cannot plow over a growing crop', () => {
    expect(plow(farm, 5, 5, START)).toMatchObject({ ok: false, failure: { code: 'growing' } });
  });

  it('cannot plow without 15 coins', () => {
    const broke = { ...farm, coins: 14 };
    expect(plow(broke, 9, 9, START)).toMatchObject({ ok: false, failure: { code: 'notEnoughCoins', needed: 15 } });
  });

  it('cannot plant a crop above your level', () => {
    const plowed = ok(plow(farm, 9, 9, START));
    expect(plant(plowed, 9, 9, 'tomatoes', START)).toMatchObject({ ok: false, failure: { code: 'levelTooLow', level: 10 } });
  });
});

describe('withering', () => {
  it('happens 2.5 grow times after planting, as in the 2009 chart', () => {
    expect(witherTime('strawberries', START)).toBe(START + 10 * HOUR);
    expect(witherTime('wheat', START)).toBe(START + 180 * HOUR);
  });

  it('turns a ripe crop into a withered one that can only be plowed', () => {
    let farm = ok(plow(newFarm(START, SEED), 9, 9, START));
    farm = ok(plant(farm, 9, 9, 'strawberries', START));
    const plot = plotAt(farm, 9, 9);
    expect(stage(plot, plot.witherAt - 1)).toBe('ready');
    expect(stage(plot, plot.witherAt)).toBe('withered');

    expect(harvest(farm, 9, 9, plot.witherAt).ok).toBe(false);
    const replowed = ok(plow(farm, 9, 9, plot.witherAt));
    expect(replowed.coins).toBe(farm.coins - 15);
    expect(objectAt(replowed, 9, 9)).toMatchObject({ state: 'plowed' });
  });
});

describe('the multi-tool', () => {
  it('does the right thing for each kind of tile', () => {
    let farm = newFarm(START, SEED);
    const later = START + 5 * MINUTE;
    const steps = [
      [9, 9, 'plow'],
      [9, 9, 'plant'],
      [5, 5, 'harvest'],
      [5, 5, 'plow'],
    ] as const;
    for (const [x, y, kind] of steps) {
      const outcome = useMultiTool(farm, x, y, 'soybeans', later);
      expect(outcome).toMatchObject({ ok: true, kind });
      farm = ok(outcome);
    }
  });
});
