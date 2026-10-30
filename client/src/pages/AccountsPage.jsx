import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Landmark,
  LineChart,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import {
  ACCOUNT_TYPE_LABELS,
  classNames,
  formatCurrency,
  getErrorMessage,
} from '../lib/utils.js';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageLoader from '../components/ui/Spinner.jsx';
import AccountForm from '../components/accounts/AccountForm.jsx';
import TransferForm from '../components/transactions/TransferForm.jsx';

const ICONS = {
  wallet: Wallet,
  landmark: Landmark,
  'credit-card': CreditCard,
  banknote: Banknote,
  'piggy-bank': PiggyBank,
  'line-chart': LineChart,
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accountsResponse, summaryResponse] = await Promise.all([
        api.get('/accounts'),
        api.get('/accounts/summary'),
      ]);
      setAccounts(accountsResponse.data.data);
      setSummary(summaryResponse.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar las cuentas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (account) => {
    setEditing(account);
    setFormOpen(true);
  };

  const handleDelete = async (account) => {
    if (!window.confirm(`¿Eliminar o desactivar la cuenta “${account.name}”?`)) return;

    try {
      const response = await api.delete(`/accounts/${account.id}`);
      const result = response.data.data;
      toast.success(
        result.deleted
          ? 'Cuenta eliminada'
          : 'Cuenta desactivada porque tiene movimientos asociados',
      );
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la cuenta'));
    }
  };

  if (loading && !accounts.length) {
    return <PageLoader label="Cargando cuentas..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cuentas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra tus cuentas y consulta el saldo consolidado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={ArrowLeftRight} onClick={() => setTransferOpen(true)}>
            Transferir
          </Button>
          <Button icon={Plus} onClick={openNew}>
            Nueva cuenta
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-6 text-white shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Saldo consolidado
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {formatCurrency(summary?.totalBalance || 0)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {summary?.accountsCount || 0} cuentas activas
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(summary?.byType || {}).map(([type, value]) => (
              <div
                key={type}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur"
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {ACCOUNT_TYPE_LABELS[type] || type}
                </p>
                <p className="text-sm font-semibold text-white">{formatCurrency(value.balance)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Aún no tienes cuentas"
          description="Crea tu primera cuenta para empezar a registrar ingresos, gastos y transferencias."
          action={<Button icon={Plus} onClick={openNew}>Crear cuenta</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => {
            const Icon = ICONS[account.icon] || Wallet;
            const negative = Number(account.balance) < 0;

            return (
              <article
                key={account.id}
                className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-soft"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: account.color || '#3B82F6' }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: account.color || '#3B82F6' }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                      <p className="text-xs text-slate-500">
                        {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">{account.currency}</Badge>
                </div>

                <div className="mt-5">
                  <p className="text-xs text-slate-500">Saldo disponible</p>
                  <p
                    className={classNames(
                      'mt-0.5 text-2xl font-bold tracking-tight',
                      negative ? 'text-red-600' : 'text-slate-900',
                    )}
                  >
                    {formatCurrency(account.balance)}
                  </p>
                </div>

                <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                  <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(account)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleDelete(account)}
                  >
                    Eliminar
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AccountForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        account={editing}
        onSaved={load}
      />

      <TransferForm
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        accounts={accounts}
        onSaved={load}
      />
    </div>
  );
}
