import { classNames } from '../../lib/utils.js';

const COLORS = {
  ok: 'bg-brand-500',
  warning: 'bg-amber-500',
  exceeded: 'bg-red-500',
};

export default function ProgressBar({ value = 0, status = 'ok', className = '' }) {
  const width = Math.min(Math.max(Number(value) || 0, 0), 100);

  return (
    <div className={classNames('h-2.5 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div
        className={classNames('h-full rounded-full transition-all duration-500', COLORS[status] || COLORS.ok)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
