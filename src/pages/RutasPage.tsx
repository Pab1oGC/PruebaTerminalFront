import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gsap } from 'gsap';
import { MapPin, Plus, Pencil, PowerOff, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';

interface Branch { id: number; nombre: string; ciudad: string; }
interface Ruta {
  id: number;
  destino: string;
  distanciaKm?: number;
  precioMaximoAtt: number;
  precioSugerido: number;
  activo: boolean;
  origenBranch: Branch;
}

const schema = z.object({
  origenBranchId: z.coerce.number().int().positive('Selecciona una sucursal de origen'),
  destino: z.string().min(1, 'Requerido').max(128),
  distanciaKm: z.coerce.number().positive().optional().or(z.literal('')).transform(v => v === '' ? undefined : Number(v)),
  precioMaximoAtt: z.coerce.number().positive('Debe ser mayor a 0'),
  precioSugerido: z.coerce.number().positive('Debe ser mayor a 0'),
});
type FormData = z.infer<typeof schema>;

const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`;

export function RutasPage() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const [editTarget, setEditTarget] = useState<Ruta | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Ruta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: rutas, isLoading } = useQuery<Ruta[]>({ queryKey: ['rutas'], queryFn: () => api.get('/rutas').then(r => r.data) });
  const { data: branches } = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: () => api.get('/branches').then(r => r.data) });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (rutas && listRef.current) {
      gsap.fromTo(Array.from(listRef.current.children), { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.4, ease: 'power2.out' });
    }
  }, [rutas]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editTarget ? api.put(`/rutas/${editTarget.id}`, data).then(r => r.data) : api.post('/rutas', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rutas'] }); toast.success(editTarget ? 'Ruta actualizada' : 'Ruta creada'); closeModal(); },
    onError: (err: unknown) => { toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/rutas/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rutas'] }); toast.success('Ruta desactivada'); setDeactivateTarget(null); },
  });

  const openCreate = () => { setEditTarget(null); reset({ destino: '', precioMaximoAtt: 0, precioSugerido: 0 }); setModalOpen(true); };
  const openEdit = (r: Ruta) => {
    setEditTarget(r);
    reset({ origenBranchId: r.origenBranch.id, destino: r.destino, distanciaKm: r.distanciaKm, precioMaximoAtt: r.precioMaximoAtt, precioSugerido: r.precioSugerido });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); reset(); };

  return (
    <div>
      <PageHeader
        title="Rutas"
        subtitle="Catálogo de rutas con tarifas ATT"
        icon={<MapPin size={20} />}
        actions={<Button icon={<Plus size={16} />} onClick={openCreate}>Nueva ruta</Button>}
      />

      {isLoading && <Spinner fullPage />}
      {!isLoading && rutas?.length === 0 && (
        <EmptyState title="Sin rutas" description="Define rutas para comenzar a vender boletos" action={<Button size="sm" onClick={openCreate}>Crear ruta</Button>} />
      )}

      {!isLoading && rutas && rutas.length > 0 && (
        <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rutas.map(r => (
            <div key={r.id} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>{r.origenBranch.nombre}</span>
                <ChevronRight size={14} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{r.destino}</span>
                {r.distanciaKm && <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{r.distanciaKm} km</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 2 }}>Máx. ATT</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5' }}>{fmt(r.precioMaximoAtt)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 2 }}>Sugerido</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#6ee7b7' }}>{fmt(r.precioSugerido)}</p>
                </div>
                <Badge color={r.activo ? 'green' : 'slate'} dot>{r.activo ? 'Activa' : 'Inactiva'}</Badge>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEdit(r)} />
                  {r.activo && <Button variant="danger" size="sm" icon={<PowerOff size={13} />} onClick={() => setDeactivateTarget(r)} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editTarget ? 'Editar ruta' : 'Nueva ruta'} size="lg">
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="flex flex-col gap-4">
          <Select label="Sucursal de origen" {...register('origenBranchId')} error={errors.origenBranchId?.message} placeholder="Seleccionar...">
            {branches?.filter(b => b).map(b => <option key={b.id} value={b.id}>{b.nombre} — {b.ciudad}</option>)}
          </Select>
          <Input label="Destino" {...register('destino')} error={errors.destino?.message} placeholder="Ej. Puerto Montt" />
          <Input label="Distancia (km, opcional)" type="number" {...register('distanciaKm')} error={errors.distanciaKm?.message} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Precio máximo ATT ($)" type="number" {...register('precioMaximoAtt')} error={errors.precioMaximoAtt?.message} />
            <Input label="Precio sugerido ($)" type="number" {...register('precioSugerido')} error={errors.precioSugerido?.message} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={closeModal}>Cancelar</Button>
            <Button size="sm" type="submit" loading={isSubmitting || saveMutation.isPending}>{editTarget ? 'Guardar' : 'Crear ruta'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
        title="Desactivar ruta"
        message={`¿Desactivar la ruta hacia "${deactivateTarget?.destino}"?`}
        confirmLabel="Desactivar"
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}
