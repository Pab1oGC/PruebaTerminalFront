import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { gsap } from 'gsap';
import { ShieldCheck, User, Lock, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const schema = z.object({
  username: z.string().min(1, 'Requerido'),
  password: z.string().min(1, 'Requerido'),
});
type FormData = z.infer<typeof schema>;

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (localStorage.getItem('admin_token')) navigate('/admin/tenants', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(Array.from(containerRef.current.children), { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.5, ease: 'power3.out', delay: 0.1 });
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await axios.post('/api/admin/auth/login', data);
      localStorage.setItem('admin_token', res.data.token);
      localStorage.setItem('admin_user', JSON.stringify(res.data.admin));
      navigate('/admin/tenants', { replace: true });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#7c3aed22_0%,_transparent_60%)]" />
      <div className="relative w-full max-w-sm">
        <div ref={containerRef} className="flex flex-col">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 rounded-2xl bg-purple-600/10 border border-purple-500/20 mb-4">
              <ShieldCheck size={32} className="text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Panel de Administración</h1>
            <p className="text-sm text-slate-500 mt-1">Acceso de plataforma</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, backdropFilter: 'blur(24px)', padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Usuario</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    {...register('username')}
                    autoComplete="username"
                    placeholder="superadmin"
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${errors.username ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600'}`}
                  />
                </div>
                {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Contraseña</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    {...register('password')}
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-9 py-2 text-sm rounded-lg border bg-slate-950 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${errors.password ? 'border-red-500/60' : 'border-slate-700 hover:border-slate-600'}`}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-1 w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {isSubmitting ? 'Iniciando sesión...' : 'Acceder al panel'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
