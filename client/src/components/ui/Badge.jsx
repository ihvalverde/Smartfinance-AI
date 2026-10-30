import { classNames } from '../../lib/utils.js';

const VARIANTS = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  info: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
  dark: 'bg-slate-900 text-white',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
