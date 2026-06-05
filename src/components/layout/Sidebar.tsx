import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import {
  Bus, Users, MapPin, Calendar, Ticket, Package,
  LayoutDashboard, LogOut, Building2, Wallet, BarChart2, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface NavItem {
  label: string;
  to:    string;
  icon:  React.ElementType;
  color: string;
  roles?: string[];
}

const items: NavItem[] = [
  { label: 'Dashboard',      to: 'dashboard',  icon: LayoutDashboard, color: '#a78bfa' },
  { label: 'Habilitaciones', to: 'schedules',  icon: Calendar,        color: '#818cf8' },
  { label: 'Boletos',        to: 'tickets',    icon: Ticket,          color: '#22d3ee' },
  { label: 'Encomiendas',    to: 'parcels',    icon: Package,         color: '#34d399' },
  { label: 'Caja',           to: 'cash',       icon: Wallet,          color: '#fbbf24' },
  { label: 'Reportes',       to: 'reports',    icon: BarChart2,       color: '#f472b6', roles: ['admin','supervisor'] },
  { label: 'Sucursales',     to: 'branches',   icon: Building2,       color: '#c084fc', roles: ['admin'] },
  { label: 'Rutas',          to: 'rutas',      icon: MapPin,          color: '#818cf8', roles: ['admin'] },
  { label: 'Flotas',         to: 'fleet',      icon: Bus,             color: '#67e8f9', roles: ['admin'] },
  { label: 'Personal',       to: 'personnel',  icon: Users,           color: '#6ee7b7', roles: ['admin'] },
];

interface SidebarProps {
  open:    boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout, tenantCode } = useAuth();
  const navigate = useNavigate();
  const ref      = useRef<HTMLElement>(null);

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // GSAP entrance animation — desktop only, so it never conflicts with mobile transform
  useEffect(() => {
    if (!ref.current || isMobile) return;
    gsap.fromTo(ref.current,
      { x: -30, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out',
        onComplete: () => { if (ref.current) gsap.set(ref.current, { clearProps: 'transform,opacity' }); },
      }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = items.filter(i => !i.roles || (user && i.roles.includes(user.rol)));
  const base    = `/t/${tenantCode}`;
  const initial = user?.nombre?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  return (
    <aside
      ref={ref}
      style={{
        position:        'fixed',
        top:             isMobile ? 0 : 12,
        left:            isMobile ? 0 : 12,
        bottom:          isMobile ? 0 : 12,
        width:           260,
        zIndex:          isMobile ? 40 : 30,
        borderRadius:    isMobile ? '0 20px 20px 0' : 20,
        transform:       isMobile ? (open ? 'translateX(0)' : 'translateX(-100%)') : undefined,
        transition:      isMobile ? 'transform 0.3s cubic-bezier(0.16,1,0.3,1)' : undefined,
        display:         'flex',
        flexDirection:   'column',
        overflow:        'hidden',
        background:      'rgba(12,6,30,0.72)',
        backdropFilter:  'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        border:          '1px solid rgba(255,255,255,0.1)',
        boxShadow:       '0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Rainbow top edge */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
        background: 'linear-gradient(90deg, transparent, #7c3aed 30%, #22d3ee 70%, transparent)',
        borderRadius: '20px 20px 0 0',
      }} />

      {/* ── Logo ── */}
      <div style={{ padding: '24px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Icon with glow */}
          <div style={{
            position:   'relative',
            width:       46, height: 46,
            borderRadius: 14,
            background:  'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(8,145,178,0.2))',
            border:      '1px solid rgba(167,139,250,0.4)',
            display:     'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow:   '0 0 20px rgba(124,58,237,0.3)',
            flexShrink:  0,
          }}>
            <Bus size={22} color="#a78bfa" />
            {/* Spinning ring */}
            <div style={{
              position: 'absolute', inset: -3,
              borderRadius: 15,
              background: 'conic-gradient(from 0deg, #7c3aed, #22d3ee, #be185d, #7c3aed)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: 1.5,
              animation: 'spin-slow 6s linear infinite',
              opacity: 0.7,
            }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
              Trans Andina
            </p>
            <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(167,139,250,0.7)', lineHeight: 1.3 }}>
              {tenantCode}
            </p>
          </div>
        </div>
        {/* Divider */}
        <div style={{
          marginTop: 14, height: 1,
          background: 'linear-gradient(90deg, rgba(167,139,250,0.3), rgba(255,255,255,0.05), transparent)',
        }} />
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.18em', padding: '4px 8px', marginBottom: 6 }}>
          Módulos
        </p>
        {visible.map((item, i) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={`${base}/${item.to}`} onClick={onClose} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
              {({ isActive }) => (
                <motion.div
                  initial={false}
                  animate={isActive ? { scale: 1 } : { scale: 1 }}
                  whileHover={{ scale: 1.015, x: 2 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            10,
                    padding:        '10px 12px',
                    borderRadius:   13,
                    cursor:         'pointer',
                    position:       'relative',
                    overflow:       'hidden',
                    background:     isActive ? `rgba(${hexToRgb(item.color)},0.14)` : 'transparent',
                    border:         isActive ? `1px solid rgba(${hexToRgb(item.color)},0.28)` : '1px solid transparent',
                    transition:     'background 0.2s, border-color 0.2s',
                    animationDelay: `${i * 40}ms`,
                    animation:      'slide-right 0.4s ease both',
                  }}
                >
                  {/* Active glow left strip */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                      width: 3, height: 18, borderRadius: '0 3px 3px 0',
                      background: item.color,
                      boxShadow: `0 0 10px ${item.color}, 0 0 20px ${item.color}60`,
                    }} />
                  )}

                  <Icon
                    size={16}
                    color={isActive ? item.color : 'rgba(255,255,255,0.3)'}
                    style={{ flexShrink: 0, transition: 'color 0.2s' }}
                  />
                  <span style={{
                    fontSize:   13,
                    fontWeight: isActive ? 600 : 400,
                    color:      isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                    transition: 'color 0.2s, font-weight 0.2s',
                    flex:       1,
                  }}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: item.color,
                      boxShadow: `0 0 6px ${item.color}`,
                    }} />
                  )}
                </motion.div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── User ── */}
      <div style={{ padding: '12px 12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* User card */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          10,
          padding:      '11px 12px',
          borderRadius: 14,
          background:   'rgba(255,255,255,0.04)',
          border:       '1px solid rgba(255,255,255,0.07)',
          marginBottom: 4,
        }}>
          {/* Avatar */}
          <div style={{
            width:        34, height: 34,
            borderRadius: '50%',
            background:   'linear-gradient(135deg, #7c3aed, #0891b2)',
            display:      'flex', alignItems: 'center', justifyContent: 'center',
            fontSize:     12, fontWeight: 700, color: '#fff',
            boxShadow:    '0 0 12px rgba(124,58,237,0.5)',
            flexShrink:   0,
            position:     'relative',
          }}>
            {initial}
            {/* Online */}
            <div style={{
              position:     'absolute',
              bottom: -1, right: -1,
              width:        8, height: 8,
              borderRadius: '50%',
              background:   '#34d399',
              border:       '1.5px solid #080616',
              boxShadow:    '0 0 6px #34d399',
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.nombre}
            </p>
            <p style={{ fontSize: 11, color: '#a78bfa', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.3, textTransform: 'capitalize' }}>
              {user?.rol}
            </p>
          </div>
          <Zap size={11} color="rgba(167,139,250,0.5)" />
        </div>

        {/* Logout */}
        <motion.button
          whileHover={{ x: 3 }}
          transition={{ duration: 0.15 }}
          onClick={async () => {
            await logout();
            navigate(`/t/${tenantCode}/login`);
            toast.success('Sesión cerrada');
          }}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          8,
            width:        '100%',
            padding:      '7px 10px',
            borderRadius: 10,
            background:   'transparent',
            border:       'none',
            cursor:       'pointer',
            color:        'rgba(255,255,255,0.35)',
            fontSize:     11,
            fontFamily:   'inherit',
            transition:   'color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <LogOut size={12} />
          Cerrar sesión
        </motion.button>
      </div>
    </aside>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
