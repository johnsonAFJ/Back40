import { describe, expect, it } from 'vitest';
import { harvest, move, place, plant, plow, sell, sellValue, useMultiTool, type Outcome } from '../src/core/actions';
import { HOUR } from '../src/core/clock';
import { isProducerReady } from '../src/core/producers';
import { parseSave } from '../src/core/save';
import { newFarm, objectAt, type FarmState } from '../src/core/state';

const START = Date.UTC(2026, 9, 8, 9, 0);

function ok(outcome: Outcome): FarmState {
  if (!outcome.ok) throw new Error(`Expected success, got ${outcome.failure.code}`);
  return outcome.state;
}

// A farm with money and levels to spare, for testing what things do rather
// than what they cost.
function richFarm(): FarmState {
  return { ...newFarm(START, 7), coins: 100_000, xp: 10_000 };
}

describe('placing', () => {
  it('buys a tree and charges its price and XP', () => {
    const farm = ok(place(newFarm(START, 7), { kind: 'tree', id: 'appleTree' }, 9, 9, START));
    expect(farm.coins).toBe(150);
    expect(farm.xp).toBe(1);
    expect(objectAt(farm, 9, 9)).toMatchObject({ kind: 'tree', typeId: 'appleTree', lastHarvestAt: START });
  });

  it('covers every tile of a big building', () => {
    const farm = ok(place(richFarm(), { kind: 'decoration', id: 'redBarn' }, 8, 8, START));
    expect(objectAt(farm, 10, 10)).toMatchObject({ typeId: 'redBarn' });
    expect(objectAt(farm, 11, 10)).toBeNull();
  });

  it('refuses spots that are taken, off the farm, too small, locked or unaffordable', () => {
    const farm = newFarm(START, 7);
    expect(place(farm, { kind: 'tree', id: 'appleTree' }, 1, 1, START)).toMatchObject({ failure: { code: 'blocked' } });
    expect(place(richFarm(), { kind: 'decoration', id: 'redBarn' }, 10, 10, START)).toMatchObject({ failure: { code: 'noRoom' } });
    expect(place(farm, { kind: 'animal', id: 'cow' }, 9, 9, START)).toMatchObject({ failure: { code: 'levelTooLow', level: 5 } });
    expect(place({ ...farm, coins: 40 }, { kind: 'tree', id: 'appleTree' }, 9, 9, START)).toMatchObject({
      failure: { code: 'notEnoughCoins', needed: 50 },
    });
  });
});

describe('trees and animals', () => {
  it('produce on a timer and restart it when collected', () => {
    let farm = ok(place(richFarm(), { kind: 'animal', id: 'chicken' }, 9, 9, START));
    expect(harvest(farm, 9, 9, START + 23 * HOUR)).toMatchObject({ failure: { code: 'producing' } });

    const coins = farm.coins;
    farm = ok(useMultiTool(farm, 9, 9, 'strawberries', START + 24 * HOUR));
    // The egg goes in the basket; coins come when it's sold.
    expect(farm.coins).toBe(coins);
    expect(farm.basket).toEqual({ eggs: 1 });
    const chicken = objectAt(farm, 9, 9);
    if (chicken?.kind !== 'animal') throw new Error('chicken missing');
    expect(chicken.lastHarvestAt).toBe(START + 24 * HOUR);
    expect(isProducerReady(chicken, START + 47 * HOUR)).toBe(false);
  });

  it('never wither, however long they wait', () => {
    const farm = ok(place(richFarm(), { kind: 'tree', id: 'appleTree' }, 9, 9, START));
    expect(harvest(farm, 9, 9, START + 1000 * HOUR).ok).toBe(true);
  });
});

describe('moving', () => {
  it('moves anything, crops and all, for free', () => {
    let farm = ok(plow(richFarm(), 9, 9, START));
    farm = ok(plant(farm, 9, 9, 'wheat', START));
    const plot = objectAt(farm, 9, 9);
    const moved = ok(move(farm, plot?.id ?? '', 10, 4, START));
    expect(moved.coins).toBe(farm.coins);
    expect(objectAt(moved, 9, 9)).toBeNull();
    expect(objectAt(moved, 10, 4)).toMatchObject({ cropId: 'wheat', plantedAt: START });
  });

  it('lets a building shift onto tiles it already covers', () => {
    const farm = newFarm(START, 7);
    const house = objectAt(farm, 0, 0);
    expect(move(farm, house?.id ?? '', 1, 0, START).ok).toBe(true);
  });

  it('refuses to move onto something else', () => {
    const farm = newFarm(START, 7);
    const house = objectAt(farm, 0, 0);
    expect(move(farm, house?.id ?? '', 4, 4, START)).toMatchObject({ failure: { code: 'blocked' } });
  });
});

describe('selling', () => {
  it('returns a third of the price, rounded down', () => {
    const farm = ok(place(richFarm(), { kind: 'decoration', id: 'hayBale' }, 9, 9, START));
    const bale = objectAt(farm, 9, 9);
    if (!bale) throw new Error('bale missing');
    expect(sellValue(bale)).toBe(33);
    const sold = ok(sell(farm, bale.id, START));
    expect(sold.coins).toBe(farm.coins + 33);
    expect(objectAt(sold, 9, 9)).toBeNull();
  });

  it('sells a 75 coin picket fence for 25', () => {
    const farm = ok(place(richFarm(), { kind: 'decoration', id: 'picketFence' }, 9, 9, START));
    const fence = objectAt(farm, 9, 9);
    if (!fence) throw new Error('fence missing');
    expect(sellValue(fence)).toBe(25);
  });

  it('removes a plot for nothing, crop and all', () => {
    const farm = newFarm(START, 7);
    const plot = objectAt(farm, 5, 5);
    const sold = ok(sell(farm, plot?.id ?? '', START));
    expect(sold.coins).toBe(farm.coins);
    expect(objectAt(sold, 5, 5)).toBeNull();
  });

  it("won't sell the farmhouse", () => {
    const farm = newFarm(START, 7);
    expect(sell(farm, objectAt(farm, 0, 0)?.id ?? '', START)).toMatchObject({ failure: { code: 'cantSell' } });
  });
});

describe('saves from milestone 2', () => {
  it('migrate step by step to the current version with nothing lost', () => {
    const { timeOffset: _, basket: __, ...v1 } = { ...newFarm(START, 7), version: 1 };
    const loaded = parseSave(JSON.parse(JSON.stringify(v1)));
    expect(loaded.version).toBe(4);
    expect(loaded.objects).toEqual(v1.objects);
    expect(loaded.timeOffset).toBe(0);
    expect(loaded.basket).toEqual({});
  });

  it('round-trip trees, animals and decorations', () => {
    let farm = ok(place(richFarm(), { kind: 'tree', id: 'plumTree' }, 9, 9, START));
    farm = ok(place(farm, { kind: 'animal', id: 'horse' }, 9, 10, START));
    farm = ok(place(farm, { kind: 'decoration', id: 'shed' }, 10, 2, START));
    expect(parseSave(JSON.parse(JSON.stringify(farm)))).toEqual(farm);
  });
});
