// Keeps the farm in this browser's localStorage. Each address keeps its own
// save: localhost:8440, the published site and the home-screen app are three
// separate farms. Backup export and import arrive in milestone 7.
//
// Every GitHub Pages project on johnsonafj.github.io shares one storage area,
// so the key must not collide with HabitMonster's or MicroHabitGarden's.

import { parseSave, SaveError } from '../core/save';
import { newFarm, type FarmState } from '../core/state';
import { newSeed } from '../core/rng';

const KEY = 'back40';

// What loading found. A `newer` save comes from a later version of the game
// (say, a test build) and must not be touched: the game shows a message and
// doesn't save over it. An `unreadable` save is kept under another key
// before a new farm starts, so nothing is ever silently lost.
export type Loaded =
  | { readonly kind: 'ok'; readonly farm: FarmState }
  | { readonly kind: 'new'; readonly farm: FarmState }
  | { readonly kind: 'unreadable'; readonly farm: FarmState; readonly keptAs: string | null }
  | { readonly kind: 'newer'; readonly message: string };

export function loadFarm(now: number): Loaded {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked (private mode in some browsers). Play without saving.
    return { kind: 'new', farm: newFarm(now, newSeed()) };
  }
  if (raw === null) return { kind: 'new', farm: newFarm(now, newSeed()) };
  try {
    return { kind: 'ok', farm: parseSave(JSON.parse(raw)) };
  } catch (err) {
    if (err instanceof SaveError && err.reason === 'newer') return { kind: 'newer', message: err.message };
    // Keep the unreadable copy so a bad save never silently erases a farm.
    const keptAs = `${KEY}-unreadable-${now}`;
    let kept: string | null = keptAs;
    try {
      localStorage.setItem(keptAs, raw);
    } catch {
      kept = null;
    }
    console.error('The saved farm could not be read. A copy was kept in localStorage.', err);
    return { kind: 'unreadable', farm: newFarm(now, newSeed()), keptAs: kept };
  }
}

export function saveFarm(state: FarmState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
