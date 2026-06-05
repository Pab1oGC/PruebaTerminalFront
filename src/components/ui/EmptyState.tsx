import { type ReactNode } from 'react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  title:        string;
  description?: string;
  action?:      ReactNode;
  icon?:        ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
      <div style={{
        padding:      20,
        borderRadius: 20,
        background:   'rgba(124,58,237,0.1)',
        border:       '1px solid rgba(167,139,250,0.18)',
        color:        '#a78bfa',
        marginBottom: 18,
        display:      'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon ?? <PackageOpen size={34} />}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{title}</h3>
      {description && (
        <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 300, lineHeight: 1.55 }}>{description}</p>
      )}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}
