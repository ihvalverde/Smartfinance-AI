import { classNames } from '../../lib/utils.js';

export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div
      className={classNames(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-2xl bg-white p-3 text-slate-400 shadow-sm ring-1 ring-slate-200">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
