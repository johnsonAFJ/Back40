// Turns untrusted JSON (from localStorage or a backup file) into a FarmState,
// or explains what's wrong with it. This is the only place a save is checked;
// everything past it trusts the types.
//
// When the save shape changes, SAVE_VERSION goes up and a migration step goes
// in `migrate` below, so old saves keep loading.

import { isBuildingId } from './data/buildings';
import { isCropId } from './data/crops';
import { EXPANSIONS } from './data/expansions';
import { SAVE_VERSION, footprint, type FarmObject, type FarmState } from './state';

export class SaveError extends Error {
  override name = 'SaveError';
}

type Json = { readonly [key: string]: unknown };

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(obj: Json, key: string, where: string): number {
  const value = obj[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new SaveError(`${where}.${key} should be a number`);
  return value;
}

function int(obj: Json, key: string, where: string): number {
  const value = num(obj, key, where);
  if (!Number.isInteger(value)) throw new SaveError(`${where}.${key} should be a whole number`);
  return value;
}

function str(obj: Json, key: string, where: string): string {
  const value = obj[key];
  if (typeof value !== 'string') throw new SaveError(`${where}.${key} should be text`);
  return value;
}

function parseObject(raw: unknown, index: number): FarmObject {
  const where = `objects[${index}]`;
  if (!isRecord(raw)) throw new SaveError(`${where} should be an object`);
  const base = { id: str(raw, 'id', where), x: int(raw, 'x', where), y: int(raw, 'y', where) };
  const kind = raw['kind'];

  if (kind === 'building') {
    const typeId = raw['typeId'];
    if (!isBuildingId(typeId)) throw new SaveError(`${where}.typeId is not a known building`);
    return { ...base, kind, typeId };
  }

  if (kind === 'plot') {
    const state = raw['state'];
    if (state === 'plowed' || state === 'harvested') return { ...base, kind, state };
    if (state === 'planted') {
      const cropId = raw['cropId'];
      if (!isCropId(cropId)) throw new SaveError(`${where}.cropId is not a known crop`);
      const fertilized = raw['fertilized'];
      if (typeof fertilized !== 'boolean') throw new SaveError(`${where}.fertilized should be true or false`);
      return {
        ...base,
        kind,
        state,
        cropId,
        plantedAt: num(raw, 'plantedAt', where),
        witherAt: num(raw, 'witherAt', where),
        fertilized,
      };
    }
    throw new SaveError(`${where}.state is not a known plot state`);
  }

  throw new SaveError(`${where}.kind is not a known kind of object`);
}

// Upgrades an older save to the current shape. Version 1 is the first, so
// there is nothing to upgrade yet.
function migrate(raw: Json): Json {
  const version = raw['version'];
  if (version === SAVE_VERSION) return raw;
  throw new SaveError(`This save is from version ${String(version)}, which this game doesn't know how to load`);
}

export function parseSave(input: unknown): FarmState {
  if (!isRecord(input)) throw new SaveError('The save should be an object');
  const raw = migrate(input);
  const objectsRaw = raw['objects'];
  if (!Array.isArray(objectsRaw)) throw new SaveError('save.objects should be a list');

  const expansion = int(raw, 'expansion', 'save');
  if (expansion < 0 || expansion >= EXPANSIONS.length) throw new SaveError('save.expansion is out of range');
  const size = EXPANSIONS[expansion]?.size ?? 0;

  const objects = objectsRaw.map(parseObject);
  const ids = new Set<string>();
  const taken = new Set<string>();
  for (const obj of objects) {
    if (ids.has(obj.id)) throw new SaveError(`Two objects share the id ${obj.id}`);
    ids.add(obj.id);
    const { width, depth } = footprint(obj);
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < depth; dy++) {
        const x = obj.x + dx;
        const y = obj.y + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) throw new SaveError(`${obj.id} sits off the farm`);
        const key = `${x},${y}`;
        if (taken.has(key)) throw new SaveError(`Two objects overlap at ${key}`);
        taken.add(key);
      }
    }
  }

  return {
    version: SAVE_VERSION,
    seed: int(raw, 'seed', 'save'),
    createdAt: num(raw, 'createdAt', 'save'),
    lastSeenAt: num(raw, 'lastSeenAt', 'save'),
    coins: int(raw, 'coins', 'save'),
    xp: int(raw, 'xp', 'save'),
    expansion,
    nextId: int(raw, 'nextId', 'save'),
    objects,
  };
}
