import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from './Dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requireReason?: boolean;
  reasonPlaceholder?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  destructive = true, requireReason = true,
  reasonPlaceholder = 'Justificativa legal ou motivo administrativo...',
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('Informe a justificativa.');
      return;
    }
    onConfirm(reason.trim());
    setReason('');
    setError('');
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title}
      icon={<AlertTriangle className={`h-5 w-5 ${destructive ? 'text-destructive' : 'text-warning'}`} />}
      size="sm"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button onClick={handleClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent">
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${destructive ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        {requireReason && (
          <div>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              placeholder={reasonPlaceholder}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default ConfirmDialog;