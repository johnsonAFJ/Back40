// Keeps the farm in this browser's localStorage. Each address keeps its own
// save: localhost:8440, the published site and the home-screen app are three
// separate farms. Backup export and import arrive in milestone 7.
//
// Every GitHub Pages project on johnsonafj.github.io shares one storage area,
// so the key must not collide with HabitMonster's or MicroHabitGarden's.

import { parseSave } from '../core/save';
import { newFarm, type FarmState } from '../core/state';
import { newSeed } from '../core/rng';

const KEY = 'back40';

export function loadFarm(now: number): FarmState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked (private mode in some browsers). Play without saving.
    return newFarm(now, newSeed());
  }
  if (raw === null) return newFarm(now, newSeed());
  try {
    return parseSave(JSON.parse(raw));
  } catch (err) {
    // Keep the unreadable copy so a bad save never silently erases a farm.
    try {
      localStorage.setItem(`${KEY}-unreadable-${now}`, raw);
    } catch {
      // Nowhere to keep it; the error below still records what happened.
    }
    console.error('The saved farm could not be read. A copy was kept in localStorage.', err);
    return newFarm(now, newSeed());
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
