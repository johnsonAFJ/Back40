// The market: every crop in the game, with the ones above your level shown
// locked. Choosing a crop doesn't buy anything; it becomes the seed the
// multi-tool plants, and each planting pays for itself, as in the original.
// Trees, animals and decorations join as tabs in milestone 4.

import { CROPS, CROP_IDS, isCropId, type CropId } from '../core/data/crops';
import { PLOW_XP, HARVEST_XP } from '../core/data/economy';
import { isUnlocked } from '../core/unlocks';
import { cropThumbnail } from '../render/thumbnails';
import { formatCoins, formatGrowTime } from './format';

const SEED_KEY = 'back40-seed';

export type Market = {
  readonly selected: () => CropId;
  readonly setLevel: (level: number) => void;
  readonly open: () => void;
};

// The last seed chosen is a per-browser convenience, not part of the farm.
function rememberedSeed(): CropId {
  try {
    const saved = localStorage.getItem(SEED_KEY);
    return isCropId(saved) ? saved : 'strawberries';
  } catch {
    return 'strawberries';
  }
}

function rememberSeed(id: CropId): void {
  try {
    localStorage.setItem(SEED_KEY, id);
  } catch {
    // Not remembering the seed is harmless.
  }
}

// Market order: by unlock level, then cheapest first.
const ORDER = [...CROP_IDS].sort((a, b) => CROPS[a].level - CROPS[b].level || CROPS[a].seed - CROPS[b].seed);

export function createMarket(dialog: HTMLDialogElement, button: HTMLButtonElement, onChoose: () => void): Market {
  let level = 1;
  let selected = rememberedSeed();

  const renderButton = (): void => {
    button.innerHTML = `
      <img class="button-thumb" src="${cropThumbnail(selected)}" alt="" />
      <span class="button-text">
        <span class="button-label">Planting</span>
        <span class="button-value">${CROPS[selected].name}</span>
      </span>`;
  };

  const card = (id: CropId): string => {
    const c = CROPS[id];
    const open = isUnlocked(id, level);
    const current = id === selected;
    return `
      <li>
        <button type="button" class="card" data-crop="${id}" ${open ? '' : 'disabled'} aria-pressed="${current}">
          <img class="card-thumb" src="${cropThumbnail(id)}" alt="" />
          <span class="card-name">${c.name}</span>
          ${
            open
              ? `<span class="card-line">${formatGrowTime(c.hours)} · +${c.plantXp + PLOW_XP + HARVEST_XP} XP</span>
                 <span class="card-line card-money"><span class="coin coin-small" aria-hidden="true"></span>${formatCoins(c.seed)} → ${formatCoins(c.sells)}</span>`
              : `<span class="card-lock">Level ${c.level}</span>`
          }
          ${current ? '<span class="card-tag">Planting</span>' : ''}
        </button>
      </li>`;
  };

  const renderDialog = (): void => {
    dialog.innerHTML = `
      <div class="market">
        <header class="market-head">
          <h2>Market</h2>
          <button type="button" class="close" data-close aria-label="Close market">×</button>
        </header>
        <p class="market-hint">Pick a crop to plant. You pay for seeds as you plant them.</p>
        <ul class="cards">${ORDER.map(card).join('')}</ul>
      </div>`;
  };

  const choose = (id: CropId): void => {
    selected = id;
    rememberSeed(id);
    renderButton();
    dialog.close();
    onChoose();
  };

  dialog.addEventListener('click', (e) => {
    // A click on the dialog element itself is a click on the backdrop.
    if (e.target === dialog) {
      dialog.close();
      return;
    }
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('[data-close]')) {
      dialog.close();
      return;
    }
    const id = target?.closest<HTMLButtonElement>('[data-crop]')?.dataset['crop'];
    if (isCropId(id) && isUnlocked(id, level)) choose(id);
  });

  button.addEventListener('click', () => {
    renderDialog();
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
  });

  renderButton();

  return {
    selected: () => selected,
    setLevel(next) {
      level = next;
      // A remembered seed from a farm with a higher level falls back to one
      // this farm can plant.
      if (!isUnlocked(selected, level)) {
        selected = 'strawberries';
        renderButton();
      }
      if (dialog.open) renderDialog();
    },
    open: () => button.click(),
  };
}
