import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { gsap } from 'gsap';
import { Bus, Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});
type Form = z.infer<typeof schema>;

/* ─── Vivid Particle Canvas ─────────────────────────── */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx    = canvas.getContext('2d')!;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    type P = { x:number; y:number; r:number; vx:number; vy:number; a:number; color:string };
    const palette = ['rgba(167,139,250,', 'rgba(34,211,238,', 'rgba(244,114,182,'];

    const pts: P[] = Array.from({ length: 120 }, () => {
      const c = palette[Math.floor(Math.random() * palette.length)];
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.8 + 0.4,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        a: Math.random() * 0.6 + 0.15,
        color: c,
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d  = Math.hypot(dx, dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(167,139,250,${0.12 * (1 - d / 100)})`;
            ctx.lineWidth   = 0.7;
            ctx.stroke();
          }
        }
      }

      for (const p of pts) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0, `${p.color}${p.a})`);
        g.addColorStop(1, `${p.color}0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height)  p.vy *= -1;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

/* ─── 3D Tilt Card ───────────────────────────────────── */
function TiltCard({ children }: { children: React.ReactNode }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 350, damping: 30 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 350, damping: 30 });
  const sc = useSpring(1, { stiffness: 350, damping: 30 });

  return (
    <div style={{ perspective: '800px' }}>
      <motion.div
        style={{ rotateX: rx, rotateY: ry, scale: sc, transformStyle: 'preserve-3d' }}
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top)  / r.height - 0.5);
          sc.set(1.02);
        }}
        onMouseLeave={() => { mx.set(0); my.set(0); sc.set(1); }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ─── Field ──────────────────────────────────────────── */
function Field({
  label, error, leftIcon, rightSlot, ...rest
}: {
  label: string;
  error?: string;
  leftIcon: React.ReactNode;
  rightSlot?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const inputRef = useRef<HTMLInputElement>(null);

  const focus = () => {
    if (!inputRef.current) return;
    inputRef.current.style.borderColor = 'rgba(167,139,250,0.6)';
    inputRef.current.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.15), 0 0 20px rgba(124,58,237,0.1)';
  };
  const blur = () => {
    if (!inputRef.current) return;
    inputRef.current.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)';
    inputRef.current.style.boxShadow   = 'none';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none', display: 'flex' }}>
          {leftIcon}
        </span>
        <input
          ref={inputRef}
          onFocus={focus}
          onBlur={blur}
          style={{
            width:        '100%',
            padding:      `11px ${rightSlot ? '42px' : '14px'} 11px 40px`,
            background:   'rgba(255,255,255,0.04)',
            border:       error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            color:        '#fff',
            fontSize:     13,
            fontFamily:   'inherit',
            outline:      'none',
            transition:   'border-color 0.2s, box-shadow 0.2s',
          }}
          className="placeholder:text-white/20"
          {...rest}
        />
        {rightSlot && (
          <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
            {rightSlot}
          </span>
        )}
      </div>
      {error && <p style={{ fontSize: 11, color: '#f87171' }}>{error}</p>}
    </div>
  );
}

/* ─── Login Page ─────────────────────────────────────── */
export function LoginPage() {
  const { login, tenantCode } = useAuth();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.2 });
    if (logoRef.current) {
      tl.fromTo(logoRef.current,
        { scale: 0.3, opacity: 0, rotation: -20 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.7, ease: 'back.out(2.2)' }
      );
    }
    if (cardRef.current) {
      tl.fromTo(cardRef.current,
        { opacity: 0, y: 40, scale: 0.92 },
        { opacity: 1, y: 0,  scale: 1,    duration: 0.55, ease: 'power3.out' },
        '-=0.35'
      );
      tl.fromTo(
        cardRef.current.querySelectorAll('.f-row'),
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, stagger: 0.07, duration: 0.4, ease: 'power2.out' },
        '-=0.3'
      );
    }
  }, []);

  const onSubmit = async (data: Form) => {
    try {
      await login(data.email, data.password);
      navigate(`/t/${tenantCode}/dashboard`, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Error al iniciar sesión');
    }
  };

  return (
    <div style={{
      minHeight:   '100vh',
      display:     'flex',
      alignItems:  'center',
      justifyContent: 'center',
      padding:     20,
      position:    'relative',
      overflow:    'hidden',
      background:  'var(--base)',
    }}>
      <Particles />

      {/* Aurora blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', width: 900, height: 900, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.38) 0%, transparent 65%)',
          top: -400, left: -300,
          animation: 'aurora-1 20s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(8,145,178,0.3) 0%, transparent 65%)',
          top: -200, right: -200,
          animation: 'aurora-2 26s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(190,24,93,0.28) 0%, transparent 65%)',
          bottom: -200, right: '20%',
          animation: 'aurora-3 22s ease-in-out infinite',
        }} />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>

        {/* ── Logo ── */}
        <div ref={logoRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width:        80, height: 80,
              borderRadius: 24,
              background:   'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(8,145,178,0.2))',
              border:       '1px solid rgba(167,139,250,0.5)',
              display:      'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow:    '0 0 40px rgba(124,58,237,0.35), 0 0 80px rgba(124,58,237,0.15)',
            }}>
              <Bus size={36} color="#a78bfa" />
            </div>
            {/* Spinning glow ring */}
            <div style={{
              position:   'absolute', inset: -3,
              borderRadius: 27,
              background: 'conic-gradient(from 0deg, #7c3aed, #22d3ee, #be185d, #d97706, #7c3aed)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              padding: 2,
              animation: 'spin-slow 4s linear infinite',
              opacity: 0.8,
            }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Trans Andina
            </h1>
            <p style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(167,139,250,0.65)', marginTop: 4 }}>
              {tenantCode} · Sistema de gestión
            </p>
          </div>
        </div>

        {/* ── Card ── */}
        <div ref={cardRef} style={{ width: '100%' }}>
          <TiltCard>
            <div style={{
              padding:     28,
              borderRadius: 24,
              background:  'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              border:      '1px solid rgba(255,255,255,0.1)',
              boxShadow:   '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
              {/* Top line */}
              <div style={{
                position: 'absolute', top: 0, left: 20, right: 20, height: 1.5,
                background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.5), rgba(34,211,238,0.3), transparent)',
              }} />

              <div className="f-row" style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Iniciar sesión</h2>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Ingresa tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="f-row">
                  <Field label="Email" error={errors.email?.message} leftIcon={<Mail size={14} />}
                    type="email" autoComplete="email" placeholder="usuario@transandina.bo"
                    {...register('email')} />
                </div>

                <div className="f-row">
                  <Field label="Contraseña" error={errors.password?.message} leftIcon={<Lock size={14} />}
                    type={showPwd ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
                    rightSlot={
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 0 }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#a78bfa'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'}
                      >
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                    {...register('password')} />
                </div>

                <div className="f-row" style={{ marginTop: 4 }}>
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                    whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                    className="shimmer"
                    style={{
                      width:        '100%',
                      padding:      '12px 20px',
                      borderRadius: 12,
                      background:   isSubmitting
                        ? 'rgba(124,58,237,0.4)'
                        : 'linear-gradient(135deg, #7c3aed, #0891b2)',
                      border:       'none',
                      color:        '#fff',
                      fontSize:     14,
                      fontWeight:   700,
                      fontFamily:   'inherit',
                      cursor:       isSubmitting ? 'not-allowed' : 'pointer',
                      boxShadow:    isSubmitting ? 'none' : '0 6px 30px rgba(124,58,237,0.45)',
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                      gap:          8,
                      transition:   'box-shadow 0.2s, background 0.2s',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
                        </svg>
                        Iniciando sesión...
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Iniciar sesión
                        <ArrowRight size={14} />
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </TiltCard>
        </div>

        <p style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.2)' }}>
          Trans Andina · Bolivia · v2.0
        </p>
      </div>
    </div>
  );
}
