import { useEffect, useState } from 'react';
import api from '../lib/api';
import { User } from '../types/auth';
import './DashboardPage.css';

interface Stats {
  viajesHoy: number;
  boletosVendidos: number;
  encomiendasPendientes: number;
  flotas: number;
}

interface Props {
  onLogout: () => void;
}

const ROL_LABEL: Record<User['rol'], string> = {
  admin: 'Administrador General',
  boletero: 'Boletero',
  chofer: 'Chofer',
};

export default function DashboardPage({ onLogout }: Props) {
  const user = JSON.parse(localStorage.getItem('user') ?? '{}') as User;
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<{ stats: Stats }>('/dashboard/stats').then(res => setStats(res.data.stats));
  }, []);

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  }

  return (
    <div className="dashboard-root">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-icon">🚌</span>
          <span>Terminal Buses</span>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">Dashboard</a>
          <a href="#" className="nav-item disabled">Venta de Boletos</a>
          <a href="#" className="nav-item disabled">Habilitaciones</a>
          <a href="#" className="nav-item disabled">Flotas</a>
          <a href="#" className="nav-item disabled">Personal</a>
          <a href="#" className="nav-item disabled">Encomiendas</a>
          <a href="#" className="nav-item disabled">Caja</a>
          <a href="#" className="nav-item disabled">Reportes</a>
        </nav>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <h2>Dashboard</h2>
          <div className="topbar-user">
            <div className="user-info">
              <span className="user-name">{user.nombre}</span>
              <span className="user-role">{ROL_LABEL[user.rol] ?? user.rol}</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        </header>

        <div className="content-area">
          <div className="welcome-banner">
            <h3>Bienvenido, {user.nombre.split(' ')[0]}</h3>
            <p>Sistema de gestión de terminal de buses</p>
          </div>

          <div className="stats-grid">
            <StatCard label="Viajes hoy" value={stats?.viajesHoy ?? '—'} icon="🗓️" />
            <StatCard label="Boletos vendidos" value={stats?.boletosVendidos ?? '—'} icon="🎟️" />
            <StatCard label="Encomiendas pendientes" value={stats?.encomiendasPendientes ?? '—'} icon="📦" />
            <StatCard label="Flotas activas" value={stats?.flotas ?? '—'} icon="🚌" />
          </div>

          <div className="modules-grid">
            <ModuleCard title="Habilitaciones" description="Gestiona las salidas programadas" icon="📋" />
            <ModuleCard title="Venta de Boletos" description="Vende y reserva asientos" icon="🎟️" />
            <ModuleCard title="Flotas" description="Administra el parque vehicular" icon="🚌" />
            <ModuleCard title="Personal" description="Choferes y ayudantes" icon="👤" />
            <ModuleCard title="Encomiendas" description="Registro de paquetes y carga" icon="📦" />
            <ModuleCard title="Reportes" description="Estadísticas y análisis gerencial" icon="📊" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}

function ModuleCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="module-card">
      <div className="module-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{description}</p>
      <span className="module-badge">Próximamente</span>
    </div>
  );
}
