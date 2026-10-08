// The level-up banner: the new level, what it unlocked, and how far away
// the next unlock is.

import { CROPS } from '../core/data/crops';
import { nextUnlockLevel, type Unlock } from '../core/unlocks';
import { cropThumbnail } from '../render/thumbnails';

export type LevelUp = { readonly show: (level: number, unlocked: readonly Unlock[]) => void };

function unlockCard(u: Unlock): string {
  switch (u.kind) {
    case 'crop':
      return `
        <li class="unlock">
          <img class="unlock-thumb" src="${cropThumbnail(u.id)}" alt="" />
          <span>${CROPS[u.id].name}</span>
        </li>`;
    default: {
      const _exhaustive: never = u.kind;
      return _exhaustive;
    }
  }
}

export function createLevelUp(dialog: HTMLDialogElement): LevelUp {
  dialog.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (e.target === dialog || target?.closest('[data-close]')) dialog.close();
  });

  return {
    show(level, unlocked) {
      const next = nextUnlockLevel(level);
      const unlockedPart = unlocked.length
        ? `<p class="levelup-sub">New in the market</p>
           <ul class="unlocks">${unlocked.map(unlockCard).join('')}</ul>`
        : '';
      const nextPart = next
        ? `<p class="levelup-next">${next - level === 1 ? 'More crops at the next level' : `More crops at level ${next}`}</p>`
        : '';
      dialog.innerHTML = `
        <div class="levelup">
          <p class="levelup-eyebrow">Level up!</p>
          <p class="levelup-level">${level}</p>
          ${unlockedPart}
          ${nextPart}
          <button type="button" class="primary" data-close>Keep farming</button>
        </div>`;
      if (!dialog.open) dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('[data-close]')?.focus();
    },
  };
}
