import { describe, expect, it } from 'vitest';
import { buyVehicle, ownsVehicle, plant, plantArea, plowArea, type AreaOutcome, type Outcome } from '../src/core/actions';
import { HOUR } from '../src/core/clock';
import { PLOW_COST } from '../src/core/data/economy';
import { VEHICLES } from '../src/core/data/vehicles';
import { totalXpForLevel } from '../src/core/levels';
import { parseSave } from '../src/core/save';
import { isOnFarm, newFarm, objectAt, type FarmState } from '../src/core/state';

const START = Date.UTC(2026, 9, 24, 9, 0);
const TRACTOR = VEHICLES.tractor;

function ok(result: Outcome | AreaOutcome): FarmState {
  const outcome = 'outcome' in result ? result.outcome : result;
  if (!outcome.ok) throw new Error(`Expected success, got ${outcome.failure.code}`);
  return outcome.state;
}

const block = (x: number, y: number, size = 2) => ({ x, y, width: size, depth: size });

// A level 10 farm with plenty of coins.
function readyToBuy(): FarmState {
  return { ...newFarm(START, 5), coins: 20_000, xp: totalXpForLevel(10) };
}

describe('buying the tractor', () => {
  it('costs 5,000 coins at level 10 and parks off the farm', () => {
    const before = readyToBuy();
    const after = ok(buyVehicle(before, 'tractor', START));
    expect(ownsVehicle(after, 'tractor')).toBe(true);
    expect(after.coins).toBe(before.coins - 5_000);
    expect(after.xp).toBe(before.xp + TRACTOR.buyXp);
    expect(isOnFarm(after, TRACTOR.parking.x, TRACTOR.parking.y)).toBe(false);
  });

  it('needs the level and the coins, and is only bought once', () => {
    expect(buyVehicle({ ...readyToBuy(), xp: 0 }, 'tractor', START)).toMatchObject({ failure: { code: 'levelTooLow', level: 10 } });
    expect(buyVehicle({ ...readyToBuy(), coins: 4_999 }, 'tractor', START)).toMatchObject({ failure: { code: 'notEnoughCoins' } });
    const owned = ok(buyVehicle(readyToBuy(), 'tractor', START));
    expect(buyVehicle(owned, 'tractor', START)).toMatchObject({ failure: { code: 'alreadyOwned' } });
  });
});

describe('plowing a block', () => {
  it('plows a 2 x 2 block, paying and earning for each square', () => {
    const before = readyToBuy();
    const after = ok(plowArea(before, block(9, 9, 2), START));
    for (const [x, y] of [[9, 9], [10, 9], [9, 10], [10, 10]] as const) {
      expect(objectAt(after, x, y)).toMatchObject({ kind: 'plot', state: 'plowed' });
    }
    expect(after.coins).toBe(before.coins - 4 * PLOW_COST);
    expect(after.xp).toBe(before.xp + 4);
  });

  it("skips squares it can't plow, and clears withered crops for free", () => {
    // The starter strawberries sit at x 5 to 7, y 5 to 6; let them wither.
    const farm = readyToBuy();
    const withered = START + 100 * HOUR;
    const growing = ok(plant(ok(plowArea(farm, block(4, 4, 1), START)), 4, 4, 'strawberries', withered));
    const after = ok(plowArea(growing, block(4, 4, 2), withered));
    // (4, 4) is growing and (4, 5) is grass; (5, 4) is grass; (5, 5) is withered.
    expect(objectAt(after, 4, 4)).toMatchObject({ state: 'planted' });
    expect(objectAt(after, 5, 5)).toMatchObject({ state: 'plowed' });
    expect(after.coins).toBe(growing.coins - 2 * PLOW_COST);
  });

  it('stops paying when the coins run out', () => {
    const after = ok(plowArea({ ...readyToBuy(), coins: 2 * PLOW_COST }, block(9, 9), START));
    expect(after.coins).toBe(0);
    expect(after.objects.filter((o) => o.kind === 'plot' && o.state === 'plowed')).toHaveLength(2);
  });

  it('fails only when nothing could be plowed', () => {
    const plowed = ok(plowArea(readyToBuy(), block(9, 9, 2), START));
    expect(plowArea(plowed, block(9, 9, 2), START)).toMatchObject({ squares: 0, outcome: { ok: false, failure: { code: 'alreadyPlowed' } } });
  });
});

describe('the seeder', () => {
  const SEEDER = VEHICLES.seeder;
  // A level 15 farm with a plowed 3 x 3 field at (8, 8).
  function plowedField(): FarmState {
    return ok(plowArea({ ...newFarm(START, 5), coins: 20_000, xp: totalXpForLevel(15) }, { x: 8, y: 8, width: 3, depth: 3 }, START));
  }

  it('costs 10,000 coins at level 15 and parks beside the tractor', () => {
    expect(SEEDER).toMatchObject({ level: 15, price: 10_000 });
    expect(buyVehicle({ ...plowedField(), xp: totalXpForLevel(14) }, 'seeder', START)).toMatchObject({ failure: { code: 'levelTooLow', level: 15 } });
    const after = ok(buyVehicle(plowedField(), 'seeder', START));
    expect(ownsVehicle(after, 'seeder')).toBe(true);
    expect(SEEDER.parking).not.toEqual(TRACTOR.parking);
  });

  it('plants every plowed square in a field, paying for each seed', () => {
    const before = plowedField();
    const result = plantArea(before, { x: 7, y: 7, width: 5, depth: 5 }, 'strawberries', START);
    // Only the 9 plowed squares take a seed; the grass around them is skipped.
    expect(result.squares).toBe(9);
    const after = ok(result);
    expect(after.coins).toBe(before.coins - 9 * 10);
    expect(objectAt(after, 10, 10)).toMatchObject({ state: 'planted', cropId: 'strawberries' });
    expect(objectAt(after, 7, 7)).toBeNull();
  });

  it('stops planting when the coins run out', () => {
    const result = plantArea({ ...plowedField(), coins: 25 }, { x: 8, y: 8, width: 3, depth: 3 }, 'strawberries', START);
    expect(result.squares).toBe(2);
  });

  it("fails when there's nowhere to plant", () => {
    expect(plantArea(plowedField(), block(1, 9), 'strawberries', START)).toMatchObject({ squares: 0, outcome: { ok: false } });
  });
});

describe('saves from before vehicles', () => {
  it('own none', () => {
    const { vehicles: _, ...v8 } = { ...newFarm(START, 5), version: 8 };
    expect(parseSave(JSON.parse(JSON.stringify(v8))).vehicles).toEqual([]);
  });
});
