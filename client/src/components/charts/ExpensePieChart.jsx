import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../lib/utils.js';

const FALLBACK_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#14b8a6', '#ec4899'];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
        {item.icon} {item.name}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {formatCurrency(item.total)} · {item.percentage}%
      </p>
    </div>
  );
}

export default function ExpensePieChart({ categories = [] }) {
  const total = categories.reduce((sum, item) => sum + Number(item.total || 0), 0);

  if (!categories.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-400">
        Sin gastos registrados este mes
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categories}
              dataKey="total"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              strokeWidth={0}
            >
              {categories.map((entry, index) => (
                <Cell
                  key={entry.categoryId || entry.name}
                  fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total</span>
          <span className="text-lg font-bold text-slate-900">{formatCurrency(total)}</span>
        </div>
      </div>

      <ul className="space-y-2">
        {categories.slice(0, 5).map((item, index) => (
          <li key={item.categoryId || item.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length] }}
            />
            <span className="flex-1 truncate text-slate-600">{item.name}</span>
            <span className="font-semibold text-slate-900">{formatCurrency(item.total)}</span>
            <span className="w-10 text-right text-slate-400">{item.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
