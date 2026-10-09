import { describe, expect, it } from 'vitest';
import { harvest, move, place, type Outcome } from '../src/core/actions';
import { HOUR } from '../src/core/clock';
import { parseSave } from '../src/core/save';
import { newFarm, objectsAt, type FarmState } from '../src/core/state';
import { animalSlots } from '../src/render/animalSlots';

const START = Date.UTC(2026, 9, 8, 9, 0);

function ok(outcome: Outcome): FarmState {
  if (!outcome.ok) throw new Error(`Expected success, got ${outcome.failure.code}`);
  return outcome.state;
}

function rich(): FarmState {
  return { ...newFarm(START, 5), coins: 100_000, xp: 100_000 };
}

describe('animals sharing a square', () => {
  it('fits four chickens, one click each, and refuses a fifth', () => {
    let farm = rich();
    for (let i = 0; i < 4; i++) farm = ok(place(farm, { kind: 'animal', id: 'chicken' }, 9, 9, START));
    expect(objectsAt(farm, 9, 9)).toHaveLength(4);
    expect(place(farm, { kind: 'animal', id: 'chicken' }, 9, 9, START)).toMatchObject({ failure: { code: 'squareFull' } });
  });

  it('fits two sheep, or a sheep and two chickens, but a cow only alone', () => {
    let farm = ok(place(rich(), { kind: 'animal', id: 'sheep' }, 9, 9, START));
    farm = ok(place(farm, { kind: 'animal', id: 'chicken' }, 9, 9, START));
    farm = ok(place(farm, { kind: 'animal', id: 'chicken' }, 9, 9, START));
    expect(place(farm, { kind: 'animal', id: 'pig' }, 9, 9, START)).toMatchObject({ failure: { code: 'squareFull' } });

    const withCow = ok(place(rich(), { kind: 'animal', id: 'cow' }, 9, 9, START));
    expect(place(withCow, { kind: 'animal', id: 'chicken' }, 9, 9, START)).toMatchObject({ failure: { code: 'squareFull' } });
  });

  it("doesn't let anything but animals in", () => {
    const farm = ok(place(rich(), { kind: 'animal', id: 'chicken' }, 9, 9, START));
    expect(place(farm, { kind: 'decoration', id: 'hayBale' }, 9, 9, START)).toMatchObject({ failure: { code: 'blocked' } });
    const tree = ok(place(rich(), { kind: 'tree', id: 'appleTree' }, 9, 9, START));
    expect(place(tree, { kind: 'animal', id: 'chicken' }, 9, 9, START)).toMatchObject({ failure: { code: 'blocked' } });
  });

  it('collects from every ready animal in one click', () => {
    let farm = ok(place(rich(), { kind: 'animal', id: 'chicken' }, 9, 9, START));
    farm = ok(place(farm, { kind: 'animal', id: 'chicken' }, 9, 9, START));
    farm = ok(place(farm, { kind: 'animal', id: 'sheep' }, 9, 9, START));
    // A day later the chickens are ready; the sheep (three days) isn't.
    const outcome = harvest(farm, 9, 9, START + 24 * HOUR);
    expect(outcome).toMatchObject({ ok: true, reward: { xp: 2, produce: ['eggs', 'eggs'] } });
    if (!outcome.ok) return;
    expect(outcome.state.basket).toEqual({ eggs: 2 });
    expect(harvest(outcome.state, 9, 9, START + 25 * HOUR)).toMatchObject({ failure: { code: 'producing' } });
  });

  it('lets an animal move into a square with room', () => {
    let farm = ok(place(rich(), { kind: 'animal', id: 'chicken' }, 9, 9, START));
    farm = ok(place(farm, { kind: 'animal', id: 'chicken' }, 10, 9, START));
    const second = objectsAt(farm, 10, 9)[0];
    farm = ok(move(farm, second?.id ?? '', 9, 9, START));
    expect(objectsAt(farm, 9, 9)).toHaveLength(2);
  });

  it('saves and loads a shared square', () => {
    let farm = rich();
    for (let i = 0; i < 4; i++) farm = ok(place(farm, { kind: 'animal', id: 'chicken' }, 9, 9, START));
    expect(parseSave(JSON.parse(JSON.stringify(farm)))).toEqual(farm);
  });

  it('gives every animal in a square its own spot', () => {
    let farm = rich();
    for (let i = 0; i < 4; i++) farm = ok(place(farm, { kind: 'animal', id: 'chicken' }, 9, 9, START));
    const spots = [...animalSlots(farm.objects).values()].map((s) => `${s.u},${s.v}`);
    expect(new Set(spots).size).toBe(4);
  });
});
