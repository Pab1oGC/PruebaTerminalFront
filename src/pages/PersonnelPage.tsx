import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gsap } from 'gsap';
import { Users, Plus, Pencil, PowerOff, AlertTriangle, User } from 'lucide-react';
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

interface Driver { id: number; nombre: string; rut: string; telefono?: string; licenciaVence?: string; activo: boolean; licenciaAlerta?: 'vencida' | 'proxima' | null; }
interface Helper { id: number; nombre: string; rut: string; telefono?: string; activo: boolean; }

const driverSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  rut: z.string().min(1, 'Requerido'),
  telefono: z.string().optional(),
  licenciaVence: z.string().optional(),
});
type DriverForm = z.infer<typeof driverSchema>;

const helperSchema = z.object({ nombre: z.string().min(1, 'Requerido'), rut: z.string().min(1, 'Requerido'), telefono: z.string().optional() });
type HelperForm = z.infer<typeof helperSchema>;

function licenciaColor(alerta?: 'vencida' | 'proxima' | null): 'red' | 'yellow' | 'green' {
  if (alerta === 'vencida') return 'red';
  if (alerta === 'proxima') return 'yellow';
  return 'green';
}

export function PersonnelPage() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'drivers' | 'helpers'>('drivers');
  const listRef = useRef<HTMLDivElement>(null);
  const [driverModal, setDriverModal] = useState(false);
  const [helperModal, setHelperModal] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [editHelper, setEditHelper] = useState<Helper | null>(null);
  const [deactivateDriver, setDeactivateDriver] = useState<Driver | null>(null);
  const [deactivateHelper, setDeactivateHelper] = useState<Helper | null>(null);

  const { data: drivers, isLoading: loadingDrivers } = useQuery<Driver[]>({ queryKey: ['drivers'], queryFn: () => api.get('/drivers').then(r => r.data) });
  const { data: helpers, isLoading: loadingHelpers } = useQuery<Helper[]>({ queryKey: ['helpers'], queryFn: () => api.get('/helpers').then(r => r.data) });

  const df = useForm<DriverForm>({ resolver: zodResolver(driverSchema) });
  const hf = useForm<HelperForm>({ resolver: zodResolver(helperSchema) });

  useEffect(() => {
    if (listRef.current) gsap.fromTo(Array.from(listRef.current.children), { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.35, ease: 'power2.out' });
  }, [tab, drivers, helpers]);

  const saveDriver = useMutation({
    mutationFn: (d: DriverForm) => editDriver ? api.put(`/drivers/${editDriver.id}`, d).then(r => r.data) : api.post('/drivers', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Chofer guardado'); setDriverModal(false); setEditDriver(null); df.reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });
  const saveHelper = useMutation({
    mutationFn: (d: HelperForm) => editHelper ? api.put(`/helpers/${editHelper.id}`, d).then(r => r.data) : api.post('/helpers', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['helpers'] }); toast.success('Ayudante guardado'); setHelperModal(false); setEditHelper(null); hf.reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });
  const deactivateDriverMut = useMutation({
    mutationFn: (id: number) => api.delete(`/drivers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); toast.success('Chofer desactivado'); setDeactivateDriver(null); },
  });
  const deactivateHelperMut = useMutation({
    mutationFn: (id: number) => api.delete(`/helpers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['helpers'] }); toast.success('Ayudante desactivado'); setDeactivateHelper(null); },
  });

  const openCreateDriver = () => { setEditDriver(null); df.reset(); setDriverModal(true); };
  const openEditDriver = (d: Driver) => { setEditDriver(d); df.reset({ nombre: d.nombre, rut: d.rut, telefono: d.telefono, licenciaVence: d.licenciaVence?.slice(0, 10) }); setDriverModal(true); };
  const openCreateHelper = () => { setEditHelper(null); hf.reset(); setHelperModal(true); };
  const openEditHelper = (h: Helper) => { setEditHelper(h); hf.reset({ nombre: h.nombre, rut: h.rut, telefono: h.telefono }); setHelperModal(true); };

  const expiredCount = drivers?.filter(d => d.licenciaAlerta === 'vencida').length ?? 0;
  const soonCount = drivers?.filter(d => d.licenciaAlerta === 'proxima').length ?? 0;

  return (
    <div>
      <PageHeader
        title="Personal"
        subtitle="Choferes y ayudantes"
        icon={<Users size={20} />}
        actions={
          <Button icon={<Plus size={16} />} onClick={tab === 'drivers' ? openCreateDriver : openCreateHelper}>
            {tab === 'drivers' ? 'Nuevo chofer' : 'Nuevo ayudante'}
          </Button>
        }
      />

      {/* Licencia alerts */}
      {(expiredCount > 0 || soonCount > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {expiredCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', fontSize: 13, color: '#fca5a5' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, color: '#f87171' }} />
              <span>{expiredCount} chofer{expiredCount > 1 ? 'es' : ''} con licencia <strong>vencida</strong></span>
            </div>
          )}
          {soonCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.22)', fontSize: 13, color: '#fcd34d' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, color: '#fbbf24' }} />
              <span>{soonCount} chofer{soonCount > 1 ? 'es' : ''} con licencia por <strong>vencer en 30 días</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 4, width: 'fit-content' }}>
        {(['drivers', 'helpers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
              borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === t ? 'rgba(139,92,246,0.28)' : 'transparent',
              color: tab === t ? '#c4b5fd' : 'var(--text-3)',
              border: tab === t ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
              transition: 'all 0.18s', fontFamily: 'inherit',
            }}>
            <User size={15} /> {t === 'drivers' ? 'Choferes' : 'Ayudantes'}
          </button>
        ))}
      </div>

      {(tab === 'drivers' ? loadingDrivers : loadingHelpers) && <Spinner fullPage />}

      {/* Drivers */}
      {tab === 'drivers' && !loadingDrivers && (
        drivers?.length === 0
          ? <EmptyState title="Sin choferes" action={<Button size="sm" onClick={openCreateDriver}>Agregar chofer</Button>} />
          : <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {drivers?.map(d => (
              <div key={d.id} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#a5b4fc' }}>{d.nombre[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 15 }}>{d.nombre}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{d.rut}{d.telefono ? ` · ${d.telefono}` : ''}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  {d.licenciaVence && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 3 }}>Licencia</p>
                      <Badge color={licenciaColor(d.licenciaAlerta)} dot>
                        {d.licenciaAlerta === 'vencida' ? 'Vencida' : d.licenciaAlerta === 'proxima' ? 'Por vencer' : 'Vigente'}
                      </Badge>
                    </div>
                  )}
                  <Badge color={d.activo ? 'green' : 'slate'} dot>{d.activo ? 'Activo' : 'Inactivo'}</Badge>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEditDriver(d)} />
                    {d.activo && <Button variant="danger" size="sm" icon={<PowerOff size={13} />} onClick={() => setDeactivateDriver(d)} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* Helpers */}
      {tab === 'helpers' && !loadingHelpers && (
        helpers?.length === 0
          ? <EmptyState title="Sin ayudantes" action={<Button size="sm" onClick={openCreateHelper}>Agregar ayudante</Button>} />
          : <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {helpers?.map(h => (
              <div key={h.id} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#c4b5fd' }}>{h.nombre[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 15 }}>{h.nombre}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{h.rut}{h.telefono ? ` · ${h.telefono}` : ''}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <Badge color={h.activo ? 'green' : 'slate'} dot>{h.activo ? 'Activo' : 'Inactivo'}</Badge>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEditHelper(h)} />
                    {h.activo && <Button variant="danger" size="sm" icon={<PowerOff size={13} />} onClick={() => setDeactivateHelper(h)} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* Driver Modal */}
      <Modal open={driverModal} onClose={() => { setDriverModal(false); df.reset(); }} title={editDriver ? 'Editar chofer' : 'Nuevo chofer'}>
        <form onSubmit={df.handleSubmit(d => saveDriver.mutate(d))} className="flex flex-col gap-4">
          <Input label="Nombre completo" {...df.register('nombre')} error={df.formState.errors.nombre?.message} />
          <Input label="RUT" {...df.register('rut')} placeholder="12.345.678-9" error={df.formState.errors.rut?.message} />
          <Input label="Teléfono" {...df.register('telefono')} placeholder="+56 9 1234 5678" />
          <Input label="Vencimiento licencia" type="date" {...df.register('licenciaVence')} hint="Recibirás alertas 30 días antes del vencimiento" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setDriverModal(false)}>Cancelar</Button>
            <Button size="sm" type="submit" loading={saveDriver.isPending}>{editDriver ? 'Guardar' : 'Crear chofer'}</Button>
          </div>
        </form>
      </Modal>

      {/* Helper Modal */}
      <Modal open={helperModal} onClose={() => { setHelperModal(false); hf.reset(); }} title={editHelper ? 'Editar ayudante' : 'Nuevo ayudante'}>
        <form onSubmit={hf.handleSubmit(d => saveHelper.mutate(d))} className="flex flex-col gap-4">
          <Input label="Nombre completo" {...hf.register('nombre')} error={hf.formState.errors.nombre?.message} />
          <Input label="RUT" {...hf.register('rut')} placeholder="12.345.678-9" error={hf.formState.errors.rut?.message} />
          <Input label="Teléfono" {...hf.register('telefono')} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setHelperModal(false)}>Cancelar</Button>
            <Button size="sm" type="submit" loading={saveHelper.isPending}>{editHelper ? 'Guardar' : 'Crear ayudante'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deactivateDriver} onClose={() => setDeactivateDriver(null)}
        onConfirm={() => deactivateDriver && deactivateDriverMut.mutate(deactivateDriver.id)}
        title="Desactivar chofer" message={`¿Desactivar a "${deactivateDriver?.nombre}"?`} confirmLabel="Desactivar" loading={deactivateDriverMut.isPending} />
      <ConfirmDialog open={!!deactivateHelper} onClose={() => setDeactivateHelper(null)}
        onConfirm={() => deactivateHelper && deactivateHelperMut.mutate(deactivateHelper.id)}
        title="Desactivar ayudante" message={`¿Desactivar a "${deactivateHelper?.nombre}"?`} confirmLabel="Desactivar" loading={deactivateHelperMut.isPending} />
    </div>
  );
}
