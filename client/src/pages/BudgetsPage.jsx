import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Target, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import {
  BUDGET_PERIOD_LABELS,
  classNames,
  formatCurrency,
  getErrorMessage,
} from '../lib/utils.js';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageLoader from '../components/ui/Spinner.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import BudgetForm from '../components/budgets/BudgetForm.jsx';

const STATUS_LABELS = {
  ok: 'En curso',
  warning: 'Cerca del límite',
  exceeded: 'Excedido',
};

const STATUS_VARIANTS = {
  ok: 'success',
  warning: 'warning',
  exceeded: 'danger',
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetsResponse, statusResponse, categoriesResponse] = await Promise.all([
        api.get('/budgets', { params: { limit: 100 } }),
        api.get('/budgets/status'),
        api.get('/categories', { params: { type: 'EXPENSE' } }),
      ]);

      const statusMap = statusResponse.data.data.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});

      setBudgets(budgetsResponse.data.data);
      setStatuses(statusMap);
      setCategories(categoriesResponse.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar los presupuestos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const active = budgets.filter((budget) => budget.isActive);
    const limit = active.reduce((sum, budget) => sum + Number(budget.amountLimit), 0);
    const spent = active.reduce(
      (sum, budget) => sum + Number(statuses[budget.id]?.spent || 0),
      0,
    );
    return {
      limit,
      spent,
      percentage: limit > 0 ? Math.round((spent / limit) * 10000) / 100 : 0,
      count: active.length,
    };
  }, [budgets, statuses]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (budget) => {
    setEditing(budget);
    setFormOpen(true);
  };

  const handleDelete = async (budget) => {
    if (!window.confirm(`¿Eliminar el presupuesto de “${budget.category?.name}”?`)) return;

    try {
      await api.delete(`/budgets/${budget.id}`);
      toast.success('Presupuesto eliminado');
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar el presupuesto'));
    }
  };

  if (loading && !budgets.length) {
    return <PageLoader label="Cargando presupuestos..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Presupuestos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Controla tus límites por categoría y recibe alertas a tiempo.
          </p>
        </div>
        <Button icon={Plus} onClick={openNew}>
          Nuevo presupuesto
        </Button>
      </div>

      {budgets.length > 0 && (
        <section className="card p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Consumo global de presupuestos activos
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(totals.spent)}{' '}
                <span className="text-sm font-medium text-slate-400">
                  de {formatCurrency(totals.limit)}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">{totals.count} presupuestos activos</p>
              <p
                className={classNames(
                  'text-lg font-bold',
                  totals.percentage >= 100
                    ? 'text-red-600'
                    : totals.percentage >= 80
                      ? 'text-amber-600'
                      : 'text-brand-600',
                )}
              >
                {totals.percentage}%
              </p>
            </div>
          </div>
          <ProgressBar
            value={totals.percentage}
            status={totals.percentage >= 100 ? 'exceeded' : totals.percentage >= 80 ? 'warning' : 'ok'}
            className="mt-4"
          />
        </section>
      )}

      {budgets.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aún no tienes presupuestos"
          description="Crea un límite mensual para tus categorías de gasto y recibe alertas automáticas."
          action={<Button icon={Plus} onClick={openNew}>Crear presupuesto</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => {
            const status = statuses[budget.id];
            const spent = status?.spent || 0;
            const amountLimit = Number(budget.amountLimit);
            const percentage = status?.percentage ?? (amountLimit > 0 ? (spent / amountLimit) * 100 : 0);
            const remaining = amountLimit - spent;
            const state = status?.status || 'ok';

            return (
              <article key={budget.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                      style={{ backgroundColor: `${budget.category?.color || '#6B7280'}1a` }}
                    >
                      {budget.category?.icon || '🎯'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {budget.category?.name || 'Categoría'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {BUDGET_PERIOD_LABELS[budget.period] || budget.period}
                      </p>
                    </div>
                  </div>
                  <Badge variant={budget.isActive ? STATUS_VARIANTS[state] : 'default'}>
                    {budget.isActive ? STATUS_LABELS[state] : 'Inactivo'}
                  </Badge>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Gastado</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(spent)}</p>
                  </div>
                  <p className="text-sm text-slate-500">de {formatCurrency(amountLimit)}</p>
                </div>

                <ProgressBar
                  value={percentage}
                  status={state}
                  className="mt-3"
                />

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">
                    {Math.round(percentage * 100) / 100}% usado
                  </span>
                  <span className={remaining < 0 ? 'font-semibold text-red-600' : 'text-slate-500'}>
                    {remaining < 0
                      ? `${formatCurrency(Math.abs(remaining))} excedido`
                      : `${formatCurrency(remaining)} disponible`}
                  </span>
                </div>

                <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                  <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(budget)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDelete(budget)}
                  >
                    Eliminar
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        budget={editing}
        categories={categories}
        onSaved={load}
      />
    </div>
  );
}
