import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wallet, Plus, Lock, TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';

interface Branch { id: number; nombre: string; ciudad: string; }
interface Movement { id: string; tipo: string; origen: string; monto: number; concepto: string; createdAt: string; }
interface Resumen { ventasBoletos: number; ventasEncomiendas: number; movIngresos: number; movEgresos: number; efectivoEsperado: number; }
interface Session {
  id: number; branchId: number; saldoInicial: number; abiertaAt: string;
  cerradaAt?: string; saldoFinal?: number; diferencia?: number; estado: string;
  branch: Branch; movements: Movement[]; resumen: Resumen;
  user?: { nombre: string };
}

const openSchema = z.object({
  branchId: z.coerce.number().int().positive('Selecciona una sucursal'),
  saldoInicial: z.coerce.number().min(0, 'Ingresa el saldo inicial'),
});
const movSchema = z.object({
  tipo: z.enum(['Ingreso', 'Egreso']),
  monto: z.coerce.number().positive('Monto requerido'),
  concepto: z.string().min(1, 'Requerido').max(255),
});
const closeSchema = z.object({
  saldoFinal: z.coerce.number().min(0, 'Ingresa el saldo final'),
});

function fmt(v: number) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(v);
}

function StatCard({ label, value, sub, color = 'slate' }: { label: string; value: string; sub?: string; color?: string }) {
  const accents: Record<string, { bg: string; border: string; val: string }> = {
    blue:  { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.22)',  val: '#a5b4fc' },
    green: { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.22)',  val: '#6ee7b7' },
    red:   { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.22)',   val: '#fca5a5' },
    slate: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.09)', val: 'var(--text-1)' },
  };
  const ac = accents[color] ?? accents.slate;
  return (
    <div style={{ background: ac.bg, border: `1px solid ${ac.border}`, borderRadius: 14, padding: '14px 18px', backdropFilter: 'blur(18px)' }}>
      <p style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: ac.val }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

export function CashPage() {
  const { api, user } = useAuth();
  const qc = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [movModal, setMovModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: session, isLoading } = useQuery<Session | null>({
    queryKey: ['cash-session-current'],
    queryFn: () => api.get('/cash/session/current').then(r => r.data),
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then(r => r.data),
  });

  const { data: history } = useQuery<Session[]>({
    queryKey: ['cash-sessions'],
    queryFn: () => api.get('/cash/sessions').then(r => r.data),
    enabled: historyOpen && (user?.rol === 'admin' || user?.rol === 'supervisor'),
  });

  const openForm = useForm<z.infer<typeof openSchema>>({ resolver: zodResolver(openSchema) });
  const movForm = useForm<z.infer<typeof movSchema>>({ resolver: zodResolver(movSchema) });
  const closeForm = useForm<z.infer<typeof closeSchema>>({ resolver: zodResolver(closeSchema) });

  const openMutation = useMutation({
    mutationFn: (d: z.infer<typeof openSchema>) => api.post('/cash/session', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-session-current'] }); toast.success('Sesión de caja abierta'); setOpenModal(false); openForm.reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const movMutation = useMutation({
    mutationFn: (d: z.infer<typeof movSchema>) => api.post(`/cash/session/${session?.id}/movements`, d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-session-current'] }); toast.success('Movimiento registrado'); setMovModal(false); movForm.reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const closeMutation = useMutation({
    mutationFn: (d: z.infer<typeof closeSchema>) => api.post(`/cash/session/${session?.id}/close`, d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-session-current'] }); qc.invalidateQueries({ queryKey: ['cash-sessions'] }); toast.success('Sesión de caja cerrada'); setCloseModal(false); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  if (isLoading) return <Spinner fullPage />;

  const canAdmin = user?.rol === 'admin' || user?.rol === 'supervisor';

  return (
    <div>
      <PageHeader
        title="Caja"
        subtitle="Control de turno y movimientos de efectivo"
        icon={<Wallet size={20} />}
        actions={
          <div className="flex gap-2">
            {canAdmin && (
              <Button variant="ghost" onClick={() => setHistoryOpen(v => !v)}>
                {historyOpen ? 'Mi sesión' : 'Historial'}
              </Button>
            )}
            {!session && <Button icon={<Plus size={16} />} onClick={() => setOpenModal(true)}>Abrir caja</Button>}
            {session && (
              <>
                <Button variant="ghost" icon={<Plus size={16} />} onClick={() => setMovModal(true)}>Movimiento</Button>
                <Button variant="danger" icon={<Lock size={16} />} onClick={() => setCloseModal(true)}>Cerrar caja</Button>
              </>
            )}
          </div>
        }
      />

      <AnimatePresence mode="wait">
        {!historyOpen ? (
          <motion.div key="session" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!session ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
                <div style={{ padding: 20, borderRadius: 20, background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', color: 'var(--text-3)', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={32} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Sin sesión activa</h3>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24, maxWidth: 300 }}>Abre una sesión de caja para comenzar a registrar movimientos</p>
                <Button icon={<Plus size={16} />} onClick={() => setOpenModal(true)}>Abrir caja</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Header sesión */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '16px 20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Badge color="green">Sesión abierta</Badge>
                      <span style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace' }}>#{session.id}</span>
                    </div>
                    <p style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 15, marginBottom: 3 }}>{session.branch.nombre} — {session.branch.ciudad}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-4)' }}>
                      Abierta: {new Date(session.abiertaAt).toLocaleString('es-BO')}
                    </p>
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-1)' }}>{fmt(session.saldoInicial)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-4)', marginLeft: 6 }}>inicial</span></p>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                  <StatCard label="Ventas boletos (efvo)" value={fmt(session.resumen.ventasBoletos)} color="blue" />
                  <StatCard label="Ventas encomiendas" value={fmt(session.resumen.ventasEncomiendas)} color="blue" />
                  <StatCard label="Ingresos manuales" value={fmt(session.resumen.movIngresos)} color="green" />
                  <StatCard label="Egresos manuales" value={fmt(session.resumen.movEgresos)} color="red" />
                </div>

                <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Efectivo esperado en caja</p>
                    <p style={{ fontSize: 32, fontWeight: 700, color: '#c7d2fe' }}>{fmt(session.resumen.efectivoEsperado)}</p>
                  </div>
                  <DollarSign size={36} style={{ color: '#818cf8' }} />
                </div>

                {/* Movimientos */}
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Movimientos manuales ({session.movements.length})</h3>
                  {session.movements.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Sin movimientos manuales registrados</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {session.movements.map(m => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {m.tipo === 'Ingreso'
                              ? <TrendingUp size={16} style={{ color: '#6ee7b7' }} />
                              : <TrendingDown size={16} style={{ color: '#fca5a5' }} />
                            }
                            <div>
                              <p style={{ fontSize: 14, color: 'var(--text-1)' }}>{m.concepto}</p>
                              <p style={{ fontSize: 12, color: 'var(--text-4)' }}>{new Date(m.createdAt).toLocaleTimeString('es-BO')}</p>
                            </div>
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: m.tipo === 'Ingreso' ? '#6ee7b7' : '#fca5a5' }}>
                            {m.tipo === 'Ingreso' ? '+' : '-'}{fmt(m.monto)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Historial de sesiones</h3>
            {!history ? <Spinner /> : history.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Sin sesiones registradas</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map(s => (
                  <div key={s.id} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <Badge color={s.estado === 'Abierta' ? 'green' : 'slate'}>{s.estado}</Badge>
                          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{s.user?.nombre}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>•</span>
                          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{s.branch.nombre}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-4)' }}>
                          {new Date(s.abiertaAt).toLocaleString('es-BO')}
                          {s.cerradaAt && ` → ${new Date(s.cerradaAt).toLocaleString('es-BO')}`}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 3 }}>Inicial: <span style={{ color: 'var(--text-1)' }}>{fmt(s.saldoInicial)}</span></p>
                        {s.saldoFinal !== undefined && (
                          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 3 }}>Final: <span style={{ color: 'var(--text-1)' }}>{fmt(s.saldoFinal)}</span></p>
                        )}
                        {s.diferencia !== undefined && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', fontSize: 13, fontWeight: 600, color: Math.abs(s.diferencia) < 1 ? '#6ee7b7' : s.diferencia < 0 ? '#fca5a5' : '#fcd34d' }}>
                            {Math.abs(s.diferencia) < 1
                              ? <CheckCircle2 size={13} />
                              : <AlertTriangle size={13} />
                            }
                            Diferencia: {fmt(s.diferencia)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal abrir caja */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir sesión de caja">
        <form onSubmit={openForm.handleSubmit(d => openMutation.mutate(d))} className="flex flex-col gap-4">
          <Select label="Sucursal" {...openForm.register('branchId')} error={openForm.formState.errors.branchId?.message}>
            <option value="">Seleccionar...</option>
            {branches?.filter(b => (b as Branch & { activo?: boolean }).activo !== false).map(b => (
              <option key={b.id} value={b.id}>{b.nombre} — {b.ciudad}</option>
            ))}
          </Select>
          <Input label="Saldo inicial en caja (Bs.)" type="number" step="0.5" {...openForm.register('saldoInicial')} error={openForm.formState.errors.saldoInicial?.message} />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button type="submit" loading={openForm.formState.isSubmitting}>Abrir caja</Button>
          </div>
        </form>
      </Modal>

      {/* Modal movimiento */}
      <Modal open={movModal} onClose={() => setMovModal(false)} title="Registrar movimiento">
        <form onSubmit={movForm.handleSubmit(d => movMutation.mutate(d))} className="flex flex-col gap-4">
          <Select label="Tipo" {...movForm.register('tipo')} error={movForm.formState.errors.tipo?.message}>
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </Select>
          <Input label="Monto (Bs.)" type="number" step="0.5" {...movForm.register('monto')} error={movForm.formState.errors.monto?.message} />
          <Input label="Concepto" {...movForm.register('concepto')} error={movForm.formState.errors.concepto?.message} placeholder="Ej: Pago de comisión, gastos de terminal..." />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setMovModal(false)}>Cancelar</Button>
            <Button type="submit" loading={movForm.formState.isSubmitting}>Registrar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal cerrar caja */}
      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Cerrar sesión de caja">
        <div className="mb-4 p-3 rounded-lg bg-blue-600/10 border border-blue-500/20 text-sm text-blue-300">
          Efectivo esperado: <strong>{fmt(session?.resumen.efectivoEsperado ?? 0)}</strong>
        </div>
        <form onSubmit={closeForm.handleSubmit(d => closeMutation.mutate(d))} className="flex flex-col gap-4">
          <Input label="Efectivo contado en caja (Bs.)" type="number" step="0.5" {...closeForm.register('saldoFinal')} error={closeForm.formState.errors.saldoFinal?.message} />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setCloseModal(false)}>Cancelar</Button>
            <Button type="submit" variant="danger" loading={closeForm.formState.isSubmitting}>Cerrar caja</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
