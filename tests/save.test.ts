import { describe, expect, it } from 'vitest';
import { plant, plow } from '../src/core/actions';
import { parseSave, SaveError } from '../src/core/save';
import { newFarm, type FarmState } from '../src/core/state';

const START = Date.UTC(2026, 9, 8, 9, 0);

function roundTrip(state: FarmState): FarmState {
  return parseSave(JSON.parse(JSON.stringify(state)));
}

describe('parseSave', () => {
  it('loads what was saved, unchanged', () => {
    const farm = newFarm(START, 99);
    const plowed = plow(farm, 9, 9, START);
    if (!plowed.ok) throw new Error('plow failed');
    const planted = plant(plowed.state, 9, 9, 'eggplant', START);
    if (!planted.ok) throw new Error('plant failed');
    expect(roundTrip(planted.state)).toEqual(planted.state);
  });

  it('rejects things that are not saves', () => {
    expect(() => parseSave(null)).toThrow(SaveError);
    expect(() => parseSave([])).toThrow(SaveError);
    expect(() => parseSave({ version: 1 })).toThrow(SaveError);
  });

  it('rejects a save from an unknown version', () => {
    expect(() => parseSave({ ...newFarm(START, 1), version: 99 })).toThrow(/version 99/);
  });

  it('rejects unknown crops, overlapping objects and objects off the farm', () => {
    const farm = newFarm(START, 1);
    const withObject = (obj: object): unknown => ({ ...farm, objects: [...farm.objects, obj] });
    expect(() =>
      parseSave(withObject({ id: 'x', kind: 'plot', x: 9, y: 9, state: 'planted', cropId: 'mandrake', plantedAt: 0, witherAt: 1, fertilized: false })),
    ).toThrow(/not a known crop/);
    expect(() => parseSave(withObject({ id: 'x', kind: 'plot', x: 1, y: 1, state: 'plowed' }))).toThrow(/overlap/);
    expect(() => parseSave(withObject({ id: 'x', kind: 'plot', x: 12, y: 0, state: 'plowed' }))).toThrow(/off the farm/);
  });
});
