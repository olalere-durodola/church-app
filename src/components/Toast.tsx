import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'success', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colours: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', icon: '✓' },
    error:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', icon: '✕' },
    info:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', icon: 'ℹ' },
  };
  const c = colours[type];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: 'var(--color-surface)',
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid ${c.border}`,
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: '260px',
        maxWidth: '400px',
        animation: 'toast-in 0.2s ease',
      }}
    >
      <span style={{
        width: '22px', height: '22px', borderRadius: '50%',
        background: c.bg, border: `1px solid ${c.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, color: c.border, flexShrink: 0,
      }}>
        {c.icon}
      </span>
      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)', flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-secondary)', fontSize: '14px', padding: '2px 4px',
          borderRadius: '4px', lineHeight: 1,
        }}
      >✕</button>
    </div>
  );
}
