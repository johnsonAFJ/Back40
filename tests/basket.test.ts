import { describe, expect, it } from 'vitest';
import { harvest, place, type Outcome } from '../src/core/actions';
import { basketContents, basketTotal, basketValue, sellBasket, sellProduce } from '../src/core/basket';
import { HOUR } from '../src/core/clock';
import { parseSave } from '../src/core/save';
import { newFarm, type FarmState } from '../src/core/state';

const START = Date.UTC(2026, 9, 8, 9, 0);

function ok(outcome: Outcome): FarmState {
  if (!outcome.ok) throw new Error(`Expected success, got ${outcome.failure.code}`);
  return outcome.state;
}

// A farm with two chickens and an apple tree, all ready to collect.
function farmWithAnimals(): FarmState {
  let farm = { ...newFarm(START, 9), coins: 10_000, xp: 10_000 };
  farm = ok(place(farm, { kind: 'animal', id: 'chicken' }, 9, 9, START));
  farm = ok(place(farm, { kind: 'animal', id: 'chicken' }, 10, 9, START));
  farm = ok(place(farm, { kind: 'tree', id: 'appleTree' }, 11, 9, START));
  return farm;
}

describe('collecting', () => {
  it('puts produce in the basket, with XP but no coins', () => {
    const before = farmWithAnimals();
    const later = START + 72 * HOUR;
    const outcome = harvest(before, 9, 9, later);
    expect(outcome).toMatchObject({ ok: true, reward: { coins: 0, xp: 1, produce: ['eggs'] } });
    let farm = ok(outcome);
    farm = ok(harvest(farm, 10, 9, later));
    farm = ok(harvest(farm, 11, 9, later));
    expect(farm.coins).toBe(before.coins);
    expect(farm.basket).toEqual({ eggs: 2, apples: 1 });
    expect(basketTotal(farm.basket)).toBe(3);
    expect(basketValue(farm.basket)).toBe(2 * 15 + 30);
  });

  it('leaves crops selling on the spot', () => {
    const farm = newFarm(START, 9);
    expect(harvest(farm, 5, 5, START + HOUR)).toMatchObject({ reward: { coins: 35, produce: [] } });
  });
});

describe('selling from the basket', () => {
  const full: FarmState = { ...newFarm(START, 9), basket: { eggs: 4, apples: 2, wool: 1 } };

  it('sells one kind at a time', () => {
    const sale = sellProduce(full, 'eggs');
    expect(sale.coins).toBe(60);
    expect(sale.sold).toBe(4);
    expect(sale.state.coins).toBe(full.coins + 60);
    expect(sale.state.basket).toEqual({ apples: 2, wool: 1 });
  });

  it('sells everything at once', () => {
    const sale = sellBasket(full);
    expect(sale.coins).toBe(4 * 15 + 2 * 30 + 120);
    expect(sale.state.basket).toEqual({});
  });

  it('lists what is in it, in a stable order', () => {
    expect(basketContents(full.basket)).toEqual([
      { id: 'apples', count: 2 },
      { id: 'eggs', count: 4 },
      { id: 'wool', count: 1 },
    ]);
  });

  it('survives a save and reload, and rejects nonsense', () => {
    expect(parseSave(JSON.parse(JSON.stringify(full))).basket).toEqual(full.basket);
    expect(() => parseSave({ ...full, basket: { gold: 3 } })).toThrow(/not a known kind of produce/);
    expect(() => parseSave({ ...full, basket: { eggs: -1 } })).toThrow(/whole number/);
  });
});
