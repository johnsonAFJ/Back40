// The coins, level, XP and basket display at the top of the screen.

import { basketTotal } from '../core/basket';
import { levelProgress } from '../core/levels';
import type { FarmState } from '../core/state';
import { formatCoins } from './format';

export type Hud = { readonly update: (farm: FarmState) => void };

export function createHud(root: HTMLElement, openBasket: () => void): Hud {
  root.innerHTML = `
    <div class="pill stat" title="Coins">
      <span class="coin" aria-hidden="true"></span>
      <span class="stat-value" data-coins></span>
    </div>
    <div class="pill stat level" title="Level and experience">
      <span class="level-badge" data-level></span>
      <span class="xp">
        <span class="xp-bar"><span class="xp-fill" data-xp-fill></span></span>
        <span class="xp-label" data-xp-label></span>
      </span>
    </div>
    <button type="button" class="pill stat basket-button" data-basket title="Your harvest basket">
      <svg class="basket-svg" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10h16l-2 10H6z" />
        <path d="M8 10 11 4M16 10l-3-6" />
      </svg>
      <span class="stat-value" data-basket-count></span>
      <span class="visually-hidden">items in your basket</span>
    </button>`;

  const find = (attr: string): HTMLElement => {
    const el = root.querySelector(`[${attr}]`);
    if (!(el instanceof HTMLElement)) throw new Error(`HUD is missing ${attr}`);
    return el;
  };
  const coins = find('data-coins');
  const level = find('data-level');
  const fill = find('data-xp-fill');
  const label = find('data-xp-label');
  const basketCount = find('data-basket-count');
  const basketButton = find('data-basket');
  basketButton.addEventListener('click', openBasket);
  let lastCount = -1;

  return {
    update(farm) {
      const progress = levelProgress(farm.xp);
      coins.textContent = formatCoins(farm.coins);
      level.textContent = String(progress.level);
      fill.style.width = `${(progress.intoLevel / progress.levelSize) * 100}%`;
      label.textContent = `${progress.intoLevel} / ${progress.levelSize} XP`;
      const count = basketTotal(farm.basket);
      basketCount.textContent = String(count);
      // A little hop when something new lands in the basket.
      if (lastCount >= 0 && count > lastCount) {
        basketButton.classList.remove('hop');
        void basketButton.offsetWidth;
        basketButton.classList.add('hop');
      }
      lastCount = count;
    },
  };
}
