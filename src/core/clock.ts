// The only place the game reads the time. Rules take a `now` timestamp as an
// argument instead of calling Date.now() themselves, so tests can say "four
// hours later" by passing a bigger number, and a test mode can be added here
// later without touching any rule.

export type Clock = { readonly now: () => number };

export const systemClock: Clock = { now: () => Date.now() };

export type FakeClock = Clock & { readonly advance: (ms: number) => void };

export function fakeClock(start: number): FakeClock {
  let time = start;
  return {
    now: () => time,
    advance: (ms) => {
      time += ms;
    },
  };
}

export const SECOND = 1_000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
