import { type ReactNode } from 'react';

interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  actions?:  ReactNode;
  icon?:     ReactNode;
}

export function PageHeader({ title, subtitle, actions, icon }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {icon && (
          <div style={{
            padding:     10,
            borderRadius: 14,
            background:  'rgba(124,58,237,0.15)',
            border:      '1px solid rgba(167,139,250,0.25)',
            color:       '#a78bfa',
            display:     'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink:  0,
          }}>
            {icon}
          </div>
        )}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.2 }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div>
      )}
    </div>
  );
}
