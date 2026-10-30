import { NavLink, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Sparkles,
  Tags,
  Target,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store.js';
import { classNames, initials } from '../../lib/utils.js';
import Brand from '../Brand.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { to: '/accounts', label: 'Cuentas', icon: Wallet },
  { to: '/categories', label: 'Categorías', icon: Tags },
  { to: '/budgets', label: 'Presupuestos', icon: Target },
  { to: '/chat', label: 'Chat con IA', icon: MessageSquare },
  { to: '/predictions', label: 'Predicciones', icon: TrendingUp },
];

export default function Sidebar({ open, onClose }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={classNames(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950 transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <Brand light />
          <div className="flex items-center gap-1.5">
            <ThemeToggle onDark />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-2">
          <p className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Menú principal
          </p>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                classNames(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={classNames(
                      'h-[18px] w-[18px]',
                      isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300',
                    )}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 pb-3">
          <div className="rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-500/15 to-slate-900 p-4">
            <div className="flex items-center gap-2 text-brand-300">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-semibold">IA financiera</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Registra gastos en lenguaje natural, escanea boletas y recibe proyecciones.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-300">
              {initials(user?.fullName || user?.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName || 'Usuario'}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-red-400"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
