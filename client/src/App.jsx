import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from './stores/auth.store.js';
import { ProtectedRoute, PublicOnly } from './components/layout/ProtectedRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import AccountsPage from './pages/AccountsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import PredictionsPage from './pages/PredictionsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const handleLogout = () => {
      clearSession();
      toast.error('Tu sesión expiró. Inicia sesión nuevamente.');
      navigate('/login', { replace: true });
    };

    window.addEventListener('sf:logout', handleLogout);
    return () => window.removeEventListener('sf:logout', handleLogout);
  }, [clearSession, navigate]);

  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/predictions" element={<PredictionsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
