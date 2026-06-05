import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { BranchesPage } from './pages/BranchesPage';
import { RutasPage } from './pages/RutasPage';
import { FleetPage } from './pages/FleetPage';
import { PersonnelPage } from './pages/PersonnelPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { TicketsPage } from './pages/TicketsPage';
import { ParcelsPage } from './pages/ParcelsPage';
import { CashPage } from './pages/CashPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminTenantsPage } from './pages/admin/AdminTenantsPage';
import { Spinner } from './components/ui/Spinner';

function TenantRoutes() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  if (!tenantCode) return <Navigate to="/" replace />;
  return (
    <AuthProvider tenantCode={tenantCode}>
      <TenantApp tenantCode={tenantCode} />
    </AuthProvider>
  );
}

function TenantApp({ tenantCode }: { tenantCode: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to={`/t/${tenantCode}/login`} replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={`/t/${tenantCode}/dashboard`} replace />} />
        <Route path="dashboard"  element={<DashboardPage />} />
        <Route path="branches"   element={<BranchesPage />} />
        <Route path="rutas"      element={<RutasPage />} />
        <Route path="fleet"      element={<FleetPage />} />
        <Route path="personnel"  element={<PersonnelPage />} />
        <Route path="schedules"  element={<SchedulesPage />} />
        <Route path="tickets"    element={<TicketsPage />} />
        <Route path="parcels"    element={<ParcelsPage />} />
        <Route path="cash"       element={<CashPage />} />
        <Route path="reports"    element={<ReportsPage />} />
        <Route path="*"          element={<Navigate to={`/t/${tenantCode}/dashboard`} replace />} />
      </Route>
    </Routes>
  );
}

function Root() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Terminal de Buses</h1>
        <p className="text-slate-500 mb-4">Accede a través de la URL de tu empresa</p>
        <code className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-sm text-blue-400">
          /t/nombre-empresa/login
        </code>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/t/:tenantCode/*" element={<TenantRoutes />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/tenants" element={<AdminTenantsPage />} />
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
