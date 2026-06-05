import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { ShieldCheck, Plus, LogOut, Building, Users, Calendar, CheckCircle, XCircle, Archive, Power } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';

interface Tenant {
  id: number; codigo: string; nombre: string; emailContacto: string;
  telefonoContacto?: string; estado: 'Active' | 'Suspended' | 'Archived';
  createdAt: string; notasAdmin?: string;
  _count: { users: number; schedules: number; tickets: number };
}

const estadoColor = { Active: 'green', Suspended: 'yellow', Archived: 'slate' } as const;
const estadoLabel = { Active: 'Activo', Suspended: 'Suspendido', Archived: 'Archivado' };

const createSchema = z.object({
  codigo: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  nombre: z.string().min(1).max(128),
  emailContacto: z.string().email('Email inválido'),
  telefonoContacto: z.string().max(20).optional().or(z.literal('')),
  branchNombre: z.string().min(1).max(128).default('Casa Matriz'),
  branchCiudad: z.string().min(1).max(128),
  adminNombre: z.string().min(1).max(128),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z.string().min(8, 'Mínimo 8 caracteres'),
});
type CreateForm = z.infer<typeof createSchema>;

function adminApi() {
  const token = localStorage.getItem('admin_token');
  return axios.create({ headers: { Authorization: `Bearer ${token}` } });
}

export function AdminTenantsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [statusModal, setStatusModal] = useState(false);
  const adminUser = JSON.parse(localStorage.getItem('admin_user') ?? '{}');

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) navigate('/admin/login', { replace: true });
  }, [navigate]);

  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ['admin-tenants'],
    queryFn: () => adminApi().get('/api/admin/tenants').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => adminApi().post('/api/admin/tenants', { ...d, telefonoContacto: d.telefonoContacto || undefined }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); toast.success('Empresa creada'); setCreateModal(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const estadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) => adminApi().patch(`/api/admin/tenants/${id}/estado`, { estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); toast.success('Estado actualizado'); setStatusModal(false); setSelectedTenant(null); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'),
  });

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080616', color: '#fff' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ padding: 10, borderRadius: 12, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa', display: 'flex' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Panel de Administración</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Plataforma Terminal de Buses</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{adminUser?.nombre}</span>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', fontSize: 12, borderRadius: 9, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 28px' }}>
        {/* Stats rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <div style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, backdropFilter: 'blur(18px)', padding: '16px 20px' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Total empresas</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#fff' }}>{tenants?.length ?? '—'}</p>
          </div>
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 14, backdropFilter: 'blur(18px)', padding: '16px 20px' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Activas</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#6ee7b7' }}>{tenants?.filter(t => t.estado === 'Active').length ?? '—'}</p>
          </div>
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 14, backdropFilter: 'blur(18px)', padding: '16px 20px' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Suspendidas</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#fcd34d' }}>{tenants?.filter(t => t.estado === 'Suspended').length ?? '—'}</p>
          </div>
        </div>

        {/* Tabla tenants */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Empresas registradas</h2>
          <Button icon={<Plus size={16} />} onClick={() => { reset(); setCreateModal(true); }}>Nueva empresa</Button>
        </div>

        {isLoading && <Spinner fullPage />}
        {!isLoading && tenants?.length === 0 && <EmptyState title="Sin empresas" description="Crea la primera empresa" />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tenants?.map((tenant, i) => (
            <motion.div
              key={tenant.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, backdropFilter: 'blur(18px)', padding: '18px 22px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Badge color={estadoColor[tenant.estado]}>{estadoLabel[tenant.estado]}</Badge>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{tenant.codigo}</span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{tenant.nombre}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{tenant.emailContacto}{tenant.telefonoContacto && ` · ${tenant.telefonoContacto}`}</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={12} />{tenant._count.users} usuarios</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={12} />{tenant._count.schedules} habilitaciones</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Building size={12} />{tenant._count.tickets} boletos</span>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>Creado: {new Date(tenant.createdAt).toLocaleDateString('es-BO')}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  {tenant.estado === 'Active' && (
                    <button
                      onClick={() => { setSelectedTenant(tenant); setStatusModal(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, borderRadius: 9, background: 'rgba(245,158,11,0.1)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.22)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                    >
                      <XCircle size={13} /> Suspender
                    </button>
                  )}
                  {tenant.estado === 'Suspended' && (
                    <>
                      <button
                        onClick={() => estadoMutation.mutate({ id: tenant.id, estado: 'Active' })}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, borderRadius: 9, background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.22)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                      >
                        <Power size={13} /> Reactivar
                      </button>
                      <button
                        onClick={() => estadoMutation.mutate({ id: tenant.id, estado: 'Archived' })}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, borderRadius: 9, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                      >
                        <Archive size={13} /> Archivar
                      </button>
                    </>
                  )}
                  {tenant.estado === 'Archived' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}><CheckCircle size={13} /> Archivada</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal crear empresa */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nueva empresa" size="xl">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="flex flex-col gap-4">
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Datos de la empresa</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Código (URL slug)" {...register('codigo')} error={errors.codigo?.message} placeholder="mi-empresa" />
            <Input label="Nombre de la empresa" {...register('nombre')} error={errors.nombre?.message} />
            <Input label="Email de contacto" type="email" {...register('emailContacto')} error={errors.emailContacto?.message} />
            <Input label="Teléfono (opcional)" {...register('telefonoContacto')} />
          </div>

          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 8 }}>Sucursal inicial</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre de sucursal" {...register('branchNombre')} error={errors.branchNombre?.message} placeholder="Casa Matriz" />
            <Input label="Ciudad" {...register('branchCiudad')} error={errors.branchCiudad?.message} />
          </div>

          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 8 }}>Administrador inicial</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" {...register('adminNombre')} error={errors.adminNombre?.message} />
            <Input label="Email" type="email" {...register('adminEmail')} error={errors.adminEmail?.message} />
            <Input label="Contraseña" type="password" {...register('adminPassword')} error={errors.adminPassword?.message} className="col-span-2" />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={() => setCreateModal(false)}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>Crear empresa</Button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmar suspensión */}
      <Modal open={statusModal} onClose={() => setStatusModal(false)} title="Suspender empresa" size="sm">
        <p style={{ color: 'var(--text-2)', marginBottom: 20, fontSize: 14 }}>¿Suspender <strong>{selectedTenant?.nombre}</strong>? Los usuarios no podrán acceder.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setStatusModal(false)}>Cancelar</Button>
          <Button variant="danger" loading={estadoMutation.isPending} onClick={() => selectedTenant && estadoMutation.mutate({ id: selectedTenant.id, estado: 'Suspended' })}>Suspender</Button>
        </div>
      </Modal>
    </div>
  );
}
