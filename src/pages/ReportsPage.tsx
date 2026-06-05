import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { BarChart2, TrendingUp, Ticket, Package, Bus, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';

interface Resumen { boletosHoy: number; ingresosHoy: number; encomiendasPendientes: number; habilitacionesActivas: number; flotaActiva: number; boletosTotal: number; }
interface VentaDiaria { fecha: string; cantidad: number; total: number; }
interface RutaTop { routeId: number; destino: string; origen: string; totalBoletos: number; totalIngresos: number; }
interface Ocupacion { destino: string; totalViajes: number; totalAsientos: number; totalVendidos: number; pctOcupacion: number; }

function fmt(v: number) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', maximumFractionDigits: 0 }).format(v);
}

function StatCard({ icon, label, value, sub, color = 'blue' }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }) {
  const accents: Record<string, { bg: string; border: string; ic: string; val: string }> = {
    blue:   { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.22)',  ic: '#818cf8', val: '#a5b4fc' },
    green:  { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.22)',  ic: '#34d399', val: '#6ee7b7' },
    purple: { bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.22)',  ic: '#a78bfa', val: '#c4b5fd' },
    slate:  { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.09)', ic: 'var(--text-3)', val: 'var(--text-1)' },
  };
  const ac = accents[color] ?? accents.blue;
  return (
    <div style={{ background: ac.bg, border: `1px solid ${ac.border}`, borderRadius: 14, padding: '16px 18px', backdropFilter: 'blur(18px)' }}>
      <div style={{ display: 'inline-flex', padding: 8, borderRadius: 10, background: `${ac.ic}18`, color: ac.ic, marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: ac.val, marginTop: 4 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15,10,30,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', fontSize: 12, backdropFilter: 'blur(16px)' }}>
      <p style={{ color: 'var(--text-3)', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#a5b4fc', fontWeight: 600 }}>{payload[0]?.value} boletos</p>
      <p style={{ color: '#6ee7b7' }}>{fmt(payload[1]?.value ?? 0)}</p>
    </div>
  );
}

export function ReportsPage() {
  const { api } = useAuth();
  const cardsRef = useRef<HTMLDivElement>(null);

  const { data: resumen, isLoading: loadRes } = useQuery<Resumen>({
    queryKey: ['reports-resumen'],
    queryFn: () => api.get('/reports/resumen').then(r => r.data),
  });
  const { data: ventas, isLoading: loadVentas } = useQuery<VentaDiaria[]>({
    queryKey: ['reports-ventas'],
    queryFn: () => api.get('/reports/ventas-diarias?dias=30').then(r => r.data),
  });
  const { data: rutasTop } = useQuery<RutaTop[]>({
    queryKey: ['reports-rutas'],
    queryFn: () => api.get('/reports/rutas-top').then(r => r.data),
  });
  const { data: ocupacion } = useQuery<Ocupacion[]>({
    queryKey: ['reports-ocupacion'],
    queryFn: () => api.get('/reports/ocupacion').then(r => r.data),
  });

  useEffect(() => {
    if (resumen && cardsRef.current) {
      gsap.fromTo(Array.from(cardsRef.current.children), { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.5, ease: 'power3.out' });
    }
  }, [resumen]);

  if (loadRes) return <Spinner fullPage />;

  const chartData = (ventas ?? []).map(v => ({
    fecha: new Date(v.fecha + 'T00:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
    cantidad: v.cantidad,
    total: v.total,
  }));

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle="Resumen de actividad y estadísticas"
        icon={<BarChart2 size={20} />}
      />

      {/* Stat cards */}
      <div ref={cardsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon={<Ticket size={18} />} label="Boletos hoy" value={resumen?.boletosHoy ?? 0} color="blue" />
        <StatCard icon={<TrendingUp size={18} />} label="Ingresos hoy" value={fmt(resumen?.ingresosHoy ?? 0)} color="green" />
        <StatCard icon={<Calendar size={18} />} label="Hab. activas" value={resumen?.habilitacionesActivas ?? 0} color="purple" />
        <StatCard icon={<Package size={18} />} label="Encomiendas pend." value={resumen?.encomiendasPendientes ?? 0} color="slate" />
        <StatCard icon={<Bus size={18} />} label="Flota activa" value={resumen?.flotaActiva ?? 0} color="slate" />
        <StatCard icon={<Ticket size={18} />} label="Boletos total" value={resumen?.boletosTotal ?? 0} color="blue" />
      </div>

      {/* Gráfico ventas diarias */}
      <div style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '20px 24px', marginBottom: 22 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 18 }}>Ventas últimos 30 días</h3>
        {loadVentas ? <Spinner /> : chartData.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center', padding: '32px 0' }}>Sin datos de ventas</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="fecha" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.1)' }} />
              <Bar yAxisId="left" dataKey="cantidad" fill="#818cf8" radius={[4, 4, 0, 0]} name="Boletos" />
              <Bar yAxisId="right" dataKey="total" fill="#34d399" radius={[4, 4, 0, 0]} name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(400px, 100%), 1fr))', gap: 20 }}>
        {/* Rutas top */}
        <div style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 16 }}>Top 10 rutas por ingresos</h3>
          {!rutasTop ? <Spinner /> : rutasTop.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Sin datos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rutasTop.map((r, i) => {
                const maxIngresos = rutasTop[0]?.totalIngresos ?? 1;
                const pct = (r.totalIngresos / maxIngresos) * 100;
                return (
                  <div key={r.routeId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-4)', width: 22, textAlign: 'right', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>#{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <p style={{ fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.origen} → {r.destino}</p>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                          <p style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 600 }}>{fmt(r.totalIngresos)}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-4)' }}>{r.totalBoletos} boletos</p>
                        </div>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg,#818cf8,#a78bfa)', borderRadius: 4, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ocupación */}
        <div style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 16 }}>Ocupación por destino</h3>
          {!ocupacion ? <Spinner /> : ocupacion.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Sin viajes finalizados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ocupacion.map((o) => (
                <div key={o.destino}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-1)' }}>{o.destino}</p>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: o.pctOcupacion >= 80 ? '#6ee7b7' : o.pctOcupacion >= 50 ? '#fcd34d' : 'var(--text-3)' }}>
                        {o.pctOcupacion}%
                      </span>
                      <p style={{ fontSize: 11, color: 'var(--text-4)' }}>{o.totalVendidos}/{o.totalAsientos} asientos · {o.totalViajes} viajes</p>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{ height: '100%', borderRadius: 4, transition: 'width 0.6s ease', width: `${Math.min(o.pctOcupacion, 100)}%`, background: o.pctOcupacion >= 80 ? '#34d399' : o.pctOcupacion >= 50 ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
