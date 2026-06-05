import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gsap } from 'gsap';
import { Building2, Plus, Pencil, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';

interface Branch {
  id: number;
  nombre: string;
  ciudad: string;
  activo: boolean;
}

const schema = z.object({
  nombre: z.string().min(1, 'Requerido').max(128),
  ciudad: z.string().min(1, 'Requerido').max(128),
});
type FormData = z.infer<typeof schema>;

export function BranchesPage() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Branch | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (branches && listRef.current) {
      gsap.fromTo(
        Array.from(listRef.current.children),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [branches]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editTarget
        ? api.put(`/branches/${editTarget.id}`, data).then(r => r.data)
        : api.post('/branches', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success(editTarget ? 'Sucursal actualizada' : 'Sucursal creada');
      closeModal();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Error al guardar');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/branches/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Sucursal desactivada');
      setDeactivateTarget(null);
    },
    onError: () => toast.error('No se pudo desactivar'),
  });

  const openCreate = () => { setEditTarget(null); reset({ nombre: '', ciudad: '' }); setModalOpen(true); };
  const openEdit = (b: Branch) => { setEditTarget(b); reset({ nombre: b.nombre, ciudad: b.ciudad }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); reset(); };

  return (
    <div>
      <PageHeader
        title="Sucursales"
        subtitle="Gestiona las sedes de la empresa"
        icon={<Building2 size={20} />}
        actions={<Button icon={<Plus size={16} />} onClick={openCreate}>Nueva sucursal</Button>}
      />

      {isLoading && <Spinner fullPage />}

      {!isLoading && branches?.length === 0 && (
        <EmptyState
          title="Sin sucursales"
          description="Crea la primera sucursal para comenzar"
          action={<Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Crear sucursal</Button>}
        />
      )}

      {!isLoading && branches && branches.length > 0 && (
        <div ref={listRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {branches.map(b => (
            <div key={b.id} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <h3 style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 15, marginBottom: 3 }}>{b.nombre}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{b.ciudad}</p>
                </div>
                <Badge color={b.activo ? 'green' : 'slate'} dot>{b.activo ? 'Activa' : 'Inactiva'}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEdit(b)}>Editar</Button>
                {b.activo && (
                  <Button variant="danger" size="sm" icon={<PowerOff size={13} />} onClick={() => setDeactivateTarget(b)}>
                    Desactivar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editTarget ? 'Editar sucursal' : 'Nueva sucursal'}>
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="flex flex-col gap-4">
          <Input label="Nombre" {...register('nombre')} error={errors.nombre?.message} placeholder="Ej. Sucursal Centro" />
          <Input label="Ciudad" {...register('ciudad')} error={errors.ciudad?.message} placeholder="Ej. Santiago" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={closeModal}>Cancelar</Button>
            <Button size="sm" type="submit" loading={isSubmitting || saveMutation.isPending}>
              {editTarget ? 'Guardar cambios' : 'Crear sucursal'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
        title="Desactivar sucursal"
        message={`¿Desactivar "${deactivateTarget?.nombre}"? Dejará de aparecer en nuevas habilitaciones.`}
        confirmLabel="Desactivar"
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}
