import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  PiggyBank,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { useAuthStore } from '../stores/auth.store.js';
import {
  classNames,
  firstName,
  formatCurrency,
  formatDate,
  getErrorMessage,
} from '../lib/utils.js';
import TrendChart from '../components/charts/TrendChart.jsx';
import ExpensePieChart from '../components/charts/ExpensePieChart.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';

function SkeletonCard() {
  return <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />;
}

function ChangeBadge({ value, invert = false }) {
  if (!value) return <span className="text-xs text-slate-400">Sin variación</span>;

  const positive = value > 0;
  const good = invert ? !positive : positive;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function StatCard({ label, value, icon: Icon, tone, change, invertChange, subtitle }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    sky: 'bg-sky-50 text-sky-600',
    red: 'bg-red-50 text-red-500',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={classNames('rounded-xl p-2.5', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        {change !== undefined ? <ChangeBadge value={change} invert={invertChange} /> : null}
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, expenses, trends, recent, diagnosis] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/expenses-by-category'),
        api.get('/dashboard/trends', { params: { days: 30, months: 6 } }),
        api.get('/dashboard/recent', { params: { limit: 6 } }),
        api.get('/dashboard/diagnosis'),
      ]);

      setData({
        summary: summary.data.data,
        expenses: expenses.data.data,
        trends: trends.data.data,
        recent: recent.data.data,
        diagnosis: diagnosis.data.data,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo cargar el dashboard'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200/60" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => <SkeletonCard key={key} />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60 lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={Wallet}
        title="No pudimos cargar tu dashboard"
        description="Revisa tu conexión e intenta nuevamente."
        action={<Button onClick={load}>Reintentar</Button>}
      />
    );
  }

  const { summary, expenses, trends, recent, diagnosis } = data;
  const alerts = diagnosis.budgetAlerts || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {formatDate(new Date(), "EEEE, d 'de' MMMM 'de' yyyy")}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Hola, {firstName(user?.fullName || '')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Este es el resumen de tus finanzas de {formatDate(new Date(), 'MMMM')}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button as={Link} to="/transactions?scan=1" variant="secondary" icon={Sparkles}>
            Escanear boleta
          </Button>
          <Button as={Link} to="/transactions?new=1" icon={Plus}>
            Nueva transacción
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saldo total"
          value={formatCurrency(summary.balance)}
          icon={Wallet}
          tone="brand"
          subtitle={`${summary.accountsCount} cuentas activas`}
        />
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(summary.income)}
          icon={TrendingUp}
          tone="sky"
          change={summary.changes.income}
        />
        <StatCard
          label="Gastos del mes"
          value={formatCurrency(summary.expenses)}
          icon={TrendingDown}
          tone="red"
          change={summary.changes.expenses}
          invertChange
        />
        <StatCard
          label="Ahorro estimado"
          value={formatCurrency(summary.savings)}
          icon={PiggyBank}
          tone="amber"
          change={summary.changes.savings}
          subtitle={`${summary.savingsRate}% de tus ingresos`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Flujo de los últimos 30 días</h2>
              <p className="text-xs text-slate-500">Ingresos y gastos diarios</p>
            </div>
            <Link to="/transactions" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Ver transacciones
            </Link>
          </div>
          <div className="mt-4">
            <TrendChart data={trends.daily} />
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Gastos por categoría</h2>
              <p className="text-xs text-slate-500">Mes actual</p>
            </div>
          </div>
          <div className="mt-3">
            <ExpensePieChart categories={expenses.categories} />
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-6 text-white shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-brand-300">
            <Sparkles className="h-5 w-5" />
            <p className="text-sm font-semibold">Diagnóstico inteligente</p>
          </div>
          <Link
            to="/chat"
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-brand-200 transition hover:bg-white/10"
          >
            Hablar con la IA <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <p className="mt-4 max-w-3xl text-lg font-semibold leading-snug text-white">
          {diagnosis.message}
        </p>

        {diagnosis.insights?.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {diagnosis.insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                {insight}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Movimientos recientes</h2>
            <Link to="/transactions" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Ver todos
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Wallet}
                title="Aún no tienes movimientos"
                description="Registra tu primer ingreso o gasto para verlo aquí."
                action={<Button as={Link} to="/transactions?new=1" size="sm">Registrar movimiento</Button>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((transaction) => {
                const isIncome = transaction.type === 'INCOME';
                const isTransfer = transaction.type === 'TRANSFER';
                const direction = transaction.metadata?.transferDirection;
                const positive = isIncome || direction === 'IN';
                return (
                  <li key={transaction.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base">
                      {isTransfer ? '⇄' : transaction.category?.icon || (isIncome ? '💰' : '🧾')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {transaction.description}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDate(transaction.transactionDate, 'dd MMM')} · {transaction.account?.name}
                        {transaction.category ? ` · ${transaction.category.name}` : ''}
                      </p>
                    </div>
                    <span
                      className={classNames(
                        'text-sm font-semibold',
                        positive ? 'text-emerald-600' : 'text-slate-900',
                      )}
                    >
                      {positive ? '+' : '-'} {formatCurrency(transaction.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Presupuestos en alerta</h2>
            <Link to="/budgets" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Gestionar
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={PiggyBank}
                title="Todo bajo control"
                description="No tienes presupuestos cerca del límite este periodo."
              />
            </div>
          ) : (
            <ul className="space-y-5 p-5">
              {alerts.slice(0, 4).map((budget) => (
                <li key={budget.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {budget.category.icon} {budget.category.name}
                    </p>
                    <Badge variant={budget.status === 'exceeded' ? 'danger' : 'warning'}>
                      {budget.percentage}%
                    </Badge>
                  </div>
                  <ProgressBar value={budget.percentage} status={budget.status} className="mt-2" />
                  <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span>{formatCurrency(budget.spent)} gastados</span>
                    <span>Límite {formatCurrency(budget.amountLimit)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
