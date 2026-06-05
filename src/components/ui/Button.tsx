import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?:    'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?:    ReactNode;
  children?: ReactNode;
}

const variantBase: Record<string, React.CSSProperties> = {
  primary:  { background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', boxShadow: '0 4px 18px rgba(139,92,246,0.38)' },
  secondary:{ background: 'rgba(255,255,255,0.07)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.13)' },
  danger:   { background: 'rgba(239,68,68,0.1)',  color: '#f87171', border: '1px solid rgba(239,68,68,0.28)' },
  ghost:    { background: 'transparent', color: '#94a3b8' },
  outline:  { background: 'transparent', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.38)' },
};

const variantHover: Record<string, React.CSSProperties> = {
  primary:  { boxShadow: '0 6px 28px rgba(139,92,246,0.5)', transform: 'translateY(-1px)' },
  secondary:{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.22)', color: '#f1f5f9' },
  danger:   { background: 'rgba(239,68,68,0.16)' },
  ghost:    { background: 'rgba(255,255,255,0.04)', color: '#f1f5f9' },
  outline:  { background: 'rgba(139,92,246,0.08)' },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { fontSize: 12, padding: '7px 14px',  gap: 6, borderRadius: 9  },
  md: { fontSize: 13, padding: '10px 18px', gap: 7, borderRadius: 11 },
  lg: { fontSize: 14, padding: '12px 22px', gap: 8, borderRadius: 13 },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size    = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  const base: React.CSSProperties = {
    display:     'inline-flex',
    alignItems:  'center',
    justifyContent: 'center',
    fontWeight:  600,
    fontFamily:  'inherit',
    cursor:      isDisabled ? 'not-allowed' : 'pointer',
    opacity:     isDisabled ? 0.55 : 1,
    border:      'none',
    outline:     'none',
    position:    'relative',
    overflow:    'hidden',
    transition:  'all 0.2s ease',
    whiteSpace:  'nowrap',
    ...sizeStyles[size],
    ...variantBase[variant],
    ...style,
  };

  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) Object.assign((e.currentTarget as HTMLButtonElement).style, variantHover[variant]);
    onMouseEnter?.(e);
  };

  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget as HTMLButtonElement;
    Object.assign(el.style, variantBase[variant], sizeStyles[size], { transform: 'translateY(0)' });
    onMouseLeave?.(e);
  };

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`shimmer ${className}`}
      style={base}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin" width={size === 'sm' ? 11 : 13} height={size === 'sm' ? 11 : 13} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
          </svg>
          {children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
