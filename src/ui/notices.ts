// The tooltip that follows the pointer, and short toast messages.

import type { ScreenPoint } from '../render/iso';

export type Tooltip = {
  readonly show: (text: string, at: ScreenPoint) => void;
  readonly hide: () => void;
};

export function createTooltip(el: HTMLElement): Tooltip {
  return {
    show(text, at) {
      el.textContent = text;
      el.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px) translate(-50%, -100%)`;
      el.hidden = false;
    },
    hide() {
      el.hidden = true;
    },
  };
}

export type Toast = { readonly show: (text: string) => void };

export function createToast(el: HTMLElement): Toast {
  let timer = 0;
  return {
    show(text) {
      el.textContent = text;
      el.hidden = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => (el.hidden = true), 2200);
    },
  };
}
