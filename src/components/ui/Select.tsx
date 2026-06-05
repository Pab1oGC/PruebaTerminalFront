import { type SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:       string;
  error?:       string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, placeholder, children, className = '', style, onFocus, onBlur, ...props }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
      e.target.style.borderColor = 'rgba(167,139,250,0.6)';
      e.target.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.15)';
      onFocus?.(e);
    };
    const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
      e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)';
      e.target.style.boxShadow   = 'none';
      onBlur?.(e);
    };

    return (
      <div className={`flex flex-col gap-1.5 ${className}`} style={{ width: '100%' }}>
        {label && (
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative', width: '100%' }}>
          <select
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="outline-none appearance-none cursor-pointer"
            style={{
              width:        '100%',
              background:   'rgba(255,255,255,0.04)',
              border:       error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 11,
              color:        '#f1f5f9',
              padding:      '12px 42px 12px 15px',
              fontSize:     14,
              fontFamily:   'inherit',
              transition:   'border-color 0.2s, box-shadow 0.2s',
              minWidth:     0,
              ...style,
            }}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {children}
          </select>
          <svg
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', flexShrink: 0 }}
            width={14} height={14} viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {error && <p style={{ fontSize: 12, color: '#f87171', marginTop: 2 }}>{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
