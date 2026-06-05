import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { gsap } from 'gsap';
import {
  Calendar, Ticket, Bus, TrendingUp, Package, Users,
  ArrowRight, Activity, Zap, Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Stats {
  viajesHoy: number;
  boletosVendidos: number;
  encomiendasPendientes: number;
  flotasActivas: number;
}

/* ─── 3D Tilt wrapper ─────────────────────────────────
   Uses Framer Motion springs for buttery-smooth physics.
──────────────────────────────────────────────────────  */
function Tilt({ children, intensity = 10 }: { children: React.ReactNode; intensity?: number }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [ intensity, -intensity]), { stiffness: 400, damping: 35 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-intensity,  intensity]), { stiffness: 400, damping: 35 });
  const sc = useSpring(1, { stiffness: 400, damping: 35 });

  return (
    <div style={{ perspective: '700px' }}>
      <motion.div
        style={{ rotateX: rx, rotateY: ry, scale: sc, transformStyle: 'preserve-3d' }}
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width  - 0.5);
          my.set((e.clientY - r.top)  / r.height - 0.5);
          sc.set(1.035);
        }}
        onMouseLeave={() => { mx.set(0); my.set(0); sc.set(1); }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ─── Animated number counter ────────────────────────── */
function Counter({ to, duration = 1.3 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const start = useRef<number | null>(null);
  const raf   = useRef<number>(0);

  useEffect(() => {
    if (to === undefined) return;
    start.current = null;
    const tick = (ts: number) => {
      if (!start.current) start.current = ts;
      const t = Math.min((ts - start.current) / (duration * 1000), 1);
      const e = 1 - Math.pow(1 - t, 4); // ease-out quart
      setVal(Math.round(e * to));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, duration]);

  return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{val}</span>;
}

/* ─── Glass card base ─────────────────────────────────── */
const glassCard: React.CSSProperties = {
  background:          'rgba(255,255,255,0.06)',
  backdropFilter:      'blur(16px) saturate(160%)',
  WebkitBackdropFilter:'blur(16px) saturate(160%)',
  border:              '1px solid rgba(255,255,255,0.1)',
  borderRadius:        20,
  position:            'relative',
  overflow:            'hidden',
  boxShadow:           '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
};

/* ─── Stat cards config ───────────────────────────────── */
const stats = [
  { key: 'viajesHoy',             label: 'Viajes hoy',       Icon: Calendar, color: '#a78bfa', glow: 'rgba(139,92,246,0.35)',  rgb: '167,139,250' },
  { key: 'boletosVendidos',       label: 'Boletos vendidos',  Icon: Ticket,   color: '#22d3ee', glow: 'rgba(34,211,238,0.35)',  rgb: '34,211,238'  },
  { key: 'encomiendasPendientes', label: 'Encomiendas pend.', Icon: Package,  color: '#f472b6', glow: 'rgba(244,114,182,0.35)', rgb: '244,114,182' },
  { key: 'flotasActivas',         label: 'Flotas activas',    Icon: Bus,      color: '#34d399', glow: 'rgba(52,211,153,0.35)',  rgb: '52,211,153'  },
] as const;

/* ─── Quick actions ───────────────────────────────────── */
const actions = [
  { label: 'Nueva habilitación', to: 'schedules', Icon: Calendar, color: '#a78bfa', rgb: '167,139,250' },
  { label: 'Vender boleto',      to: 'tickets',   Icon: Ticket,   color: '#22d3ee', rgb: '34,211,238'  },
  { label: 'Ver flota',          to: 'fleet',     Icon: Bus,      color: '#34d399', rgb: '52,211,153'  },
  { label: 'Personal',           to: 'personnel', Icon: Users,    color: '#fbbf24', rgb: '251,191,36'  },
];

/* ─── Dashboard ───────────────────────────────────────── */
export function DashboardPage() {
  const { user, api } = useAuth();
  const welcomeRef = useRef<HTMLDivElement>(null);
  const statsRef   = useRef<HTMLDivElement>(null);
  const actRef     = useRef<HTMLDivElement>(null);

  const { data } = useQuery<Stats>({
    queryKey: ['dashboard', 'stats'],
    queryFn:  () => api.get('/dashboard/stats').then(r => r.data.stats),
  });

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.05 });
    if (welcomeRef.current) tl.fromTo(welcomeRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
    if (statsRef.current)   tl.fromTo(Array.from(statsRef.current.children),   { opacity: 0, y: 30, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, stagger: 0.09, duration: 0.5, ease: 'power3.out' }, '-=0.25');
    if (actRef.current)     tl.fromTo(Array.from(actRef.current.children),     { opacity: 0, x: -20 },             { opacity: 1, x: 0, stagger: 0.07, duration: 0.4, ease: 'power2.out' }, '-=0.2');
  }, []);

  const name = user?.nombre.split(' ')[0] ?? '';
  const now  = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Welcome ─────────────────────────────────── */}
      <div ref={welcomeRef}>
        <Tilt intensity={5}>
          <div style={{
            ...glassCard,
            padding: '32px 36px',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(255,255,255,0.05) 60%, rgba(8,145,178,0.12) 100%)',
          }}>
            {/* Grid overlay */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }} />

            {/* Glow orb inside card */}
            <div style={{
              position: 'absolute', top: -60, right: -60, width: 220, height: 220,
              background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#34d399',
                    boxShadow: '0 0 8px #34d399, 0 0 16px rgba(52,211,153,0.4)',
                    animation: 'pulse-glow 2s ease-in-out infinite',
                  }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    Sistema activo
                  </span>
                </div>
                <h1 style={{
                  fontSize: 36, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em',
                  color: '#fff', marginBottom: 6,
                  transform: 'translateZ(20px)',
                }}>
                  Hola, <span className="grad-text">{name}</span>
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text-3)', textTransform: 'capitalize' }}>
                  {user?.rol} · Trans Andina Bolivia
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hoy</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'capitalize', marginTop: 2 }}>{now}</p>
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: 'rgba(124,58,237,0.2)',
                  border: '1px solid rgba(167,139,250,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: 'translateZ(30px)',
                }}>
                  <TrendingUp size={20} color="#a78bfa" />
                </div>
              </div>
            </div>

            {/* Bottom glow line */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5,
              background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(8,145,178,0.4), transparent)',
            }} />
          </div>
        </Tilt>
      </div>

      {/* ── Stat cards ──────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Zap size={11} color="#a78bfa" />
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
            Métricas del día
          </span>
        </div>
        <div ref={statsRef} className="r-grid-4">
          {stats.map(({ key, label, Icon, color, glow, rgb }) => {
            const val = data?.[key];
            return (
              <Tilt key={key} intensity={8}>
                <div style={{
                  ...glassCard,
                  padding: 24,
                  transition: 'box-shadow 0.3s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.4), 0 0 40px ${glow}`}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'}
                >
                  {/* Color glow corner */}
                  <div style={{
                    position: 'absolute', top: -20, right: -20, width: 120, height: 120,
                    background: `radial-gradient(circle, rgba(${rgb},0.25) 0%, transparent 65%)`,
                    pointerEvents: 'none',
                  }} />
                  {/* Bottom accent line */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
                  }} />

                  <div style={{
                    display: 'inline-flex', padding: '10px', borderRadius: 13,
                    background: `rgba(${rgb},0.15)`,
                    border: `1px solid rgba(${rgb},0.25)`,
                    marginBottom: 16,
                    transform: 'translateZ(20px)',
                  }}>
                    <Icon size={18} color={color} />
                  </div>

                  <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 6, transform: 'translateZ(15px)' }}>
                    {val === undefined ? (
                      <div style={{
                        width: 40, height: 30, borderRadius: 8,
                        background: 'rgba(255,255,255,0.06)',
                        animation: 'grid-fade 1.2s ease-in-out infinite',
                      }} />
                    ) : <Counter to={val} />}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</p>
                </div>
              </Tilt>
            );
          })}
        </div>
      </div>

      {/* ── Quick actions ────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Sparkles size={11} color="#a78bfa" />
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
            Acceso rápido
          </span>
        </div>
        <div ref={actRef} className="r-grid-4">
          {actions.map(({ label, to, Icon, color, rgb }) => (
            <Tilt key={to} intensity={6}>
              <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    ...glassCard,
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = `rgba(${rgb},0.3)`;
                    el.style.boxShadow   = `0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(${rgb},0.2)`;
                    el.style.background  = `rgba(${rgb},0.07)`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = 'rgba(255,255,255,0.1)';
                    el.style.boxShadow   = '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)';
                    el.style.background  = 'rgba(255,255,255,0.06)';
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `rgba(${rgb},0.15)`,
                    border: `1px solid rgba(${rgb},0.25)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={16} color={color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', flex: 1 }}>{label}</span>
                  <ArrowRight size={12} color={color} style={{ opacity: 0.6 }} />
                </motion.div>
              </Link>
            </Tilt>
          ))}
        </div>
      </div>

      {/* ── Activity placeholder row ──────────────────  */}
      <div className="r-grid-2">
        {/* Last activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45, ease: [0.16,1,0.3,1] }}
          style={{ ...glassCard, padding: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Activity size={14} color="#a78bfa" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Actividad reciente</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Sistema iniciado correctamente',     time: 'Ahora',    dot: '#34d399' },
              { label: 'Base de datos conectada',            time: 'Ahora',    dot: '#22d3ee' },
              { label: 'Cron auto-finalización activo',      time: 'Ahora',    dot: '#a78bfa' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.dot, boxShadow: `0 0 7px ${item.dot}`, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-3)', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace' }}>{item.time}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* System status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.45, ease: [0.16,1,0.3,1] }}
          style={{ ...glassCard, padding: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Zap size={14} color="#fbbf24" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Estado del sistema</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'API Backend',      status: 'Activo',   color: '#34d399' },
              { label: 'Base de datos',    status: 'Activo',   color: '#34d399' },
              { label: 'Cron jobs',        status: 'Corriendo',color: '#22d3ee' },
              { label: 'Sesión actual',    status: user?.rol ?? '—', color: '#a78bfa' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{item.label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: item.color,
                  background: `${item.color}18`,
                  border: `1px solid ${item.color}30`,
                  padding: '3px 10px', borderRadius: 6,
                  fontFamily: 'JetBrains Mono, monospace',
                  textTransform: 'capitalize',
                }}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
