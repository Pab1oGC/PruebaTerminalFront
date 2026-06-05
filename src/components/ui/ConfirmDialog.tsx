import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open:          boolean;
  onClose:       () => void;
  onConfirm:     () => void;
  title:         string;
  message:       string;
  confirmLabel?: string;
  loading?:      boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirmar', loading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{
          display:     'flex',
          gap:         12,
          padding:     '14px 16px',
          borderRadius: 12,
          background:  'rgba(245,158,11,0.1)',
          border:      '1px solid rgba(245,158,11,0.22)',
        }}>
          <AlertTriangle size={18} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost"  size="sm" onClick={onClose}   disabled={loading}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
