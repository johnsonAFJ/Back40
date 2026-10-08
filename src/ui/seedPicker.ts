// The seed button and the list of seeds behind it. Choosing a seed doesn't
// buy anything; each planting pays for itself. Milestone 3 replaces this
// with the full market.

import { CROPS, CROP_IDS, type CropId } from '../core/data/crops';
import { cropColor } from '../render/draw/crops';
import { formatCoins, formatGrowTime } from './format';

export type SeedPicker = {
  readonly selected: () => CropId;
  readonly setLevel: (level: number) => void;
  readonly close: () => void;
};

export function createSeedPicker(button: HTMLButtonElement, panel: HTMLElement): SeedPicker {
  let selected: CropId = 'strawberries';
  let level = 1;

  const renderButton = (): void => {
    button.innerHTML = `
      <span class="swatch" style="background:${cropColor(selected)}"></span>
      <span class="seed-name">${CROPS[selected].name}</span>
      <span class="caret" aria-hidden="true">▴</span>`;
  };

  const renderPanel = (): void => {
    const unlocked = CROP_IDS.filter((id) => CROPS[id].level <= level);
    const next = CROP_IDS.find((id) => CROPS[id].level > level);
    panel.innerHTML = `
      <h2>Seeds</h2>
      <ul class="seed-list">
        ${unlocked
          .map((id) => {
            const c = CROPS[id];
            return `
            <li>
              <button type="button" class="seed-row" data-crop="${id}" aria-pressed="${id === selected}">
                <span class="swatch" style="background:${cropColor(id)}"></span>
                <span class="seed-main">
                  <span class="seed-name">${c.name}</span>
                  <span class="seed-meta">${formatGrowTime(c.hours)} · +${c.plantXp + 2} XP</span>
                </span>
                <span class="seed-money">
                  <span>Seed ${formatCoins(c.seed)}</span>
                  <span>Sells ${formatCoins(c.sells)}</span>
                </span>
              </button>
            </li>`;
          })
          .join('')}
      </ul>
      ${next ? `<p class="seed-next">${CROPS[next].name} unlocks at level ${CROPS[next].level}</p>` : ''}`;
  };

  const open = (): void => {
    renderPanel();
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    panel.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
  };

  const close = (): void => {
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  button.addEventListener('click', () => (panel.hidden ? open() : close()));
  panel.addEventListener('click', (e) => {
    const row = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-crop]') : null;
    const id = row?.dataset['crop'];
    if (!id || !(id in CROPS)) return;
    selected = CROP_IDS.find((c) => c === id) ?? selected;
    renderButton();
    close();
    button.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      close();
      button.focus();
    }
  });

  renderButton();
  close();

  return {
    selected: () => selected,
    setLevel(next) {
      level = next;
      if (!panel.hidden) renderPanel();
    },
    close,
  };
}
