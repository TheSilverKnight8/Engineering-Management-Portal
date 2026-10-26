import type { Checkout, InventoryItem } from './types';

export type CheckoutState = 'upcoming' | 'active' | 'ended' | 'returned' | 'canceled';

export function checkoutState(c: Checkout, now = Date.now()): CheckoutState {
  if (c.canceled_at) return 'canceled';
  if (c.returned_at) return 'returned';
  const start = new Date(c.starts_at).getTime();
  const end = new Date(c.ends_at).getTime();
  if (now < start) return 'upcoming';
  if (now < end) return 'active';
  return 'ended';
}

export interface Availability {
  /** Checked out right now. */
  current?: Checkout;
  /** The next checkout that has not started yet. */
  next?: Checkout;
}

export function availability(itemId: string, checkouts: Checkout[], now = Date.now()): Availability {
  const mine = checkouts.filter((c) => c.item_id === itemId && !c.canceled_at && new Date(c.ends_at).getTime() > now);
  return {
    current: mine.find((c) => checkoutState(c, now) === 'active'),
    next: mine.filter((c) => checkoutState(c, now) === 'upcoming').sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0],
  };
}

/** Units of a catalog tool in the shop, and how many are free right now. */
export function unitsForTool(slug: string, items: InventoryItem[], checkouts: Checkout[], now = Date.now()) {
  const units = items.filter((i) => i.tool_slug === slug && !i.archived_at);
  const free = units.filter((u) => !availability(u.id, checkouts, now).current);
  const working = free.filter((u) => u.status === 'operational');
  return { units, free, freeAndWorking: working };
}
