import { type ReactNode } from 'react';

type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'slate' | 'purple' | 'orange';

interface BadgeProps {
  children: ReactNode;
  color?:   BadgeColor;
  dot?:     boolean;
}

const styles: Record<BadgeColor, React.CSSProperties> = {
  blue:   { background: 'rgba(99,102,241,0.15)',  color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.28)'  },
  green:  { background: 'rgba(16,185,129,0.12)',  color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)'  },
  yellow: { background: 'rgba(245,158,11,0.12)',  color: '#fcd34d', border: '1px solid rgba(245,158,11,0.25)'  },
  red:    { background: 'rgba(239,68,68,0.12)',   color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)'   },
  slate:  { background: 'rgba(100,116,139,0.12)', color: '#cbd5e1', border: '1px solid rgba(100,116,139,0.22)' },
  purple: { background: 'rgba(139,92,246,0.15)',  color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.28)'  },
  orange: { background: 'rgba(249,115,22,0.12)',  color: '#fdba74', border: '1px solid rgba(249,115,22,0.25)'  },
};

const dotColors: Record<BadgeColor, string> = {
  blue: '#818cf8', green: '#34d399', yellow: '#fbbf24',
  red:  '#f87171', slate: '#94a3b8', purple: '#a78bfa', orange: '#fb923c',
};

export function Badge({ children, color = 'slate', dot }: BadgeProps) {
  return (
    <span style={{
      ...styles[color],
      display:     'inline-flex',
      alignItems:  'center',
      gap:         5,
      padding:     '3px 10px',
      borderRadius: 7,
      fontSize:    11,
      fontWeight:  600,
      letterSpacing: '0.01em',
      whiteSpace:  'nowrap',
    }}>
      {dot && (
        <span style={{
          width: 5, height: 5,
          borderRadius: '50%',
          background: dotColors[color],
          boxShadow: `0 0 5px ${dotColors[color]}`,
          flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  );
}
