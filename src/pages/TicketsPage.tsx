import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gsap } from 'gsap';
import { useSearchParams } from 'react-router-dom';
import { Ticket, X, CreditCard, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface SeatLayout { floors: { rows: { seats: (number | null)[] }[] }[] }
interface ScheduleDetail {
  id: number; estado: string;
  route: { destino: string; precioSugerido: number; precioMaximoAtt: number; };
  bus: { placa: string; seatTemplate: { capacidadTotal: number; layout: SeatLayout; config: string; }; };
  driver: { nombre: string; };
  branch: { nombre: string; };
  salidaAt: string;
  tickets: { asientoNumero: number; estado: string; pasajeroNombre: string; }[];
}
interface ScheduleListItem { id: number; salidaAt: string; estado: string; route: { destino: string; }; branch: { nombre: string; }; }
interface Branch { id: number; nombre: string; }

const passengerSchema = z.object({
  pasajeroNombre: z.string().min(1, 'Requerido'),
  pasajeroRut: z.string().min(1, 'Requerido'),
  precio: z.coerce.number().positive('Debe ser mayor a 0'),
});
type PassengerForm = z.infer<typeof passengerSchema>;

type SeatStatus = 'free' | 'sold' | 'reserved' | 'selected';

const seatStatusStyle: Record<SeatStatus, string> = {
  free: 'bg-slate-700 border-slate-600 hover:bg-blue-600/30 hover:border-blue-500 cursor-pointer text-slate-300',
  sold: 'bg-red-900/40 border-red-700/50 cursor-not-allowed text-red-400',
  reserved: 'bg-amber-900/40 border-amber-700/50 cursor-not-allowed text-amber-400',
  selected: 'bg-blue-600 border-blue-400 cursor-pointer text-white shadow-lg shadow-blue-900/50 scale-110',
};

export function TicketsPage() {
  const { api, user } = useAuth();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const seatsRef = useRef<HTMLDivElement>(null);

  const [scheduleId, setScheduleId] = useState<number | null>(() => {
    const p = searchParams.get('scheduleId');
    return p ? parseInt(p) : null;
  });
  const [branchFilter, setBranchFilter] = useState('');
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [sellModal, setSellModal] = useState(false);
  const [reserveModal, setReserveModal] = useState(false);
  const [annulTarget, setAnnulTarget] = useState<{ id: number; num: number } | null>(null);
  const [cobrarTarget, setCobrarTarget] = useState<{ id: number; num: number } | null>(null);
  const [singleSeat, setSingleSeat] = useState<number | null>(null);
  const [floorView, setFloorView] = useState(0);

  const { data: branches } = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: () => api.get('/branches').then(r => r.data) });
  const { data: scheduleList } = useQuery<ScheduleListItem[]>({
    queryKey: ['schedules-list', branchFilter],
    queryFn: () => {
      const params = new URLSearchParams({ estado: 'Habilitada' });
      if (branchFilter) params.set('branchId', branchFilter);
      return api.get(`/schedules?${params}`).then(r => r.data);
    },
  });
  const { data: schedule, isLoading } = useQuery<ScheduleDetail>({
    queryKey: ['schedule-detail', scheduleId],
    queryFn: () => api.get(`/schedules/${scheduleId}`).then(r => r.data),
    enabled: !!scheduleId,
  });

  const { register: regSell, handleSubmit: hsSell, reset: resetSell, formState: { errors: errSell, isSubmitting: subSell } } = useForm<PassengerForm>({ resolver: zodResolver(passengerSchema) });
  const { register: regRes, handleSubmit: hsRes, reset: resetRes, formState: { errors: errRes, isSubmitting: subRes } } = useForm<PassengerForm>({ resolver: zodResolver(passengerSchema) });

  useEffect(() => {
    setSelectedSeats([]);
    setFloorView(0);
  }, [scheduleId]);

  useEffect(() => {
    if (seatsRef.current && schedule) {
      gsap.fromTo(Array.from(seatsRef.current.querySelectorAll('.seat')), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, stagger: 0.008, duration: 0.3, ease: 'back.out(1.5)', delay: 0.1 });
    }
  }, [schedule, floorView]);

  const getSeatStatus = (num: number): SeatStatus => {
    if (selectedSeats.includes(num)) return 'selected';
    const t = schedule?.tickets.find(t => t.asientoNumero === num);
    if (!t) return 'free';
    return t.estado === 'Reservado' ? 'reserved' : 'sold';
  };

  const toggleSeat = (num: number) => {
    const status = getSeatStatus(num);
    if (status === 'sold') return;
    if (status === 'reserved') {
      const t = schedule!.tickets.find(t => t.asientoNumero === num && t.estado === 'Reservado');
      if (t) { setCobrarTarget({ id: 0, num }); } // will be resolved by ticket id lookup
      return;
    }
    setSelectedSeats(prev => prev.includes(num) ? prev.filter(s => s !== num) : [...prev, num]);
  };

  const sellMutation = useMutation({
    mutationFn: (passengers: PassengerForm[]) =>
      api.post('/tickets/sell', {
        scheduleId,
        asientos: passengers.map((p, i) => ({ ...p, asientoNumero: selectedSeats[i] })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-detail', scheduleId] });
      toast.success(`${selectedSeats.length} boleto${selectedSeats.length > 1 ? 's' : ''} vendido${selectedSeats.length > 1 ? 's' : ''}`);
      setSelectedSeats([]); setSellModal(false); resetSell();
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al vender'),
  });

  const reserveMutation = useMutation({
    mutationFn: (data: PassengerForm) => api.post('/tickets/reserve', { scheduleId, asientoNumero: singleSeat, ...data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-detail', scheduleId] });
      toast.success('Asiento reservado'); setReserveModal(false); resetRes(); setSingleSeat(null); setSelectedSeats([]);
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const annulMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tickets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule-detail', scheduleId] }); toast.success('Boleto anulado'); setAnnulTarget(null); },
  });

  const cobrarMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/tickets/${id}/cobrar`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule-detail', scheduleId] }); toast.success('Reserva cobrada'); setCobrarTarget(null); },
  });

  const isSupervisorOrAbove = user?.rol === 'admin' || user?.rol === 'supervisor' || user?.rol === 'boletero';
  const floors = schedule?.bus.seatTemplate.layout?.floors ?? [];
  const currentFloor = floors[floorView];

  return (
    <div>
      <PageHeader title="Venta de Boletos" subtitle="Selecciona asientos y vende" icon={<Ticket size={20} />} />

      {/* Schedule selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          style={{ padding: '10px 14px', fontSize: 13, borderRadius: 11, fontFamily: 'inherit', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none', appearance: 'none', cursor: 'pointer', minWidth: 160 }}
        >
          <option value="">Todas las sucursales</option>
          {branches?.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
        <select
          value={scheduleId ?? ''}
          onChange={e => setScheduleId(e.target.value ? parseInt(e.target.value) : null)}
          style={{ flex: 1, maxWidth: 480, padding: '10px 14px', fontSize: 13, borderRadius: 11, fontFamily: 'inherit', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', outline: 'none', appearance: 'none', cursor: 'pointer' }}
        >
          <option value="">Seleccionar habilitación...</option>
          {scheduleList?.map(s => (
            <option key={s.id} value={s.id}>
              {s.branch.nombre} → {s.route.destino} · {new Date(s.salidaAt).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
            </option>
          ))}
        </select>
      </div>

      {!scheduleId && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ padding: 20, borderRadius: 20, background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', color: 'var(--text-3)', marginBottom: 18, display: 'flex' }}>
            <Ticket size={36} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Selecciona una habilitación</h3>
          <p style={{ fontSize: 13, color: 'var(--text-4)' }}>Elige una salida activa para ver el mapa de asientos</p>
        </div>
      )}

      {scheduleId && isLoading && <Spinner fullPage />}

      {schedule && (
        <div className="tickets-layout">
          {/* Seat map */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Info bar */}
            <div style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '14px 18px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 15 }}>{schedule.branch.nombre} → {schedule.route.destino}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>
                    {new Date(schedule.salidaAt).toLocaleString('es-CL')} · {schedule.bus.placa} · {schedule.driver.nombre}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-3)' }}>
                  <span style={{ fontWeight: 600, color: '#6ee7b7' }}>{schedule.bus.seatTemplate.capacidadTotal - schedule.tickets.length} libres</span>
                  <span>/</span>
                  <span>{schedule.bus.seatTemplate.capacidadTotal} total</span>
                </div>
              </div>
            </div>

            {/* Floor selector */}
            {floors.length > 1 && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                {floors.map((_, i) => (
                  <button key={i} onClick={() => setFloorView(i)}
                    style={{ padding: '7px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', fontFamily: 'inherit', background: floorView === i ? 'rgba(139,92,246,0.28)' : 'transparent', color: floorView === i ? '#c4b5fd' : 'var(--text-3)', border: floorView === i ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent' }}>
                    Piso {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 18, marginBottom: 14, fontSize: 12, color: 'var(--text-3)' }}>
              {[
                { bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.15)', label: 'Libre' },
                { bg: 'rgba(139,92,246,0.6)', border: 'rgba(139,92,246,0.8)', label: 'Seleccionado' },
                { bg: 'rgba(239,68,68,0.35)', border: 'rgba(239,68,68,0.5)', label: 'Vendido' },
                { bg: 'rgba(245,158,11,0.35)', border: 'rgba(245,158,11,0.5)', label: 'Reservado' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 13, height: 13, borderRadius: 4, background: l.bg, border: `1px solid ${l.border}` }} />
                  {l.label}
                </div>
              ))}
            </div>

            {/* Seat grid */}
            <div ref={seatsRef} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: 22 }}>
              {/* Driver */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <div style={{ padding: '6px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🚌 Conductor
                </div>
              </div>

              {currentFloor?.rows.map((row, rIdx) => (
                <div key={rIdx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-4)', width: 20, textAlign: 'center', flexShrink: 0 }}>{rIdx + 1}</span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {row.seats.map((seatNum, sIdx) =>
                      seatNum === null ? (
                        <div key={sIdx} style={{ width: 36, height: 36 }} />
                      ) : (
                        <button
                          key={sIdx}
                          onClick={() => toggleSeat(seatNum)}
                          className={`seat w-9 h-9 rounded-lg border text-xs font-bold transition-all duration-150 ${seatStatusStyle[getSeatStatus(seatNum)]}`}
                        >
                          {String(seatNum).padStart(2, '0')}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected seats action bar */}
            <AnimatePresence>
              {selectedSeats.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  style={{ marginTop: 14, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#c7d2fe' }}>
                      {selectedSeats.length} asiento{selectedSeats.length > 1 ? 's' : ''} seleccionado{selectedSeats.length > 1 ? 's' : ''}:&nbsp;
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#a5b4fc' }}>{selectedSeats.map(s => String(s).padStart(2, '0')).join(', ')}</span>
                    </p>
                    <p style={{ fontSize: 12, color: '#818cf8', marginTop: 3 }}>Precio sugerido: ${schedule.route.precioSugerido.toLocaleString('es-CL')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="sm" icon={<X size={13} />} onClick={() => setSelectedSeats([])}>Limpiar</Button>
                    {selectedSeats.length === 1 && (
                      <Button variant="secondary" size="sm" icon={<Clock size={13} />}
                        onClick={() => { setSingleSeat(selectedSeats[0]); resetRes({ precio: schedule.route.precioSugerido }); setReserveModal(true); }}>
                        Reservar
                      </Button>
                    )}
                    {isSupervisorOrAbove && (
                      <Button size="sm" icon={<CreditCard size={13} />}
                        onClick={() => { resetSell({ precio: schedule.route.precioSugerido }); setSellModal(true); }}>
                        Vender {selectedSeats.length > 1 ? `(${selectedSeats.length})` : ''}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sold tickets sidebar */}
          <div style={{ width: 288, flexShrink: 0 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Pasajeros registrados</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {schedule.tickets.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-4)', padding: '16px 0', textAlign: 'center' }}>Sin pasajeros</p>}
              {schedule.tickets.map(t => (
                <div key={t.asientoNumero} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, backdropFilter: 'blur(18px)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#a5b4fc', width: 22, flexShrink: 0 }}>{String(t.asientoNumero).padStart(2, '0')}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{t.pasajeroNombre}</p>
                    <Badge color={t.estado === 'Vendido' ? 'green' : 'yellow'}>{t.estado}</Badge>
                  </div>
                  {(user?.rol === 'admin' || user?.rol === 'supervisor') && (
                    <button
                      onClick={() => {
                        setAnnulTarget({ id: 0, num: t.asientoNumero });
                      }}
                      style={{ color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'color 0.15s' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sell modal (multi-seat) */}
      <Modal open={sellModal} onClose={() => setSellModal(false)} title={`Vender ${selectedSeats.length} asiento${selectedSeats.length > 1 ? 's' : ''}`} size="lg">
        {selectedSeats.length === 1 ? (
          <form onSubmit={hsSell(d => sellMutation.mutate([d]))} className="flex flex-col gap-4">
            <p className="text-sm text-slate-400">Asiento <span className="font-mono text-blue-300">{String(selectedSeats[0]).padStart(2, '0')}</span></p>
            <Input label="Nombre pasajero" {...regSell('pasajeroNombre')} error={errSell.pasajeroNombre?.message} />
            <Input label="RUT" {...regSell('pasajeroRut')} placeholder="12.345.678-9" error={errSell.pasajeroRut?.message} />
            <Input label="Precio ($)" type="number" {...regSell('precio')} error={errSell.precio?.message} hint={`Máx. ATT: $${schedule?.route.precioMaximoAtt.toLocaleString('es-CL')}`} />
            <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" type="button" onClick={() => setSellModal(false)}>Cancelar</Button><Button size="sm" type="submit" loading={subSell || sellMutation.isPending}>Confirmar venta</Button></div>
          </form>
        ) : (
          <MultiSeatSellForm
            seats={selectedSeats}
            suggestedPrice={schedule?.route.precioSugerido ?? 0}
            maxPrice={schedule?.route.precioMaximoAtt ?? 0}
            onSubmit={data => sellMutation.mutate(data)}
            loading={sellMutation.isPending}
            onClose={() => setSellModal(false)}
          />
        )}
      </Modal>

      {/* Reserve modal */}
      <Modal open={reserveModal} onClose={() => setReserveModal(false)} title={`Reservar asiento ${String(singleSeat ?? 0).padStart(2, '0')}`}>
        <form onSubmit={hsRes(d => reserveMutation.mutate(d))} className="flex flex-col gap-4">
          <Input label="Nombre pasajero" {...regRes('pasajeroNombre')} error={errRes.pasajeroNombre?.message} />
          <Input label="RUT" {...regRes('pasajeroRut')} placeholder="12.345.678-9" error={errRes.pasajeroRut?.message} />
          <Input label="Precio ($)" type="number" {...regRes('precio')} error={errRes.precio?.message} />
          <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" type="button" onClick={() => setReserveModal(false)}>Cancelar</Button><Button size="sm" type="submit" loading={subRes || reserveMutation.isPending}>Reservar</Button></div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!annulTarget}
        onClose={() => setAnnulTarget(null)}
        onConfirm={() => annulTarget && annulMutation.mutate(annulTarget.id)}
        title="Anular boleto"
        message={`¿Anular el boleto del asiento ${annulTarget?.num}? Esta acción no se puede deshacer.`}
        confirmLabel="Anular"
        loading={annulMutation.isPending}
      />

      <ConfirmDialog
        open={!!cobrarTarget}
        onClose={() => setCobrarTarget(null)}
        onConfirm={() => cobrarTarget && cobrarMutation.mutate(cobrarTarget.id)}
        title="Cobrar reserva"
        message={`¿Cobrar la reserva del asiento ${cobrarTarget?.num}?`}
        confirmLabel="Cobrar"
        loading={cobrarMutation.isPending}
      />
    </div>
  );
}

function MultiSeatSellForm({ seats, suggestedPrice, maxPrice, onSubmit, loading, onClose }: {
  seats: number[];
  suggestedPrice: number;
  maxPrice: number;
  onSubmit: (data: PassengerForm[]) => void;
  loading: boolean;
  onClose: () => void;
}) {
  const schema = z.object({
    passengers: z.array(z.object({
      pasajeroNombre: z.string().min(1, 'Requerido'),
      pasajeroRut: z.string().min(1, 'Requerido'),
      precio: z.coerce.number().positive(),
    })),
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { passengers: seats.map(() => ({ pasajeroNombre: '', pasajeroRut: '', precio: suggestedPrice })) },
  });

  return (
    <form onSubmit={handleSubmit(d => onSubmit(d.passengers))} className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
      {seats.map((seat, i) => (
        <div key={seat} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs font-semibold text-blue-300 mb-3">Asiento {String(seat).padStart(2, '0')}</p>
          <div className="flex flex-col gap-3">
            <Input label="Nombre" {...register(`passengers.${i}.pasajeroNombre`)} error={(errors.passengers?.[i]?.pasajeroNombre as { message?: string })?.message} />
            <Input label="RUT" {...register(`passengers.${i}.pasajeroRut`)} placeholder="12.345.678-9" />
            <Input label="Precio" type="number" {...register(`passengers.${i}.precio`)} hint={`Máx. ATT: $${maxPrice.toLocaleString('es-CL')}`} />
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-2 sticky bottom-0 bg-slate-900 pt-2">
        <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancelar</Button>
        <Button size="sm" type="submit" loading={loading}>Confirmar venta ({seats.length})</Button>
      </div>
    </form>
  );
}
