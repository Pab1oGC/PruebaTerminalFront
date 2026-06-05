import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { Sidebar } from './Sidebar';

/* ─── Aurora background ──────────────────────────────
   Vivid colored orbs that bleed through glass cards.
   The key insight: glass cards only look like glass
   when there is vivid content behind them.
──────────────────────────────────────────────────── */
function Aurora() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Base gradient */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 60%), #080616',
      }} />

      {/* Orb violet - top left */}
      <div className="absolute rounded-full" style={{
        width: 900, height: 900,
        background: 'radial-gradient(circle, rgba(124,58,237,0.42) 0%, rgba(124,58,237,0.15) 35%, transparent 65%)',
        top: -350, left: -200,
        filter: 'blur(1px)',
        animation: 'aurora-1 20s ease-in-out infinite',
      }} />

      {/* Orb cyan - top right */}
      <div className="absolute rounded-full" style={{
        width: 750, height: 750,
        background: 'radial-gradient(circle, rgba(8,145,178,0.38) 0%, rgba(8,145,178,0.12) 40%, transparent 65%)',
        top: -200, right: -200,
        filter: 'blur(1px)',
        animation: 'aurora-2 26s ease-in-out infinite',
      }} />

      {/* Orb pink - bottom center */}
      <div className="absolute rounded-full" style={{
        width: 800, height: 800,
        background: 'radial-gradient(circle, rgba(190,24,93,0.32) 0%, rgba(190,24,93,0.1) 40%, transparent 65%)',
        bottom: -300, left: '30%',
        filter: 'blur(1px)',
        animation: 'aurora-3 22s ease-in-out infinite',
      }} />

      {/* Orb amber - bottom right */}
      <div className="absolute rounded-full" style={{
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(217,119,6,0.22) 0%, transparent 65%)',
        bottom: -100, right: '10%',
        filter: 'blur(2px)',
        animation: 'aurora-4 18s ease-in-out infinite',
      }} />

      {/* Fine grid */}
      <div className="absolute inset-0" style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        animation: 'grid-fade 8s ease-in-out infinite',
      }} />

      {/* Noise */}
      <div className="absolute inset-0 opacity-[0.35]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
      }} />
    </div>
  );
}

export function AppLayout() {
  const location    = useLocation();
  const mainRef     = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
    if (!mainRef.current) return;
    gsap.fromTo(mainRef.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
    );
  }, [location.pathname]);

  return (
    <div style={{ background: 'var(--base)', minHeight: '100vh' }}>
      <Aurora />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile topbar — hidden on desktop via CSS */}
      <div className="mobile-topbar">
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 8, flexShrink: 0 }}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,rgba(124,58,237,0.5),rgba(8,145,178,0.3))', border: '1px solid rgba(167,139,250,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h3l3 3v5h-6V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Trans Andina</span>
        </div>
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="layout-main" style={{ position: 'relative', zIndex: 10 }}>
        <div ref={mainRef} className="layout-inner">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
