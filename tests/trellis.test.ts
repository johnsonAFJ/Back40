import { describe, expect, it } from 'vitest';
import { harvest, place, plant, plow, sellValue, useMultiTool, type Outcome } from '../src/core/actions';
import { HOUR } from '../src/core/clock';
import { CROPS } from '../src/core/data/crops';
import { SUPPORTS } from '../src/core/data/supports';
import { totalXpForLevel } from '../src/core/levels';
import { parseSave } from '../src/core/save';
import { newFarm, objectAt, type FarmState } from '../src/core/state';

const START = Date.UTC(2026, 9, 8, 9, 0);
const GRAPES = CROPS.grapes;

function ok(outcome: Outcome): FarmState {
  if (!outcome.ok) throw new Error(`Expected success, got ${outcome.failure.code}`);
  return outcome.state;
}

// A level 15 farm with a trellis at (9, 9) and a plowed plot of soil at (9, 10).
function farmWithTrellis(): FarmState {
  const farm = { ...newFarm(START, 7), coins: 10_000, xp: totalXpForLevel(15) };
  return ok(plow(ok(place(farm, { kind: 'support', id: 'trellis' }, 9, 9, START)), 9, 10, START));
}

describe('a trellis', () => {
  it('unlocks with grapes', () => {
    expect(SUPPORTS.trellis.level).toBe(GRAPES.level);
    const early = { ...newFarm(START, 7), coins: 10_000 };
    expect(place(early, { kind: 'support', id: 'trellis' }, 9, 9, START)).toMatchObject({
      failure: { code: 'levelTooLow', level: 15 },
    });
  });

  it('goes down ready to plant, for its price', () => {
    const before = { ...newFarm(START, 7), coins: 10_000, xp: totalXpForLevel(15) };
    const farm = ok(place(before, { kind: 'support', id: 'trellis' }, 9, 9, START));
    expect(objectAt(farm, 9, 9)).toMatchObject({ kind: 'plot', support: 'trellis', state: 'plowed' });
    expect(farm.coins).toBe(before.coins - SUPPORTS.trellis.price);
  });

  it('is the only place grapes grow, and grows nothing else', () => {
    const farm = farmWithTrellis();
    expect(plant(farm, 9, 10, 'grapes', START)).toMatchObject({ failure: { code: 'needsSupport', cropId: 'grapes' } });
    expect(plant(farm, 9, 9, 'strawberries', START)).toMatchObject({ failure: { code: 'climbersOnly', support: 'trellis' } });
    expect(objectAt(ok(plant(farm, 9, 9, 'grapes', START)), 9, 9)).toMatchObject({ state: 'planted', support: 'trellis' });
  });

  it('is ready to replant straight after a harvest, with no plowing', () => {
    const planted = ok(plant(farmWithTrellis(), 9, 9, 'grapes', START));
    const ripe = START + GRAPES.hours * HOUR;
    const picked = ok(harvest(planted, 9, 9, ripe));
    expect(picked.coins).toBe(planted.coins + GRAPES.sells);
    expect(objectAt(picked, 9, 9)).toMatchObject({ state: 'plowed', support: 'trellis' });
    // The multi-tool plants again on the next click.
    expect(objectAt(ok(useMultiTool(picked, 9, 9, 'grapes', ripe)), 9, 9)).toMatchObject({ state: 'planted', cropId: 'grapes' });
  });

  it('clears withered vines for free', () => {
    const planted = ok(plant(farmWithTrellis(), 9, 9, 'grapes', START));
    const dead = START + GRAPES.hours * HOUR * 3;
    const cleared = ok(useMultiTool(planted, 9, 9, 'grapes', dead));
    expect(cleared.coins).toBe(planted.coins);
    expect(objectAt(cleared, 9, 9)).toMatchObject({ state: 'plowed', support: 'trellis' });
  });

  it('sells back like a decoration; plain soil still sells for nothing', () => {
    const farm = farmWithTrellis();
    const trellis = objectAt(farm, 9, 9);
    const soil = objectAt(farm, 9, 10);
    if (!trellis || !soil) throw new Error('missing plots');
    expect(sellValue(trellis)).toBe(Math.floor(SUPPORTS.trellis.price / 3));
    expect(sellValue(soil)).toBe(0);
  });
});

describe('saves from before trellises', () => {
  it('make every plot plain soil, and grapes already on soil finish as they are', () => {
    const farm = farmWithTrellis();
    // Version 6 plots have no `support`, and grapes could grow on soil.
    const objects = farm.objects.map((o) =>
      o.kind === 'plot' && o.x === 9 && o.y === 10
        ? { id: o.id, kind: 'plot', x: 9, y: 10, state: 'planted', cropId: 'grapes', plantedAt: START, witherAt: START + 60 * HOUR, fertilized: false }
        : o.kind === 'plot'
          ? (({ support: _, ...rest }) => rest)(o)
          : o,
    );
    const v6 = { ...farm, version: 6, objects };
    const loaded = parseSave(JSON.parse(JSON.stringify(v6)));
    expect(loaded.version).toBe(7);
    expect(loaded.objects.filter((o) => o.kind === 'plot').every((o) => o.kind === 'plot' && o.support === null)).toBe(true);
    const picked = ok(harvest(loaded, 9, 10, START + GRAPES.hours * HOUR));
    expect(objectAt(picked, 9, 10)).toMatchObject({ state: 'harvested', support: null });
  });
});
