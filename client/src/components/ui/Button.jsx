import { Loader2 } from 'lucide-react';
import { classNames } from '../../lib/utils.js';

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500/40',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:ring-slate-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400/30 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/40',
  dark: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-slate-700/40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9',
};

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  children,
  type = 'button',
  disabled,
  ...props
}) {
  const isNative = Component === 'button';

  return (
    <Component
      {...(isNative ? { type } : {})}
      className={classNames(
        'inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={isNative ? disabled || loading : undefined}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className={size === 'icon' ? 'h-4 w-4' : 'h-4 w-4'} />
      )}
      {children}
    </Component>
  );
}
