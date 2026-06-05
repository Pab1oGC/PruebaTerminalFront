import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:    string;
  error?:    string;
  hint?:     string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', style, onFocus, onBlur, ...props }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = 'rgba(167,139,250,0.6)';
      e.target.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.15)';
      onFocus?.(e);
    };
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)';
      e.target.style.boxShadow   = 'none';
      onBlur?.(e);
    };

    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        {label && (
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full outline-none placeholder:opacity-30"
          style={{
            background:   'rgba(255,255,255,0.04)',
            border:       error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 11,
            color:        '#f1f5f9',
            padding:      '12px 15px',
            fontSize:     14,
            fontFamily:   'inherit',
            transition:   'border-color 0.2s, box-shadow 0.2s',
            ...style,
          }}
          {...props}
        />
        {error && <p style={{ fontSize: 12, color: '#f87171', marginTop: 2 }}>{error}</p>}
        {hint && !error && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
