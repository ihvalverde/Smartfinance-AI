import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RefreshCw, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonth,
  getErrorMessage,
} from '../lib/utils.js';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageLoader from '../components/ui/Spinner.jsx';

const FALLBACK_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6'];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-slate-500">{label}</p>
      {payload.filter((item) => item.value !== null).map((item) => (
        <div key={item.dataKey} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-slate-500">{item.name}:</span>
          <span className="font-semibold text-slate-900">{formatCurrency(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function confidenceLabel(value) {
  if (value >= 0.7) return { label: 'Confianza alta', variant: 'success' };
  if (value >= 0.45) return { label: 'Confianza media', variant: 'warning' };
  return { label: 'Confianza baja', variant: 'danger' };
}

export default function PredictionsPage() {
  const [prediction, setPrediction] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [predictionResponse, statusResponse] = await Promise.all([
        api.get('/ai/predictions'),
        api.get('/ai/status'),
      ]);
      setPrediction(predictionResponse.data.data);
      setAiStatus(statusResponse.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo generar la predicción'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !prediction) {
    return <PageLoader label="Analizando tus gastos..." />;
  }

  if (!prediction) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No pudimos generar la predicción"
        description="Intenta nuevamente en unos minutos."
        action={<Button onClick={() => load()}>Reintentar</Button>}
      />
    );
  }

  const confidence = confidenceLabel(prediction.confidence);
  const chartData = [
    ...prediction.history.map((item) => ({
      name: formatMonth(item.month),
      real: item.total,
      projected: null,
    })),
    {
      name: formatMonth(prediction.nextMonth),
      real: null,
      projected: prediction.predictedTotal,
    },
  ];

  const hasData = prediction.predictedTotal > 0 || prediction.byCategory.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Predicciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            Proyección de gastos basada en tu historial real de los últimos meses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={aiStatus?.provider === 'gemini' ? 'brand' : 'default'}>
            {aiStatus?.provider === 'gemini'
              ? `IA · ${aiStatus.model || 'Gemini'}`
              : 'Modo local'}
          </Badge>
          <Button
            variant="secondary"
            icon={RefreshCw}
            loading={refreshing}
            onClick={() => load(true)}
          >
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-6 text-white shadow-soft lg:col-span-2">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-brand-300">
              <TrendingUp className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-widest">
                Gasto proyectado · {prediction.nextMonthLabel}
              </p>
            </div>
            <p className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              {formatCurrency(prediction.predictedTotal)}
            </p>
            <p className="mt-2 max-w-lg text-sm text-slate-400">
              Calculado con un {prediction.method === 'promedio_ponderado_movil'
                ? 'promedio ponderado móvil'
                : prediction.method}
              {' '}de tus últimos {prediction.history.length} meses.
            </p>

            <div className="mt-6 max-w-sm">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Confianza del modelo</span>
                <span className="font-semibold text-white">
                  {Math.round(prediction.confidence * 100)}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-brand-400 transition-all"
                  style={{ width: `${Math.min(prediction.confidence * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Lectura rápida</p>
            <Badge variant={confidence.variant}>{confidence.label}</Badge>
          </div>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Promedio mensual histórico</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(
                  prediction.history.reduce((sum, item) => sum + item.total, 0)
                    / Math.max(prediction.history.length, 1),
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Categorías analizadas</span>
              <span className="font-semibold text-slate-900">{prediction.byCategory.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Próximo mes</span>
              <span className="font-semibold text-slate-900">{prediction.nextMonthLabel}</span>
            </div>
          </div>

          <p className="mt-5 rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-500">
            La confianza sube cuando registras gastos de forma constante. Con menos de 3 meses de
            historial, toma la proyección como una referencia.
          </p>
        </section>
      </div>

      {!hasData ? (
        <EmptyState
          icon={Wallet}
          title="Necesitamos más datos"
          description="Registra algunos gastos durante este mes para generar una proyección confiable."
          action={<Button as={Link} to="/transactions?new=1">Registrar gasto</Button>}
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="card p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Historial y proyección</h2>
                  <p className="text-xs text-slate-500">Gasto total por mes (S/)</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Real
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" /> Proyectado
                  </span>
                </div>
              </div>

              <div className="mt-4 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCompactCurrency(value)}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={64}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="real" name="Real" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={44} />
                    <Bar
                      dataKey="projected"
                      name="Proyectado"
                      fill="#818cf8"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card p-5">
              <h2 className="text-base font-semibold text-slate-900">Por categoría</h2>
              <p className="text-xs text-slate-500">Proyección para {prediction.nextMonthLabel}</p>

              <ul className="mt-4 space-y-4">
                {prediction.byCategory.slice(0, 6).map((category, index) => (
                  <li key={category.categoryId || category.name}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {category.icon} {category.name}
                      </p>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(category.predicted)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(category.percentage, 100)}%`,
                            backgroundColor: category.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-slate-400">
                        {category.percentage}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6">
            <div className="flex items-center gap-2 text-brand-700">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-sm font-semibold">Recomendación de la IA</h2>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {prediction.advice}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
