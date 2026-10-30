import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store.js';
import { Spinner } from '../ui/Spinner.jsx';
import Brand from '../Brand.jsx';

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50">
      <Brand />
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function ProtectedRoute() {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PublicOnly() {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
