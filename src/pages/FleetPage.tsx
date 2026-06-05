import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gsap } from 'gsap';
import { Bus, Plus, Pencil, LayoutGrid, Layers, PowerOff } from 'lucide-react';
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

interface Template { id: number; nombre: string; config: string; pisos: number; capacidadTotal: number; }
interface BusItem {
  id: number; placa: string; marca?: string; modelo?: string; anio?: number; activo: boolean;
  seatTemplate: { id: number; nombre: string; config: string; capacidadTotal: number; };
}

// ── Templates ──
const templateSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  config: z.enum(['2-2', '2-1', '1-2', '1-1']),
  filas: z.coerce.number().int().min(1).max(20),
  pisos: z.coerce.number().int().min(1).max(2),
});
type TemplateForm = z.infer<typeof templateSchema>;

// ── Buses ──
const busSchema = z.object({
  placa: z.string().min(1, 'Requerido'),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  anio: z.coerce.number().int().min(1990).max(2100).optional().or(z.literal('')).transform(v => v === '' ? undefined : Number(v)),
  seatTemplateId: z.coerce.number().int().positive('Selecciona una plantilla'),
});
type BusForm = z.infer<typeof busSchema>;

export function FleetPage() {
  const { api } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'buses' | 'templates'>('buses');
  const listRef = useRef<HTMLDivElement>(null);

  const [templateModal, setTemplateModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [busModal, setBusModal] = useState(false);
  const [editBus, setEditBus] = useState<BusItem | null>(null);
  const [deactivateBus, setDeactivateBus] = useState<BusItem | null>(null);

  const { data: buses, isLoading: loadingBuses } = useQuery<BusItem[]>({ queryKey: ['buses'], queryFn: () => api.get('/buses').then(r => r.data) });
  const { data: templates, isLoading: loadingTemplates } = useQuery<Template[]>({ queryKey: ['templates'], queryFn: () => api.get('/templates').then(r => r.data) });

  const tfForm = useForm<TemplateForm>({ resolver: zodResolver(templateSchema), defaultValues: { config: '2-2', filas: 10, pisos: 1 } });
  const busForm = useForm<BusForm>({ resolver: zodResolver(busSchema) });

  useEffect(() => {
    if (listRef.current) {
      gsap.fromTo(Array.from(listRef.current.children), { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.35, ease: 'power2.out' });
    }
  }, [tab, buses, templates]);

  const saveTf = useMutation({
    mutationFn: (d: TemplateForm) => editTemplate ? api.put(`/templates/${editTemplate.id}`, d).then(r => r.data) : api.post('/templates', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Plantilla guardada'); setTemplateModal(false); setEditTemplate(null); tfForm.reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const saveBus = useMutation({
    mutationFn: (d: BusForm) => editBus ? api.put(`/buses/${editBus.id}`, d).then(r => r.data) : api.post('/buses', d).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buses'] }); toast.success('Bus guardado'); setBusModal(false); setEditBus(null); busForm.reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const deactivateBusMut = useMutation({
    mutationFn: (id: number) => api.delete(`/buses/${id}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buses'] }); toast.success('Bus desactivado'); setDeactivateBus(null); },
  });

  const openCreateBus = () => { setEditBus(null); busForm.reset(); setBusModal(true); };
  const openEditBus = (b: BusItem) => { setEditBus(b); busForm.reset({ placa: b.placa, marca: b.marca, modelo: b.modelo, anio: b.anio, seatTemplateId: b.seatTemplate.id }); setBusModal(true); };
  const openCreateTf = () => { setEditTemplate(null); tfForm.reset({ config: '2-2', filas: 10, pisos: 1 }); setTemplateModal(true); };
  const openEditTf = (t: Template) => { setEditTemplate(t); tfForm.reset({ nombre: t.nombre, config: t.config as TemplateForm['config'], pisos: t.pisos, filas: 1 }); setTemplateModal(true); };

  const isLoading = tab === 'buses' ? loadingBuses : loadingTemplates;

  return (
    <div>
      <PageHeader
        title="Flota"
        subtitle="Buses y plantillas de asientos"
        icon={<Bus size={20} />}
        actions={
          <Button icon={<Plus size={16} />} onClick={tab === 'buses' ? openCreateBus : openCreateTf}>
            {tab === 'buses' ? 'Nuevo bus' : 'Nueva plantilla'}
          </Button>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 4, width: 'fit-content' }}>
        {(['buses', 'templates'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
              borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === t ? 'rgba(139,92,246,0.28)' : 'transparent',
              color: tab === t ? '#c4b5fd' : 'var(--text-3)',
              border: tab === t ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
              transition: 'all 0.18s', fontFamily: 'inherit',
            }}
          >
            {t === 'buses' ? <><Bus size={15} /> Buses</> : <><LayoutGrid size={15} /> Plantillas</>}
          </button>
        ))}
      </div>

      {isLoading && <Spinner fullPage />}

      {/* Buses list */}
      {tab === 'buses' && !loadingBuses && (
        buses?.length === 0
          ? <EmptyState title="Sin buses" description="Agrega el primer bus de la flota" action={<Button size="sm" onClick={openCreateBus}>Agregar bus</Button>} />
          : <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {buses?.map(b => (
              <div key={b.id} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ padding: 10, borderRadius: 12, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', flexShrink: 0 }}>
                  <Bus size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 15 }}>{b.placa}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{[b.marca, b.modelo, b.anio].filter(Boolean).join(' · ')}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-4)' }}>{b.seatTemplate.nombre}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{b.seatTemplate.config} · {b.seatTemplate.capacidadTotal} asientos</p>
                  </div>
                  <Badge color={b.activo ? 'green' : 'slate'} dot>{b.activo ? 'Activo' : 'Inactivo'}</Badge>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEditBus(b)} />
                    {b.activo && <Button variant="danger" size="sm" icon={<PowerOff size={13} />} onClick={() => setDeactivateBus(b)} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* Templates list */}
      {tab === 'templates' && !loadingTemplates && (
        templates?.length === 0
          ? <EmptyState title="Sin plantillas" description="Crea una plantilla de asientos" action={<Button size="sm" onClick={openCreateTf}>Crear plantilla</Button>} />
          : <div ref={listRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
            {templates?.map(t => (
              <div key={t.id} style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 15 }}>{t.nombre}</h3>
                  <Badge color="blue">{t.config}</Badge>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: 'var(--text-3)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Layers size={13} /> {t.pisos} piso{t.pisos > 1 ? 's' : ''}</span>
                  <span>{t.capacidadTotal} asientos</span>
                </div>
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => openEditTf(t)}>Editar</Button>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* Template Modal */}
      <Modal open={templateModal} onClose={() => { setTemplateModal(false); tfForm.reset(); }} title={editTemplate ? 'Editar plantilla' : 'Nueva plantilla'}>
        <form onSubmit={tfForm.handleSubmit(d => saveTf.mutate(d))} className="flex flex-col gap-4">
          <Input label="Nombre" {...tfForm.register('nombre')} error={tfForm.formState.errors.nombre?.message} placeholder="Ej. Estándar 2-2" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Configuración" {...tfForm.register('config')} error={tfForm.formState.errors.config?.message}>
              {['2-2', '2-1', '1-2', '1-1'].map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Pisos" {...tfForm.register('pisos')}>
              <option value={1}>1 piso</option>
              <option value={2}>2 pisos</option>
            </Select>
          </div>
          <Input label="Filas" type="number" {...tfForm.register('filas')} error={tfForm.formState.errors.filas?.message} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setTemplateModal(false)}>Cancelar</Button>
            <Button size="sm" type="submit" loading={saveTf.isPending}>{editTemplate ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      {/* Bus Modal */}
      <Modal open={busModal} onClose={() => { setBusModal(false); busForm.reset(); }} title={editBus ? 'Editar bus' : 'Nuevo bus'}>
        <form onSubmit={busForm.handleSubmit(d => saveBus.mutate(d))} className="flex flex-col gap-4">
          <Input label="Placa patente" {...busForm.register('placa')} error={busForm.formState.errors.placa?.message} placeholder="Ej. BBCR-25" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Marca" {...busForm.register('marca')} placeholder="Ej. Mercedes-Benz" />
            <Input label="Modelo" {...busForm.register('modelo')} placeholder="Ej. O500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Año" type="number" {...busForm.register('anio')} />
            <Select label="Plantilla de asientos" {...busForm.register('seatTemplateId')} error={busForm.formState.errors.seatTemplateId?.message} placeholder="Seleccionar...">
              {templates?.map(t => <option key={t.id} value={t.id}>{t.nombre} ({t.capacidadTotal} asientos)</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setBusModal(false)}>Cancelar</Button>
            <Button size="sm" type="submit" loading={saveBus.isPending}>{editBus ? 'Guardar' : 'Agregar bus'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deactivateBus}
        onClose={() => setDeactivateBus(null)}
        onConfirm={() => deactivateBus && deactivateBusMut.mutate(deactivateBus.id)}
        title="Desactivar bus"
        message={`¿Desactivar el bus "${deactivateBus?.placa}"?`}
        confirmLabel="Desactivar"
        loading={deactivateBusMut.isPending}
      />
    </div>
  );
}
