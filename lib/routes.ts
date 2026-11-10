'use client';

// URL slugs for the app's screens. Kept hash-free so the private access link
// (#access=…) keeps working untouched on first load.
export const VIEW_SLUGS: Record<string, string> = {
  booking: '/booking',
  frontdesk: '/front-desk',
  schedule: '/front-desk/transport',
  housekeeping: '/housekeeping',
  guestprofile: '/guest-profile',
  digitaldocument: '/digital-document',
  reporting: '/digital-reporting',
  transportlisting: '/digital-reporting/transport-listing',
  hotelsettings: '/hotel-settings',
  setup: '/hotel-settings/transport-setup',
  ratepolicy: '/hotel-settings/rate-setup',
  commonsettings: '/common-settings',
  systemadmin: '/system-admin',
};

export const APP_BASE =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/transportschedule')
    ? '/transportschedule'
    : '';

export function slugForView(view: string): string {
  return `${APP_BASE}${VIEW_SLUGS[view] ?? VIEW_SLUGS.booking}`;
}

export function viewForPath(pathname: string): string {
  const stripped = pathname.startsWith(APP_BASE)
    ? pathname.slice(APP_BASE.length)
    : pathname;
  const clean = stripped.replace(/\/+$/, '') || '/';
  const hit = Object.entries(VIEW_SLUGS).find(([, slug]) => slug === clean);
  return hit?.[0] ?? 'booking';
}
