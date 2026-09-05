from pathlib import Path

css_path = Path('app/globals.css')
page_path = Path('app/page.tsx')
css = css_path.read_text()
page = page_path.read_text()
marker = '/* HotelX standardized desktop density v2 */'
if marker in css:
    raise SystemExit('Standard desktop density v2 already exists')

css += r'''

/* HotelX standardized desktop density v2 */
@media (min-width: 768px) {
  body { font-size: 13px; }

  .hotel-shell { --topbar-height: 50px; }
  .topbar { padding: 0 16px; }
  .brand { gap: 12px; font-size: 18px; }
  .menu-button { width: 30px !important; height: 34px !important; }
  .hamburger-icon { height: 24px; }
  .top-tools { gap: 16px; }
  .language { font-size: 13px; gap: 6px; }

  .profile { min-height: 118px; padding: 12px 14px 10px; }
  .profile:before { height: 45px; }
  .avatar { width: 38px; height: 38px; margin-bottom: 9px; font-size: 14px; }
  .profile-name { font-size: 14px; }
  .profile-role { font-size: 11px; }

  .main-nav { padding: 7px 7px; }
  .main-nav > button { min-height: 36px; padding: 6px 9px; gap: 9px; font-size: 13px; }
  .main-nav > button > svg { width: 17px; height: 17px; }
  .subnav { font-size: 12px; padding: 5px 0 8px 36px; }
  .sidebar-foot { margin: auto 12px 10px; padding-top: 9px; font-size: 9px; }
  .sidebar-foot small { font-size: 9px; }
  .property-mark { width: 27px; height: 29px; font-size: 19px; }

  .workspace { padding: 10px 14px 8px; }
  .property-banner { min-height: 60px; padding: 6px 11px 23px; }
  .property-banner small { font-size: 10px; }
  .property-banner strong { font-size: 12px; }
  .property-switch { width: 25px; height: 25px; margin-top: 3px; }
  .breadcrumb { padding: 2px 11px; gap: 6px; font-size: 10px; }
  .listing-title { min-height: 40px; padding: 5px 11px; }
  .listing-title h1 { font-size: 14px; }
  .icon-button { min-width: 30px; min-height: 30px; }
  .primary-button, .secondary-button { min-height: 30px; padding: 4px 9px; font-size: 12px; }

  .booking-listing-title { min-height: 42px; padding: 4px 10px; }
  .booking-toolbar .icon-button { width: 30px; height: 30px; }
  .booking-legend { padding: 8px 4px; font-size: 12px; }
  .booking-list { gap: 5px; }
  .booking-row { min-height: 68px; padding: 10px 14px 10px 18px; gap: 14px; }
  .booking-row::before { top: 8px; bottom: 8px; width: 4px; }
  .booking-stay > strong { font-size: 13px; }
  .booking-occupancy, .booking-occupancy > span,
  .booking-guest, .booking-price-room, .booking-amount { font-size: 12px; }
  .booking-occupancy svg { width: 15px; height: 15px; }
  .booking-add { width: 46px; height: 46px; right: 9px; bottom: 10px; }
  .booking-detail-summary { padding: 6px 10px; }
  .booking-detail-scroll { gap: 5px; margin-top: 8px; }
  .booking-section-card { min-height: 56px; padding: 9px 13px; }
  .booking-section-card:first-child { min-height: 44px; }
  .booking-section-card strong { font-size: 13px; }
  .booking-section-card small { font-size: 12px; }

  /* Booking creation uses the same compact desktop density as the listing. */
  .booking-new-titlebar { min-height: 32px; padding: 0 10px; grid-template-columns: 36px 1fr auto; font-size: 12px; }
  .booking-new-close { width: 28px; height: 26px; }
  .booking-new-scroll { padding: 8px 8px 66px; }
  .booking-form-section { margin-bottom: 6px; }
  .booking-section-heading { min-height: 42px; padding: 0 14px; font-size: 15px; }
  .booking-availability-section { min-height: 66px; }
  .booking-availability-date { min-width: 235px; gap: 10px; padding: 0 14px; font-size: 13px; }
  .booking-availability-date .hotel-date-picker { min-width: 165px; }

  .booking-form-grid,
  .booking-contact-grid { column-gap: 28px; row-gap: 12px; padding: 18px 14px 14px; }
  .booking-contact-grid { padding-bottom: 6px; }
  .booking-contact-lower { padding-top: 10px; padding-bottom: 16px; }
  .booking-line-field,
  .booking-group-field,
  .booking-night-field { gap: 4px; font-size: 13px; }
  .booking-line-field > input,
  .booking-group-field > input,
  .booking-night-field > strong,
  .booking-phone-line { min-height: 32px; padding: 4px 0; font-size: 15px; }
  .booking-check-line { min-height: 32px; gap: 8px; font-size: 15px; }
  .booking-check-line input,
  .booking-tax-row input { width: 16px; height: 16px; }
  .booking-choice-field .hotel-select { min-height: 32px; height: 32px; font-size: 15px; }
  .booking-tax-row { gap: 36px; padding: 9px 14px 7px; }
  .booking-tax-row label { gap: 8px; font-size: 15px; }
  .booking-occupancy-entry { gap: 12px; padding: 0 14px 16px; }
  .booking-occupancy-entry label { font-size: 12px; }
  .booking-occupancy-entry input { min-height: 32px; padding: 4px 0; font-size: 15px; }

  .booking-room-add { width: 25px; height: 25px; }
  .booking-room-table { padding: 6px 12px 12px; }
  .booking-room-table-head,
  .booking-room-table-row { min-height: 32px; gap: 9px; font-size: 12px; }
  .booking-room-empty { padding: 14px 0; font-size: 12px; }
  .booking-room-total { padding-top: 8px; font-size: 13px; }
  .booking-new-actions { margin-top: 10px; padding: 8px 14px; gap: 10px; }
  .booking-share-button,
  .booking-save-button { min-width: 130px; min-height: 36px; font-size: 14px; }

  /* Common setup/master/report surfaces: use one compact standard. */
  .settings-scroll,
  .schedule-scroll { font-size: 13px; }
  .settings-card,
  .hotel-settings-card,
  .transport-settings-card { min-height: 56px; padding-top: 10px; padding-bottom: 10px; }
  .master-form-grid { gap: 14px 24px; padding: 18px 16px 22px; }
  .master-form-grid label,
  .form-grid label { font-size: 12px; }
  .master-form-grid input,
  .master-form-grid select,
  .form-grid input,
  .form-grid select { min-height: 32px; font-size: 13px; }
  .day-summary { margin: 7px 0; padding: 6px 10px; }
  .summary-icon { width: 27px; height: 27px; }
  .timetable-controls { padding: 8px 0 5px; }
  .timetable-weekday { padding: 5px; font-size: 11px; }
  .timetable-day { padding: 5px; }
}
'''

# Keep sidebar in proportion with the compact desktop reference.
page = page.replace("style={{ '--sidebar-width': '218px' } as CSSProperties}", "style={{ '--sidebar-width': '205px' } as CSSProperties}")

css_path.write_text(css)
page_path.write_text(page)
