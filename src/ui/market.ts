// The market: seeds, trees, animals and decorations, with anything above
// your level shown locked.
//
// Choosing a seed doesn't buy anything; it becomes the seed the multi-tool
// plants, and each planting pays for itself, as in the original. Choosing a
// tree, animal or decoration puts it in your hand to place, and it's paid for
// when it goes down.

import { productInfo, productsOf, type Placeable, type Product, type ProductKind } from '../core/catalog';
import { CROPS, isCropId, type CropId } from '../core/data/crops';
import { HARVEST_XP, PLOW_XP } from '../core/data/economy';
import { ANIMALS, DECORATIONS, TREES } from '../core/data/items';
import { isUnlocked } from '../core/unlocks';
import { productThumbnail } from '../render/thumbnails';
import { formatCoins, formatGrowTime } from './format';

const SEED_KEY = 'back40-seed';

const TABS: ReadonlyArray<{ readonly kind: ProductKind; readonly label: string }> = [
  { kind: 'crop', label: 'Seeds' },
  { kind: 'tree', label: 'Trees' },
  { kind: 'animal', label: 'Animals' },
  { kind: 'decoration', label: 'Decorations' },
];

export type Market = {
  readonly selected: () => CropId;
  readonly setStatus: (level: number, coins: number) => void;
};

export type MarketActions = {
  readonly onSeed: () => void;
  readonly onBuy: (item: Placeable) => void;
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

const coinIcon = '<span class="coin coin-small" aria-hidden="true"></span>';

// The facts under a card's name, which differ by kind.
function details(p: Product): string {
  switch (p.kind) {
    case 'crop': {
      const c = CROPS[p.id];
      return `<span class="card-line">${formatGrowTime(c.hours)} · +${c.plantXp + PLOW_XP + HARVEST_XP} XP</span>
        <span class="card-line card-money">${coinIcon}${formatCoins(c.seed)} → ${formatCoins(c.sells)}</span>`;
    }
    case 'tree':
    case 'animal': {
      const item = p.kind === 'tree' ? TREES[p.id] : ANIMALS[p.id];
      return `<span class="card-line">${item.product} every ${formatGrowTime(item.hours)}, sells ${formatCoins(item.sells)}</span>
        <span class="card-line card-money">${coinIcon}${formatCoins(item.price)} · +${item.buyXp} XP</span>`;
    }
    case 'decoration': {
      const d = DECORATIONS[p.id];
      const size = d.width > 1 ? `${d.width} × ${d.depth} · ` : '';
      return `<span class="card-line">${size}+${d.buyXp} XP</span>
        <span class="card-line card-money">${coinIcon}${formatCoins(d.price)}</span>`;
    }
    default: {
      const _exhaustive: never = p;
      return _exhaustive;
    }
  }
}

export function createMarket(dialog: HTMLDialogElement, button: HTMLButtonElement, actions: MarketActions): Market {
  let level = 1;
  let coins = 0;
  let tab: ProductKind = 'crop';
  let selected = rememberedSeed();

  const renderButton = (): void => {
    button.innerHTML = `
      <img class="button-thumb" src="${productThumbnail({ kind: 'crop', id: selected })}" alt="" />
      <span class="button-text">
        <span class="button-label">Planting</span>
        <span class="button-value">${CROPS[selected].name}</span>
      </span>`;
  };

  const card = (p: Product): string => {
    const info = productInfo(p);
    const open = isUnlocked(p, level);
    const affordable = p.kind === 'crop' || coins >= info.price;
    const current = p.kind === 'crop' && p.id === selected;
    const note = !open ? `<span class="card-lock">Level ${info.level}</span>` : details(p);
    return `
      <li>
        <button type="button" class="card" data-kind="${p.kind}" data-id="${p.id}"
          ${open ? '' : 'disabled'} ${open && !affordable ? 'data-short="true"' : ''} aria-pressed="${current}">
          <img class="card-thumb" src="${productThumbnail(p)}" alt="" />
          <span class="card-name">${info.name}</span>
          ${note}
          ${current ? '<span class="card-tag">Planting</span>' : ''}
        </button>
      </li>`;
  };

  const render = (): void => {
    const hint =
      tab === 'crop'
        ? 'Pick a crop to plant. You pay for seeds as you plant them.'
        : 'Pick something, then click where it goes on your farm.';
    dialog.innerHTML = `
      <div class="market">
        <header class="market-head">
          <h2>Market</h2>
          <button type="button" class="close" data-close aria-label="Close market">×</button>
        </header>
        <div class="tabs" role="tablist">
          ${TABS.map(
            (t) =>
              `<button type="button" role="tab" class="tab" data-tab="${t.kind}" aria-selected="${t.kind === tab}">${t.label}</button>`,
          ).join('')}
        </div>
        <p class="market-hint">${hint}</p>
        <ul class="cards">${productsOf(tab).map(card).join('')}</ul>
      </div>`;
  };

  const productFrom = (el: HTMLElement): Product | null => {
    const kind = el.dataset['kind'];
    const id = el.dataset['id'];
    for (const t of TABS) {
      if (t.kind !== kind) continue;
      return productsOf(t.kind).find((p) => p.id === id) ?? null;
    }
    return null;
  };

  dialog.addEventListener('click', (e) => {
    // A click on the dialog element itself is a click on the backdrop.
    if (e.target === dialog) return dialog.close();
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest('[data-close]')) return dialog.close();

    const tabButton = target.closest<HTMLElement>('[data-tab]');
    const nextTab = TABS.find((t) => t.kind === tabButton?.dataset['tab']);
    if (nextTab) {
      tab = nextTab.kind;
      render();
      dialog.querySelector<HTMLElement>(`[data-tab="${tab}"]`)?.focus();
      return;
    }

    const cardButton = target.closest<HTMLElement>('[data-kind]');
    const p = cardButton ? productFrom(cardButton) : null;
    if (!p || !isUnlocked(p, level)) return;
    dialog.close();
    if (p.kind === 'crop') {
      selected = p.id;
      rememberSeed(p.id);
      renderButton();
      actions.onSeed();
    } else {
      actions.onBuy(p);
    }
  });

  button.addEventListener('click', () => {
    render();
    dialog.showModal();
    const current = dialog.querySelector<HTMLElement>('[aria-pressed="true"]');
    (current ?? dialog.querySelector<HTMLElement>('[aria-selected="true"]'))?.focus();
  });

  renderButton();

  return {
    selected: () => selected,
    setStatus(nextLevel, nextCoins) {
      level = nextLevel;
      coins = nextCoins;
      // A remembered seed from a farm with a higher level falls back to one
      // this farm can plant.
      if (!isUnlocked({ kind: 'crop', id: selected }, level)) {
        selected = 'strawberries';
        renderButton();
      }
      if (dialog.open) render();
    },
  };
}
