// Backup files: the whole farm as JSON, to keep somewhere safe or to move a
// farm between the browser, the home-screen app and another device (each of
// those keeps its own save).

import { parseSave } from '../core/save';
import type { FarmState } from '../core/state';

// Saves a backup file. The home-screen app on a phone can't download files,
// so there it opens the share sheet instead ("Save to Files", AirDrop,
// email). Returns false if the share sheet was cancelled.
export async function saveBackup(farm: FarmState, date: string): Promise<boolean> {
  const name = `back40-${date}.json`;
  const json = JSON.stringify(farm, null, 2);
  const file = new File([json], name, { type: 'application/json' });
  const installed = window.matchMedia('(display-mode: standalone)').matches;
  if (installed && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch {
      return false;
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

// Reads a backup file into a farm, upgrading an older one. Throws a
// SaveError explaining what's wrong if it isn't a Back40 backup, or comes
// from a newer version of the game.
export async function readBackup(file: File): Promise<FarmState> {
  return parseSave(JSON.parse(await file.text()));
}
