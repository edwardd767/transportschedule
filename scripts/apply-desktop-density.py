from pathlib import Path

css_path = Path('app/globals.css')
css = css_path.read_text()
marker = '/* HotelX compact desktop density */'
if marker in css:
    raise SystemExit('HotelX compact desktop density already applied')

css += r'''

/* HotelX compact desktop density */
@media (min-width: 768px) {
  body {
    font-size: 14px;
  }

  .hotel-shell {
    --topbar-height: 54px;
  }

  .topbar {
    padding: 0 18px;
  }
  .brand {
    gap: 14px;
    font-size: 20px;
    letter-spacing: -0.55px;
  }
  .menu-button {
    width: 32px !important;
    height: 36px !important;
  }
  .hamburger-icon {
    height: 26px;
  }
  .top-tools {
    gap: 20px;
  }
  .language {
    gap: 7px;
    font-size: 14px;
  }

  .profile {
    min-height: 132px;
    padding: 14px 16px 12px;
  }
  .profile:before {
    height: 50px;
  }
  .avatar {
    width: 42px;
    height: 42px;
    margin-bottom: 11px;
    font-size: 15px;
  }
  .profile-name {
    font-size: 15px;
  }
  .profile-role {
    font-size: 12px;
  }

  .main-nav {
    padding: 9px 8px;
  }
  .main-nav > button {
    min-height: 40px;
    padding: 8px 10px;
    gap: 10px;
    font-size: 14px;
  }
  .main-nav > button > svg {
    width: 18px;
    height: 18px;
  }
  .subnav {
    gap: 6px;
    padding: 6px 0 9px 39px;
    font-size: 13px;
  }
  .sidebar-foot {
    gap: 10px;
    margin: auto 14px 12px;
    padding-top: 11px;
    font-size: 10px;
  }
  .sidebar-foot small {
    margin-top: 2px;
    font-size: 10px;
  }
  .property-mark {
    width: 29px;
    height: 31px;
    font-size: 21px;
  }

  .workspace {
    padding: 13px 18px 10px;
  }
  .property-banner {
    min-height: 68px;
    padding: 7px 12px 26px;
  }
  .property-banner small {
    font-size: 11px;
  }
  .property-banner strong {
    font-size: 13px;
  }
  .property-switch {
    width: 27px;
    height: 27px;
    margin-top: 4px;
  }
  .breadcrumb {
    padding: 3px 12px;
    gap: 7px;
    font-size: 11px;
  }
  .listing-title {
    padding: 7px 12px;
  }
  .listing-title h1 {
    font-size: 15px;
  }

  .primary-button,
  .secondary-button {
    min-height: 32px;
    padding: 5px 10px;
    font-size: 13px;
  }

  .booking-listing-title {
    min-height: 46px;
    padding: 5px 12px;
  }
  .booking-listing-title .booking-toolbar {
    gap: 2px;
  }
  .booking-toolbar .icon-button {
    width: 32px;
    height: 32px;
  }
  .booking-legend {
    gap: 5px 9px;
    padding: 10px 4px;
    font-size: 13px;
  }
  .booking-legend i {
    width: 10px;
    height: 10px;
  }
  .booking-list-scroll,
  .booking-detail-scroll {
    padding-top: 2px;
  }
  .booking-list {
    gap: 6px;
  }
  .booking-row {
    min-height: 76px;
    padding: 12px 16px 12px 20px;
    gap: 18px;
    border-radius: 7px;
  }
  .booking-row::before {
    top: 10px;
    bottom: 10px;
    width: 5px;
  }
  .booking-stay {
    gap: 4px 8px;
  }
  .booking-stay > strong {
    font-size: 14px;
  }
  .booking-occupancy,
  .booking-occupancy > span {
    gap: 4px;
    font-size: 13px;
  }
  .booking-occupancy {
    gap: 8px;
  }
  .booking-occupancy svg {
    width: 16px;
    height: 16px;
  }
  .booking-guest,
  .booking-price-room,
  .booking-amount {
    font-size: 13px;
  }
  .booking-price-room > span {
    margin-top: 2px;
  }
  .booking-add {
    right: 10px;
    bottom: 12px;
    width: 52px;
    height: 52px;
  }

  .booking-detail-summary {
    padding: 8px 12px;
  }
  .booking-detail-scroll {
    gap: 6px;
    margin-top: 10px;
  }
  .booking-section-card {
    min-height: 62px;
    padding: 11px 15px;
  }
  .booking-section-card:first-child {
    min-height: 48px;
  }
  .booking-section-card strong {
    font-size: 14px;
  }
  .booking-section-card small {
    font-size: 13px;
  }

  .day-summary {
    margin: 9px 0;
    padding: 8px 12px;
  }
  .summary-icon {
    width: 30px;
    height: 30px;
  }

  .timetable-controls {
    gap: 7px;
    padding: 10px 0 6px;
  }
  .timetable-weekday {
    padding: 6px;
    font-size: 12px;
  }
  .timetable-day {
    padding: 6px;
  }
}
'''
css_path.write_text(css)

page_path = Path('app/page.tsx')
page = page_path.read_text()
old = "style={{ '--sidebar-width': '232px' } as CSSProperties}"
new = "style={{ '--sidebar-width': '218px' } as CSSProperties}"
if old not in page:
    raise SystemExit('Expected sidebar width declaration was not found')
page_path.write_text(page.replace(old, new, 1))

print('Compact desktop density applied.')
