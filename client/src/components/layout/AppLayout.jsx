import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import Brand from '../Brand.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="sticky top-0 z-50 flex w-full items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 sm:px-6 backdrop-blur transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Brand compact className="shrink-0" />
        <ThemeToggle className="!h-10 !w-10 !border-0 !bg-transparent hover:!bg-slate-100 dark:hover:!bg-slate-800" />
      </header>

      <div className="lg:pl-72">
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
