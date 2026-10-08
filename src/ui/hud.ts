// The coins, level and XP display at the top of the screen.

import { levelProgress } from '../core/levels';
import type { FarmState } from '../core/state';
import { formatCoins } from './format';

export type Hud = { readonly update: (farm: FarmState) => void };

export function createHud(root: HTMLElement): Hud {
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
    </div>`;

  const find = (attr: string): HTMLElement => {
    const el = root.querySelector(`[${attr}]`);
    if (!(el instanceof HTMLElement)) throw new Error(`HUD is missing ${attr}`);
    return el;
  };
  const coins = find('data-coins');
  const level = find('data-level');
  const fill = find('data-xp-fill');
  const label = find('data-xp-label');

  return {
    update(farm) {
      const progress = levelProgress(farm.xp);
      coins.textContent = formatCoins(farm.coins);
      level.textContent = String(progress.level);
      fill.style.width = `${(progress.intoLevel / progress.levelSize) * 100}%`;
      label.textContent = `${progress.intoLevel} / ${progress.levelSize} XP`;
    },
  };
}
