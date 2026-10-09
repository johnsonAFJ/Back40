// The toolbar (Farm, Move, Sell), the banner that says what the current tool
// or held item will do, and the confirmation box for selling.
//
// The game's mode lives here. It's UI state, never saved: reloading drops
// whatever you were holding, and nothing is paid for until it's placed.

import type { Placeable } from '../core/catalog';
import type { NeighborId } from '../core/data/neighbors';
import type { FarmObject } from '../core/state';

export type Mode =
  | { readonly kind: 'farm' }
  | { readonly kind: 'place'; readonly item: Placeable }
  // While moving, `held` is the object picked up and `grab` is which of its
  // tiles was clicked, so a big building stays under the cursor where it was
  // grabbed.
  | { readonly kind: 'move'; readonly held: FarmObject | null; readonly grab: { readonly dx: number; readonly dy: number } }
  | { readonly kind: 'sell' }
  // Placing gift number `index` from the gift box, for free.
  | { readonly kind: 'gift'; readonly index: number }
  // On a neighbor's farm, where clicks help instead of farm.
  | { readonly kind: 'visit'; readonly neighbor: NeighborId };

const ICONS = {
  // A hoe.
  farm: '<path d="M6 20 17 9" /><path d="M14 4h6v4l-3 1" />',
  // Four arrows.
  move: '<path d="M12 3v18M3 12h18" /><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />',
  // A price tag.
  sell: '<path d="M3 12V4h8l10 10-8 8z" /><circle cx="8" cy="9" r="1.6" />',
} as const;

type ToolKind = keyof typeof ICONS;
const TOOLS: readonly ToolKind[] = ['farm', 'move', 'sell'];

const LABELS: Record<ToolKind, string> = { farm: 'Farm', move: 'Move', sell: 'Sell' };

export type Toolbar = { readonly show: (mode: Mode, banner: string | null) => void };

export function createToolbar(
  bar: HTMLElement,
  banner: HTMLElement,
  onPick: (tool: ToolKind) => void,
  onCancel: () => void,
): Toolbar {
  bar.innerHTML = TOOLS.map(
      (tool) => `
      <button type="button" class="tool" data-tool="${tool}" aria-pressed="false" title="${LABELS[tool]}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[tool]}</svg>
        <span>${LABELS[tool]}</span>
      </button>`,
  ).join('');

  bar.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-tool]') : null;
    const tool = TOOLS.find((t) => t === el?.dataset['tool']);
    if (tool) onPick(tool);
  });
  banner.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('[data-cancel]')) onCancel();
  });

  return {
    show(mode, text) {
      const active: ToolKind = mode.kind === 'move' || mode.kind === 'sell' ? mode.kind : 'farm';
      for (const el of bar.querySelectorAll<HTMLElement>('[data-tool]')) {
        el.setAttribute('aria-pressed', String(el.dataset['tool'] === active));
      }
      if (text) {
        const done = mode.kind === 'visit' ? 'Go home' : 'Done';
        banner.innerHTML = `<span>${text}</span><button type="button" class="banner-cancel" data-cancel>${done}</button>`;
        banner.hidden = false;
      } else {
        banner.hidden = true;
      }
    },
  };
}

export type Confirm = (message: string, action: string) => Promise<boolean>;

// A yes/no box built into the page, since the game can't rely on the
// browser's confirm().
export function createConfirm(dialog: HTMLDialogElement): Confirm {
  return (message, action) =>
    new Promise((resolve) => {
      dialog.innerHTML = `
        <form method="dialog" class="confirm">
          <p>${message}</p>
          <div class="confirm-buttons">
            <button type="submit" value="no" class="secondary">Cancel</button>
            <button type="submit" value="yes" class="primary">${action}</button>
          </div>
        </form>`;
      dialog.returnValue = '';
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), { once: true });
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('[value="no"]')?.focus();
    });
}
