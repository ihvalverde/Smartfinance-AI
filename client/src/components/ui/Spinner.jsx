import { Loader2 } from 'lucide-react';
import { classNames } from '../../lib/utils.js';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={classNames('animate-spin text-brand-600', className)} />;
}

export default function PageLoader({ label = 'Cargando...' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-slate-500">
      <Spinner className="h-8 w-8" />
      <span>{label}</span>
    </div>
  );
}
