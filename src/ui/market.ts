// The market: seeds, trees, animals and decorations, with anything above
// your level shown locked.
//
// Choosing a seed doesn't buy anything; it becomes the seed the multi-tool
// plants, and each planting pays for itself, as in the original. Choosing a
// tree, animal or decoration puts it in your hand to place, and it's paid for
// when it goes down.

import { PRODUCT_KINDS, productInfo, productsOf, type Placeable, type Product, type ProductKind } from '../core/catalog';
import { CROPS, isCropId, type CropId } from '../core/data/crops';
import { HARVEST_XP, PLOW_XP } from '../core/data/economy';
import { ANIMALS, DECORATIONS, TREES } from '../core/data/items';
import { EXPANSIONS } from '../core/data/expansions';
import { NEIGHBORS } from '../core/data/neighbors';
import { PRODUCE } from '../core/data/produce';
import { CLIMBING_CROPS, SUPPORTS } from '../core/data/supports';
import { neighborsAt } from '../core/land';
import { levelForXp } from '../core/levels';
import type { FarmState } from '../core/state';
import { isUnlocked } from '../core/unlocks';
import { productThumbnail } from '../render/thumbnails';
import { formatCoins, formatGrowTime } from './format';

const SEED_KEY = 'back40-seed';

// The Land tab sells farm expansions rather than things to put on the farm,
// and Gifts holds what neighbors have given you, free to place.
type Tab = ProductKind | 'land' | 'gifts';

const TABS: ReadonlyArray<{ readonly kind: Tab; readonly label: string }> = [
  { kind: 'crop', label: 'Seeds' },
  { kind: 'tree', label: 'Trees' },
  { kind: 'animal', label: 'Animals' },
  { kind: 'decoration', label: 'Decorations' },
  { kind: 'land', label: 'Land' },
  { kind: 'gifts', label: 'Gifts' },
];

export type Market = {
  readonly selected: () => CropId;
  readonly setFarm: (farm: FarmState) => void;
};

export type MarketActions = {
  readonly onSeed: () => void;
  readonly onBuy: (item: Placeable) => void;
  readonly onExpand: () => void;
  readonly onGift: (index: number) => void;
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
        <span class="card-line card-money">${coinIcon}${formatCoins(c.seed)} → ${formatCoins(c.sells)}</span>
        ${CLIMBING_CROPS.has(p.id) ? '<span class="card-line">Grows on a trellis</span>' : ''}`;
    }
    case 'tree':
    case 'animal': {
      const item = p.kind === 'tree' ? TREES[p.id] : ANIMALS[p.id];
      const produce = PRODUCE[item.product];
      return `<span class="card-line">${produce.name} every ${formatGrowTime(item.hours)}, ${formatCoins(produce.sells)} each</span>
        <span class="card-line card-money">${coinIcon}${formatCoins(item.price)} · +${item.buyXp} XP</span>`;
    }
    case 'decoration': {
      const d = DECORATIONS[p.id];
      const size = d.width > 1 ? `${d.width} × ${d.depth} · ` : '';
      return `<span class="card-line">${size}+${d.buyXp} XP</span>
        <span class="card-line card-money">${coinIcon}${formatCoins(d.price)}</span>`;
    }
    case 'support': {
      const t = SUPPORTS[p.id];
      const climbers = [...CLIMBING_CROPS].map((id) => CROPS[id].name).join(', ');
      return `<span class="card-line">For ${climbers} · never needs plowing</span>
        <span class="card-line card-money">${coinIcon}${formatCoins(t.price)} · +${t.buyXp} XP</span>`;
    }
    default: {
      const _exhaustive: never = p;
      return _exhaustive;
    }
  }
}

// What a tab lists. Supports sit among the seeds, right after the last
// climbing crop, so the trellis is next to grapes.
function tabProducts(kind: ProductKind): Product[] {
  if (kind !== 'crop') return productsOf(kind);
  const crops = productsOf('crop');
  const after = crops.reduce((last, p, i) => (p.kind === 'crop' && CLIMBING_CROPS.has(p.id) ? i + 1 : last), crops.length);
  return [...crops.slice(0, after), ...productsOf('support'), ...crops.slice(after)];
}

export function createMarket(dialog: HTMLDialogElement, button: HTMLButtonElement, actions: MarketActions): Market {
  let level = 1;
  let coins = 0;
  let expansion = 0;
  let gifts: readonly Placeable[] = [];
  let tab: Tab = 'crop';
  let selected = rememberedSeed();

  const renderButton = (): void => {
    button.innerHTML = `
      <img class="button-thumb" src="${productThumbnail({ kind: 'crop', id: selected })}" alt="" />
      <span class="button-text">
        <span class="button-label">Planting</span>
        <span class="button-value">${CROPS[selected].name}</span>
      </span>
      ${gifts.length > 0 ? `<span class="badge" title="Gifts waiting">${gifts.length}<span class="visually-hidden"> gifts waiting</span></span>` : ''}`;
  };

  const giftCard = (g: Placeable, index: number): string => `
    <li>
      <button type="button" class="card" data-gift="${index}">
        <img class="card-thumb" src="${productThumbnail(g)}" alt="" />
        <span class="card-name">${productInfo(g).name}</span>
        <span class="card-line">Free to place</span>
      </button>
    </li>`;

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

  // One card per expansion: owned, buyable, or what it still needs.
  const landCard = (index: number): string => {
    const e = EXPANSIONS[index];
    if (!e) return '';
    const neighbors = neighborsAt(level).length;
    const owned = index <= expansion;
    const isNext = index === expansion + 1;
    const needs = [
      { met: level >= e.level, text: `Level ${e.level}` },
      {
        met: neighbors >= e.neighbors,
        text: `${e.neighbors} ${e.neighbors === 1 ? 'neighbor' : 'neighbors'}`,
      },
      { met: coins >= e.coins, text: `${formatCoins(e.coins)} coins` },
    ];
    const ready = isNext && needs.every((n) => n.met);
    // Name the neighbor who'll make the count, so the requirement means
    // something before neighbors have farms to visit.
    const who = Object.values(NEIGHBORS).filter((n) => n.movesInAt <= e.level).slice(0, e.neighbors).map((n) => n.name);
    const status = owned
      ? '<span class="card-tag land-tag">Owned</span>'
      : ready
        ? `<button type="button" class="primary land-buy" data-expand>Expand</button>`
        : isNext
          ? ''
          : `<span class="card-lock">Expand to ${EXPANSIONS[index - 1]?.size} × ${EXPANSIONS[index - 1]?.size} first</span>`;
    return `
      <li class="land-card" data-owned="${owned}">
        <span class="land-thumb" aria-hidden="true">${e.size}×${e.size}</span>
        <span class="land-main">
          <span class="card-name">${e.size} × ${e.size} farm</span>
          ${
            owned
              ? ''
              : `<ul class="needs">${needs
                  .map((n) => `<li data-met="${n.met}"><span aria-hidden="true">${n.met ? '✓' : '✗'}</span> ${n.text}</li>`)
                  .join('')}</ul>
                 ${who.length && !owned ? `<span class="card-line">Neighbors: ${who.join(', ')}</span>` : ''}`
          }
        </span>
        ${status}
      </li>`;
  };

  const render = (): void => {
    const size = EXPANSIONS[expansion]?.size ?? 0;
    const hint =
      tab === 'crop'
        ? 'Pick a crop to plant. You pay for seeds as you plant them.'
        : tab === 'land'
          ? `Your farm is ${size} × ${size}. New land is added along the far edges, so nothing moves.`
          : tab === 'gifts'
            ? gifts.length > 0
              ? 'Gifts from your neighbors. Pick one, then click where it goes.'
              : 'No gifts right now. Your neighbors leave one most days once they move in.'
            : 'Pick something, then click where it goes on your farm.';
    const body =
      tab === 'land'
        ? `<ul class="land-list">${EXPANSIONS.map((_, i) => i).slice(1).map(landCard).join('')}</ul>`
        : tab === 'gifts'
          ? `<ul class="cards">${gifts.map(giftCard).join('')}</ul>`
          : `<ul class="cards">${tabProducts(tab).map(card).join('')}</ul>`;
    dialog.innerHTML = `
      <div class="market">
        <header class="market-head">
          <h2>Market</h2>
          <button type="button" class="close" data-close aria-label="Close market">×</button>
        </header>
        <div class="tabs" role="tablist">
          ${TABS.map(
            (t) =>
              `<button type="button" role="tab" class="tab" data-tab="${t.kind}" aria-selected="${t.kind === tab}">${t.label}${
                t.kind === 'gifts' && gifts.length > 0 ? ` (${gifts.length})` : ''
              }</button>`,
          ).join('')}
        </div>
        <p class="market-hint">${hint}</p>
        ${body}
      </div>`;
  };

  const productFrom = (el: HTMLElement): Product | null => {
    const kind = el.dataset['kind'];
    const id = el.dataset['id'];
    for (const k of PRODUCT_KINDS) {
      if (k !== kind) continue;
      return productsOf(k).find((p) => p.id === id) ?? null;
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

    const giftIndex = target.closest<HTMLElement>('[data-gift]')?.dataset['gift'];
    if (giftIndex !== undefined) {
      dialog.close();
      actions.onGift(Number(giftIndex));
      return;
    }

    if (target.closest('[data-expand]')) {
      dialog.close();
      actions.onExpand();
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
    setFarm(farm) {
      level = levelForXp(farm.xp);
      coins = farm.coins;
      expansion = farm.expansion;
      if (farm.gifts !== gifts) {
        gifts = farm.gifts;
        renderButton();
      }
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
