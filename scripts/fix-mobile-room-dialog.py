from pathlib import Path

path = Path('app/globals.css')
text = path.read_text()
marker = '/* Mobile Room Type dialog: keep occupancy visible and actions reachable */'
if marker not in text:
    text += r'''

/* Mobile Room Type dialog: keep occupancy visible and actions reachable */
@media (max-width: 760px) {
  .booking-room-dialog {
    width: calc(100vw - 12px) !important;
    max-width: calc(100vw - 12px) !important;
    max-height: calc(100dvh - 12px) !important;
    padding: 0 0 62px !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    overscroll-behavior: contain;
  }
  .booking-room-dialog [data-slot='dialog-header'] {
    padding: 8px 12px 5px !important;
    background: #fff8ee;
  }
  .booking-room-dialog [data-slot='dialog-description'] {
    display: none !important;
  }
  .booking-room-dialog-title strong {
    font-size: 13px !important;
  }
  .booking-room-dialog-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px 12px !important;
    max-height: none !important;
    overflow: visible !important;
    padding: 9px 12px 8px !important;
  }
  .booking-room-dialog .booking-line-field {
    min-width: 0;
    gap: 2px !important;
    font-size: 11px !important;
  }
  .booking-room-dialog .booking-line-field > span:first-child {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .booking-room-dialog .booking-line-field > input {
    min-height: 32px !important;
    height: 32px !important;
    padding: 2px 0 !important;
    font-size: 14px !important;
  }
  .booking-room-dialog .booking-choice-field .hotel-select {
    min-width: 0 !important;
    width: 100% !important;
    min-height: 32px !important;
    height: 32px !important;
    font-size: 13px !important;
  }
  .booking-room-dialog .booking-choice-field .hotel-select > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .booking-room-occupancy-entry {
    grid-column: 1 / -1 !important;
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 8px !important;
    padding: 5px 0 3px !important;
  }
  .booking-room-occupancy-entry .booking-line-field {
    min-width: 0;
  }
  .booking-room-occupancy-entry .booking-line-field > span:first-child {
    font-size: 10px !important;
  }
  .booking-room-summary {
    margin-top: 2px !important;
    padding: 8px 12px !important;
    font-size: 12px !important;
  }
  .booking-room-summary > div {
    gap: 10px !important;
    padding: 2px 0 !important;
  }
  .booking-room-summary-head {
    padding-bottom: 4px !important;
  }
  .booking-room-summary-total {
    margin-top: 3px !important;
    padding-top: 6px !important;
    font-size: 14px !important;
  }
  .booking-room-error {
    margin: 5px 12px 0 !important;
    padding: 6px 8px !important;
    font-size: 11px !important;
  }
  .booking-room-dialog-actions {
    position: fixed !important;
    z-index: 100 !important;
    left: 6px !important;
    right: 6px !important;
    bottom: calc(6px + env(safe-area-inset-bottom)) !important;
    display: flex !important;
    gap: 6px !important;
    padding: 7px 8px !important;
    border-top: 1px solid #e5e5e5 !important;
    background: #fff !important;
    box-shadow: 0 -3px 12px #00000018 !important;
  }
  .booking-room-secondary,
  .booking-room-cancel,
  .booking-room-confirm {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    min-height: 38px !important;
    padding: 6px 4px !important;
    font-size: 12px !important;
    white-space: nowrap !important;
  }
}

@media (max-width: 390px) {
  .booking-room-dialog-grid {
    gap: 7px 9px !important;
    padding-left: 10px !important;
    padding-right: 10px !important;
  }
  .booking-room-occupancy-entry {
    gap: 6px !important;
  }
  .booking-room-occupancy-entry .booking-line-field > span:first-child {
    font-size: 9.5px !important;
  }
  .booking-room-secondary,
  .booking-room-cancel,
  .booking-room-confirm {
    font-size: 11px !important;
  }
}
'''
    path.write_text(text)
