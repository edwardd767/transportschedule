from pathlib import Path

path = Path('app/globals.css')
css = path.read_text()
marker = '/* Compact Room Type dialog at 100% browser zoom */'
if marker in css:
    raise SystemExit('Compact Room Type dialog CSS already exists')

css += r'''

/* Compact Room Type dialog at 100% browser zoom */
@media (min-width: 761px) {
  .booking-room-dialog {
    width: min(780px, calc(100vw - 32px)) !important;
    max-width: 780px !important;
    max-height: calc(100dvh - 24px) !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }
  .booking-room-dialog [data-slot='dialog-header'] {
    flex: 0 0 auto;
    padding: 10px 16px 4px !important;
  }
  .booking-room-dialog [data-slot='dialog-description'] {
    display: none;
  }
  .booking-room-dialog-title strong {
    font-size: 14px;
  }
  .booking-room-dialog-grid {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 24px;
    padding: 12px 16px 8px;
  }
  .booking-room-dialog .booking-line-field {
    gap: 3px;
    font-size: 13px;
  }
  .booking-room-dialog .booking-line-field > input {
    min-height: 31px;
    padding: 3px 0;
    font-size: 15px;
  }
  .booking-room-dialog .booking-choice-field .hotel-select {
    min-height: 31px !important;
    height: 31px !important;
    font-size: 15px !important;
  }
  .booking-room-summary {
    flex: 0 0 auto;
    margin-top: 0;
    padding: 9px 16px;
    font-size: 12.5px;
  }
  .booking-room-summary > div {
    padding: 2px 0;
  }
  .booking-room-summary-head {
    padding-bottom: 4px !important;
  }
  .booking-room-summary-total {
    margin-top: 2px;
    padding-top: 6px !important;
    font-size: 14px;
  }
  .booking-room-error {
    flex: 0 0 auto;
    margin: 5px 16px 0;
    padding: 6px 9px;
  }
  .booking-room-dialog-actions {
    flex: 0 0 auto;
    gap: 8px;
    padding: 8px 16px;
    border-top: 1px solid #ececec;
  }
  .booking-room-secondary,
  .booking-room-cancel,
  .booking-room-confirm {
    min-height: 34px;
    padding: 5px 14px;
    font-size: 13px;
  }
}

@media (min-width: 761px) and (max-height: 760px) {
  .booking-room-dialog {
    max-height: calc(100dvh - 12px) !important;
  }
  .booking-room-dialog [data-slot='dialog-header'] {
    padding-top: 7px !important;
  }
  .booking-room-dialog-grid {
    gap: 6px 22px;
    padding-top: 8px;
  }
  .booking-room-dialog .booking-line-field > input,
  .booking-room-dialog .booking-choice-field .hotel-select {
    min-height: 28px !important;
    height: 28px !important;
  }
  .booking-room-summary {
    padding-top: 6px;
    padding-bottom: 6px;
  }
  .booking-room-dialog-actions {
    padding-top: 6px;
    padding-bottom: 6px;
  }
}
'''

path.write_text(css)
print('Compact Room Type dialog CSS applied.')
