import { describe, expect, it } from 'vitest';
import { DAY, HOUR, MINUTE, SECOND } from '../src/core/clock';
import { formatDuration, formatGrowTime } from '../src/ui/format';

describe('formatDuration', () => {
  it('picks the two largest units', () => {
    expect(formatDuration(2 * DAY + 4 * HOUR)).toBe('2d 4h');
    expect(formatDuration(2 * HOUR + 14 * MINUTE)).toBe('2h 14m');
    expect(formatDuration(14 * MINUTE)).toBe('14m');
    expect(formatDuration(45 * SECOND)).toBe('45s');
  });

  it('drops a zero second unit', () => {
    expect(formatDuration(DAY)).toBe('1d');
    expect(formatDuration(3 * HOUR)).toBe('3h');
  });

  it('rounds up, so nothing claims 0 time left while growing', () => {
    expect(formatDuration(1)).toBe('1s');
    expect(formatDuration(HOUR + 1)).toBe('1h 1m');
    expect(formatDuration(59 * MINUTE + 1)).toBe('1h');
  });
});

describe('formatGrowTime', () => {
  it('uses hours under a day and days after', () => {
    expect(formatGrowTime(4)).toBe('4h');
    expect(formatGrowTime(24)).toBe('1 day');
    expect(formatGrowTime(96)).toBe('4 days');
  });
});
