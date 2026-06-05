import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gsap } from 'gsap';
import { Calendar, Plus, ChevronRight, FileText, Play, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';

interface Branch { id: number; nombre: string; ciudad: string; }
interface Ruta { id: number; destino: string; precioSugerido: number; origenBranch: Branch; }
interface BusItem { id: number; placa: string; seatTemplate: { capacidadTotal: number }; }
interface Driver { id: number; nombre: string; }
interface Helper { id: number; nombre: string; }

interface Schedule {
  id: number;
  estado: string;
  salidaAt: string;
  llegadaEstimadaAt?: string;
  route: { destino: string; precioSugerido: number; precioMaximoAtt: number; };
  bus: { placa: string; seatTemplate: { capacidadTotal: number; }; };
  driver: { nombre: string; };
  helper?: { nombre: string; };
  branch: { nombre: string; ciudad: string; };
  _count: { tickets: number; };
}

const schema = z.object({
  routeId: z.coerce.number().int().positive('Selecciona una ruta'),
  busId: z.coerce.number().int().positive('Selecciona un bus'),
  driverId: z.coerce.number().int().positive('Selecciona un chofer'),
  helperId: z.coerce.number().int().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : Number(v)),
  branchId: z.coerce.number().int().positive('Selecciona una sucursal'),
  salidaAt: z.string().min(1, 'Requerido'),
  llegadaEstimadaAt: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const estadoConfig: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'slate' | 'purple'; icon: React.ReactNode }> = {
  Programada: { label: 'Programada', color: 'blue', icon: <Clock size={12} /> },
  Habilitada: { label: 'Habilitada', color: 'green', icon: <Play size={12} /> },
  EnCurso: { label: 'En curso', color: 'purple', icon: <Play size={12} /> },
  Finalizada: { label: 'Finalizada', color: 'slate', icon: <CheckCircle size={12} /> },
  Cancelada: { label: 'Cancelada', color: 'red', icon: <XCircle size={12} /> },
};

export function SchedulesPage() {
  const { api, user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [manifestSchedule, setManifestSchedule] = useState<Schedule | null>(null);
  const [manifestData, setManifestData] = useState<{ tickets: { asientoNumero: number; pasajeroNombre: string; pasajeroRut: string; precio: number; estado: string }[] } | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [fechaFilter, setFechaFilter] = useState(today);
  const [branchFilter, setBranchFilter] = useState('');

  const { data: schedules, isLoading } = useQuery<Schedule[]>({
    queryKey: ['schedules', fechaFilter, branchFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (fechaFilter) params.set('fecha', fechaFilter);
      if (branchFilter) params.set('branchId', branchFilter);
      return api.get(`/schedules?${params}`).then(r => r.data);
    },
  });

  const { data: rutas } = useQuery<Ruta[]>({ queryKey: ['rutas'], queryFn: () => api.get('/rutas').then(r => r.data) });
  const { data: buses } = useQuery<BusItem[]>({ queryKey: ['buses'], queryFn: () => api.get('/buses').then(r => r.data) });
  const { data: drivers } = useQuery<Driver[]>({ queryKey: ['drivers'], queryFn: () => api.get('/drivers').then(r => r.data) });
  const { data: helpers } = useQuery<Helper[]>({ queryKey: ['helpers'], queryFn: () => api.get('/helpers').then(r => r.data) });
  const { data: branches } = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: () => api.get('/branches').then(r => r.data) });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (schedules && listRef.current) {
      gsap.fromTo(Array.from(listRef.current.children), { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: 'power2.out' });
    }
  }, [schedules]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/schedules', {
      ...data,
      salidaAt: new Date(data.salidaAt).toISOString(),
      llegadaEstimadaAt: data.llegadaEstimadaAt ? new Date(data.llegadaEstimadaAt).toISOString() : undefined,
    }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); toast.success('Habilitación creada'); setModalOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const estadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => api.patch(`/schedules/${id}/estado`, { estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); toast.success('Estado actualizado'); },
  });

  const loadManifest = async (s: Schedule) => {
    setManifestSchedule(s);
    const { data } = await api.get(`/schedules/${s.id}/manifiesto`);
    setManifestData(data);
  };

  const canCreate = user?.rol === 'admin' || user?.rol === 'supervisor';

  return (
    <div>
      <PageHeader
        title="Habilitaciones"
        subtitle="Salidas programadas"
        icon={<Calendar size={20} />}
        actions={canCreate ? <Button icon={<Plus size={16} />} onClick={() => { reset(); setModalOpen(true); }}>Nueva habilitación</Button> : undefined}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <input
          type="date"
          value={fechaFilter}
          onChange={e => setFechaFilter(e.target.value)}
          style={{
            padding: '10px 14px', fontSize: 13, borderRadius: 11, fontFamily: 'inherit',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#f1f5f9', outline: 'none', colorScheme: 'dark', cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
        />
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          style={{
            padding: '10px 36px 10px 14px', fontSize: 13, borderRadius: 11, fontFamily: 'inherit',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#f1f5f9', outline: 'none', appearance: 'none', cursor: 'pointer',
            transition: 'border-color 0.2s', minWidth: 180,
          }}
        >
          <option value="">Todas las sucursales</option>
          {branches?.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </div>

      {isLoading && <Spinner fullPage />}
      {!isLoading && schedules?.length === 0 && (
        <EmptyState title="Sin habilitaciones" description="No hay salidas programadas para este día" />
      )}

      {!isLoading && schedules && schedules.length > 0 && (
        <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {schedules.map(s => {
            const cfg = estadoConfig[s.estado] ?? estadoConfig.Programada;
            const ocupacion = s._count.tickets;
            const capacidad = s.bus.seatTemplate.capacidadTotal;
            const pct = Math.round((ocupacion / capacidad) * 100);
            return (
              <div key={s.id} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-3)' }}>{s.branch.nombre}</span>
                        <ChevronRight size={13} style={{ color: 'var(--text-4)' }} />
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{s.route.destino}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                        {new Date(s.salidaAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                        {s.llegadaEstimadaAt && ` → ${new Date(s.llegadaEstimadaAt).toLocaleTimeString('es-CL', { timeStyle: 'short' })}`}
                      </p>
                    </div>
                  </div>
                  <Badge color={cfg.color}>{cfg.icon}&nbsp;{cfg.label}</Badge>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>
                  <span>🚌 {s.bus.placa}</span>
                  <span>👤 {s.driver.nombre}</span>
                  {s.helper && <span>🤝 {s.helper.nombre}</span>}
                </div>

                {/* Ocupación */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-4)', marginBottom: 6 }}>
                    <span>Ocupación</span>
                    <span>{ocupacion}/{capacidad} asientos ({pct}%)</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{ height: '100%', borderRadius: 4, transition: 'width 0.5s ease', width: `${pct}%`, background: pct >= 90 ? '#f87171' : pct >= 70 ? '#fbbf24' : '#34d399' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <Button variant="secondary" size="sm" icon={<FileText size={13} />} onClick={() => loadManifest(s)}>Manifiesto</Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`../tickets?scheduleId=${s.id}`)}>
                    <Ticket /> Boletos
                  </Button>
                  {canCreate && s.estado === 'Programada' && (
                    <Button size="sm" variant="ghost" onClick={() => estadoMutation.mutate({ id: s.id, estado: 'Habilitada' })}>
                      Habilitar
                    </Button>
                  )}
                  {canCreate && s.estado === 'Habilitada' && (
                    <Button size="sm" variant="ghost" onClick={() => estadoMutation.mutate({ id: s.id, estado: 'EnCurso' })}>
                      Iniciar
                    </Button>
                  )}
                  {canCreate && (s.estado === 'Programada' || s.estado === 'Habilitada') && (
                    <Button size="sm" variant="danger" onClick={() => estadoMutation.mutate({ id: s.id, estado: 'Cancelada' })}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nueva habilitación modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva habilitación" size="xl">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Ruta" {...register('routeId')} error={errors.routeId?.message} placeholder="Seleccionar...">
              {rutas?.filter(r => (r as Ruta & { activo?: boolean }).activo !== false).map(r => (
                <option key={r.id} value={r.id}>{r.origenBranch.nombre} → {r.destino}</option>
              ))}
            </Select>
            <Select label="Sucursal de salida" {...register('branchId')} error={errors.branchId?.message} placeholder="Seleccionar...">
              {branches?.filter(b => (b as Branch & { activo?: boolean }).activo !== false).map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Bus" {...register('busId')} error={errors.busId?.message} placeholder="Seleccionar...">
              {buses?.filter(b => (b as BusItem & { activo?: boolean }).activo !== false).map(b => (
                <option key={b.id} value={b.id}>{b.placa} ({b.seatTemplate.capacidadTotal} asientos)</option>
              ))}
            </Select>
            <Select label="Chofer" {...register('driverId')} error={errors.driverId?.message} placeholder="Seleccionar...">
              {drivers?.filter(d => (d as Driver & { activo?: boolean }).activo !== false).map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </Select>
          </div>
          <Select label="Ayudante (opcional)" {...register('helperId')} placeholder="Sin ayudante">
            {helpers?.filter(h => (h as Helper & { activo?: boolean }).activo !== false).map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha y hora de salida" type="datetime-local" {...register('salidaAt')} error={errors.salidaAt?.message} />
            <Input label="Llegada estimada (opcional)" type="datetime-local" {...register('llegadaEstimadaAt')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button size="sm" type="submit" loading={isSubmitting || createMutation.isPending}>Crear habilitación</Button>
          </div>
        </form>
      </Modal>

      {/* Manifest modal */}
      <Modal open={!!manifestSchedule} onClose={() => { setManifestSchedule(null); setManifestData(null); }} title="Manifiesto de pasajeros" size="xl">
        {manifestSchedule && (
          <div>
            <div style={{ marginBottom: 18, padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 14 }}>
              <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{manifestSchedule.branch.nombre} → {manifestSchedule.route.destino}</span>
              <span style={{ color: 'var(--text-4)', marginLeft: 10 }}>
                {new Date(manifestSchedule.salidaAt).toLocaleString('es-CL')} · {manifestSchedule.bus.placa}
              </span>
            </div>
            {!manifestData ? <Spinner fullPage /> : (
              <div>
                {manifestData.tickets.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center', padding: '16px 0' }}>Sin pasajeros registrados</p>
                ) : (
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Asiento</th>
                        <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pasajero</th>
                        <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>RUT</th>
                        <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Precio</th>
                        <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 11, color: 'var(--text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manifestData.tickets.map(t => (
                        <tr key={t.asientoNumero} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '11px 0', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#a5b4fc' }}>{String(t.asientoNumero).padStart(2, '0')}</td>
                          <td style={{ padding: '11px 0', color: 'var(--text-1)' }}>{t.pasajeroNombre}</td>
                          <td style={{ padding: '11px 0', color: 'var(--text-3)' }}>{t.pasajeroRut}</td>
                          <td style={{ padding: '11px 0', textAlign: 'right', color: '#6ee7b7', fontWeight: 600 }}>${t.precio.toLocaleString('es-CL')}</td>
                          <td style={{ padding: '11px 0', textAlign: 'right' }}>
                            <Badge color={t.estado === 'Vendido' ? 'green' : 'yellow'}>{t.estado}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <td colSpan={3} style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-4)' }}>{manifestData.tickets.length} pasajero{manifestData.tickets.length !== 1 ? 's' : ''}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700, color: 'var(--text-1)', fontSize: 15 }}>
                          ${manifestData.tickets.reduce((s, t) => s + t.precio, 0).toLocaleString('es-CL')}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
                <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" size="sm" onClick={() => window.print()}>Imprimir</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Ticket() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    </svg>
  );
}
