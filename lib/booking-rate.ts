import type { RateSetupData } from './rate-setup-data';

/** Resolve the configured rate for a room and a single stay date. */
export function bookingRate(data: RateSetupData | undefined, code: string, room: string, date: string) {
  const plan = data?.ratePlans.find(plan => plan.active && plan.code === code);
  const season = data?.calendar[date];
  if (!plan || !season) return undefined;
  const validity = data?.validity.filter(v => v.active && v.rateSetupId === plan.id && v.from <= date && date <= v.to).sort((a, b) => b.from.localeCompare(a.from))[0];
  return validity?.seasonalRates?.[room]?.[season];
}
