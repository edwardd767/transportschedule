'use client';

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="billing-instruction-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="confirm-dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="primary-button" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary-button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
