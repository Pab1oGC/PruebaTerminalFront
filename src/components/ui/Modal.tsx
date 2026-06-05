import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  children: ReactNode;
  size?:    'sm' | 'md' | 'lg' | 'xl';
}

const maxWidths = { sm: 440, md: 580, lg: 740, xl: 940 };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — blur without heavy dark tint */}
          <motion.div
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              backdropFilter: 'blur(14px) saturate(140%)',
              WebkitBackdropFilter: 'blur(14px) saturate(140%)',
              background: 'rgba(8,6,22,0.45)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Scroll container — outer div scrolls, inner div centers */}
          <motion.div
            style={{
              position: 'fixed', inset: 0, zIndex: 51,
              overflowY: 'auto',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
            {/* Inner centering wrapper — minHeight: 100vh guarantees centering regardless of parent overflow */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: '100vh', padding: '28px 20px',
            }}>
              {/* Panel */}
              <motion.div
                style={{
                  position: 'relative', width: '100%', maxWidth: maxWidths[size],
                  flexShrink: 0,
                  borderRadius: 24,
                  background: 'rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(32px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(32px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 32px 96px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
                initial={{ scale: 0.93, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                onClick={e => e.stopPropagation()}
              >
                {/* Rainbow top line */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: 'linear-gradient(90deg, transparent, #7c3aed 30%, #22d3ee 70%, transparent)',
                }} />

                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px 24px 18px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{title}</h2>
                  <button
                    onClick={onClose}
                    style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.4)',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)';
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px' }}>{children}</div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
