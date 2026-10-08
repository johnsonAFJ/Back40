import { DAY, HOUR, MINUTE, SECOND } from '../core/clock';

// "2d 4h", "2h 14m", "14m", "45s". Rounds up, so a crop never claims to be
// ready in 0m while it's still growing.
export function formatDuration(ms: number): string {
  if (ms >= DAY) {
    const hours = Math.ceil(ms / HOUR);
    const d = Math.floor(hours / 24);
    const h = hours % 24;
    return h === 0 ? `${d}d` : `${d}d ${h}h`;
  }
  if (ms >= HOUR) {
    const minutes = Math.ceil(ms / MINUTE);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  if (ms >= MINUTE) return `${Math.ceil(ms / MINUTE)}m`;
  return `${Math.max(1, Math.ceil(ms / SECOND))}s`;
}

// Grow times in the seed list: "4h", "1 day", "2 days".
export function formatGrowTime(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = hours / 24;
  return days === 1 ? '1 day' : `${days} days`;
}

export function formatCoins(n: number): string {
  return n.toLocaleString('en-US');
}
