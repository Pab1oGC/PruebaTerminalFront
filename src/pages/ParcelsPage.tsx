import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gsap } from 'gsap';
import { Package, Plus, ChevronRight, Truck, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface Schedule { id: number; salidaAt: string; estado: string; route: { destino: string }; branch: { nombre: string }; }
interface Parcel {
  id: number; scheduleId: number;
  remitenteNombre: string; remitenteCi: string; remitenteTel?: string;
  destinatarioNombre: string; destinatarioCi: string; destinatarioTel?: string;
  descripcion: string; pesoKg?: number; precio: number;
  estado: 'Registrada' | 'Embarcada' | 'Entregada';
  registradoAt: string;
}

const estadoColor = { Registrada: 'blue', Embarcada: 'yellow', Entregada: 'green' } as const;

const schema = z.object({
  scheduleId: z.coerce.number().int().positive('Selecciona una habilitación'),
  remitenteNombre: z.string().min(1, 'Requerido').max(128),
  remitenteCi: z.string().min(1, 'Requerido').max(20),
  remitenteTel: z.string().max(20).optional().or(z.literal('')),
  destinatarioNombre: z.string().min(1, 'Requerido').max(128),
  destinatarioCi: z.string().min(1, 'Requerido').max(20),
  destinatarioTel: z.string().max(20).optional().or(z.literal('')),
  descripcion: z.string().min(1, 'Requerido'),
  pesoKg: z.coerce.number().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : Number(v)),
  precio: z.coerce.number().positive('Precio requerido'),
});
type FormData = z.infer<typeof schema>;

export function ParcelsPage() {
  const { api, user } = useAuth();
  const qc = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Parcel | null>(null);

  const { data: schedules } = useQuery<Schedule[]>({
    queryKey: ['schedules-active'],
    queryFn: () => api.get('/schedules').then(r =>
      (r.data as Schedule[]).filter(s => !['Finalizada', 'Cancelada'].includes(s.estado))
    ),
  });

  const { data: parcels, isLoading } = useQuery<Parcel[]>({
    queryKey: ['parcels', selectedSchedule],
    queryFn: () => {
      const url = selectedSchedule ? `/parcels?scheduleId=${selectedSchedule}` : '/parcels';
      return api.get(url).then(r => r.data);
    },
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (parcels && listRef.current) {
      gsap.fromTo(Array.from(listRef.current.children), { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.35, ease: 'power2.out' });
    }
  }, [parcels]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/parcels', { ...data, remitenteTel: data.remitenteTel || undefined, destinatarioTel: data.destinatarioTel || undefined }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parcels'] }); toast.success('Encomienda registrada'); setModalOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const estadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => api.patch(`/parcels/${id}/estado`, { estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parcels'] }); toast.success('Estado actualizado'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/parcels/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parcels'] }); toast.success('Encomienda cancelada'); setDeleteTarget(null); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const canModify = user?.rol === 'admin' || user?.rol === 'supervisor' || user?.rol === 'boletero';
  const canDelete = user?.rol === 'admin' || user?.rol === 'supervisor';

  const openModal = () => {
    reset();
    if (selectedSchedule) setValue('scheduleId', Number(selectedSchedule));
    setModalOpen(true);
  };

  const fmt = (v: number) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(v);

  return (
    <div>
      <PageHeader
        title="Encomiendas"
        subtitle="Gestión de encomiendas por habilitación"
        icon={<Package size={20} />}
        actions={canModify ? <Button icon={<Plus size={16} />} onClick={openModal}>Nueva encomienda</Button> : undefined}
      />

      {/* Filtro por habilitación */}
      <div style={{ marginBottom: 20, maxWidth: 480, position: 'relative' }}>
        <select
          value={selectedSchedule}
          onChange={e => setSelectedSchedule(e.target.value)}
          style={{
            width: '100%',
            padding: '11px 40px 11px 15px',
            fontSize: 14,
            borderRadius: 11,
            fontFamily: 'inherit',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#f1f5f9',
            outline: 'none',
            appearance: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(167,139,250,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
        >
          <option value="">Todas las habilitaciones</option>
          {schedules?.map(s => (
            <option key={s.id} value={s.id}>
              {new Date(s.salidaAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} — {s.route.destino} ({s.branch.nombre})
            </option>
          ))}
        </select>
        <svg
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width={14} height={14} viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isLoading && <Spinner fullPage />}
      {!isLoading && parcels?.length === 0 && (
        <EmptyState title="Sin encomiendas" description="No hay encomiendas registradas para esta selección" />
      )}

      <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {parcels?.map(parcel => (
          <div key={parcel.id} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Badge color={estadoColor[parcel.estado]}>{parcel.estado}</Badge>
                  <span style={{ fontSize: 12, color: 'var(--text-4)', fontFamily: 'JetBrains Mono, monospace' }}>#{parcel.id}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-4)' }}>•</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc' }}>{fmt(parcel.precio)}</span>
                  {parcel.pesoKg && <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{parcel.pesoKg} kg</span>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Remitente</p>
                    <p style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 600 }}>{parcel.remitenteNombre}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{parcel.remitenteCi}{parcel.remitenteTel && ` · ${parcel.remitenteTel}`}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Destinatario</p>
                    <p style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 600 }}>{parcel.destinatarioNombre}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{parcel.destinatarioCi}{parcel.destinatarioTel && ` · ${parcel.destinatarioTel}`}</p>
                  </div>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parcel.descripcion}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                {parcel.estado === 'Registrada' && canModify && (
                  <button
                    onClick={() => estadoMutation.mutate({ id: parcel.id, estado: 'Embarcada' })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, borderRadius: 9, background: 'rgba(245,158,11,0.1)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.22)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                  >
                    <Truck size={13} /> Embarcar
                  </button>
                )}
                {parcel.estado === 'Embarcada' && canModify && (
                  <button
                    onClick={() => estadoMutation.mutate({ id: parcel.id, estado: 'Entregada' })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, borderRadius: 9, background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.22)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                  >
                    <CheckCircle size={13} /> Entregar
                  </button>
                )}
                {parcel.estado === 'Registrada' && canDelete && (
                  <button
                    onClick={() => setDeleteTarget(parcel)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, borderRadius: 9, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.22)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                  >
                    <Trash2 size={13} /> Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal nueva encomienda */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar encomienda" size="lg">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="flex flex-col gap-4">
          <Select label="Habilitación" {...register('scheduleId')} error={errors.scheduleId?.message}>
            <option value="">Seleccionar...</option>
            {schedules?.map(s => (
              <option key={s.id} value={s.id}>
                {new Date(s.salidaAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} — {s.route.destino}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider font-medium">
              <ChevronRight size={12} /> Remitente
            </div>
            <Input label="Nombre" {...register('remitenteNombre')} error={errors.remitenteNombre?.message} />
            <Input label="CI / RUT" {...register('remitenteCi')} error={errors.remitenteCi?.message} />
            <Input label="Teléfono (opcional)" {...register('remitenteTel')} className="col-span-2" />

            <div className="col-span-2 flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider font-medium mt-1">
              <ChevronRight size={12} /> Destinatario
            </div>
            <Input label="Nombre" {...register('destinatarioNombre')} error={errors.destinatarioNombre?.message} />
            <Input label="CI / RUT" {...register('destinatarioCi')} error={errors.destinatarioCi?.message} />
            <Input label="Teléfono (opcional)" {...register('destinatarioTel')} className="col-span-2" />
          </div>

          <Input label="Descripción del contenido" {...register('descripcion')} error={errors.descripcion?.message} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Peso (kg, opcional)" type="number" step="0.1" {...register('pesoKg')} />
            <Input label="Precio (Bs.)" type="number" step="0.5" {...register('precio')} error={errors.precio?.message} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>Registrar encomienda</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Cancelar encomienda"
        description={`¿Cancelar la encomienda de ${deleteTarget?.remitenteNombre} para ${deleteTarget?.destinatarioNombre}?`}
        confirmLabel="Cancelar encomienda"
        variant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
