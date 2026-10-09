// The Farm menu: saving and loading backups, and what version this is.

import { levelForXp } from '../core/levels';
import { SAVE_VERSION, type FarmState } from '../core/state';
import { formatCoins } from './format';

export type FarmMenuActions = {
  readonly save: () => void;
  readonly load: (file: File) => void;
};

export function createFarmMenu(button: HTMLButtonElement, dialog: HTMLDialogElement, actions: FarmMenuActions): void {
  const render = (): void => {
    dialog.innerHTML = `
      <div class="farm-menu">
        <header class="market-head">
          <h2>Farm</h2>
          <button type="button" class="close" data-close aria-label="Close">×</button>
        </header>
        <section class="menu-section">
          <h3>Backups</h3>
          <p>Your farm is saved in this browser automatically. A backup is a copy you keep somewhere safe, or open on another device.</p>
          <div class="menu-buttons">
            <button type="button" class="primary" data-save>Save a backup</button>
            <label class="secondary file-button">
              Load a backup
              <input type="file" accept="application/json,.json" data-load />
            </label>
          </div>
        </section>
        <p class="menu-version">Back40 · build ${__BUILD__} · save version ${SAVE_VERSION}</p>
      </div>`;
  };

  button.addEventListener('click', () => {
    render();
    dialog.showModal();
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) return dialog.close();
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('[data-close]')) return dialog.close();
    if (target?.closest('[data-save]')) actions.save();
  });

  dialog.addEventListener('change', (e) => {
    const input = e.target instanceof HTMLInputElement ? e.target : null;
    const file = input?.files?.[0];
    if (!input || !file) return;
    input.value = '';
    dialog.close();
    actions.load(file);
  });
}

// One line describing a farm, for the "replace your farm?" question.
export function farmSummary(farm: FarmState): string {
  return `level ${levelForXp(farm.xp)}, ${formatCoins(farm.coins)} coins, ${farm.objects.length} things on it`;
}
