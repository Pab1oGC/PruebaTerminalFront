import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

type Page = 'login' | 'dashboard';

function getInitialPage(): Page {
  return localStorage.getItem('token') ? 'dashboard' : 'login';
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage);

  return page === 'login'
    ? <LoginPage onLogin={() => setPage('dashboard')} />
    : <DashboardPage onLogout={() => setPage('login')} />;
}
