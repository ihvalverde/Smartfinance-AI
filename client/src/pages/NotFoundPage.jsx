import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Brand from '../components/Brand.jsx';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <Brand />
      <div className="mt-12 rounded-2xl bg-white p-4 text-brand-600 shadow-sm ring-1 ring-slate-200">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-900">404</h1>
      <p className="mt-3 max-w-sm text-sm text-slate-500">
        La página que buscas no existe o fue movida. Vuelve al dashboard para seguir gestionando tus
        finanzas.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
      >
        Ir al dashboard
      </Link>
    </div>
  );
}
