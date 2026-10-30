import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  ChevronLeft,
  Eye,
  ChevronRight,
  Pencil,
  Plus,
  ScanLine,
  Search,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import {
  TRANSACTION_TYPE_LABELS,
  classNames,
  formatCurrency,
  formatDate,
  getErrorMessage,
} from '../lib/utils.js';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageLoader from '../components/ui/Spinner.jsx';
import Modal from '../components/ui/Modal.jsx';
import TransactionForm from '../components/transactions/TransactionForm.jsx';
import TransferForm from '../components/transactions/TransferForm.jsx';
import AiQuickAdd from '../components/transactions/AiQuickAdd.jsx';
import ReceiptScanner from '../components/transactions/ReceiptScanner.jsx';

const PAGE_SIZE = 10;

function TypeBadge({ type }) {
  const variant = type === 'INCOME' ? 'success' : type === 'TRANSFER' ? 'info' : 'danger';
  return <Badge variant={variant}>{TRANSACTION_TYPE_LABELS[type] || type}</Badge>;
}

function amountPrefix(transaction) {
  if (transaction.type === 'INCOME') return '+';
  if (transaction.type === 'TRANSFER') {
    return transaction.metadata?.transferDirection === 'IN' ? '+' : '-';
  }
  return '-';
}

function isPositive(transaction) {
  return transaction.type === 'INCOME'
    || (transaction.type === 'TRANSFER' && transaction.metadata?.transferDirection === 'IN');
}

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);

  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [page, setPage] = useState(1);

  const [showAi, setShowAi] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const [accountsResponse, categoriesResponse] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
      ]);
      setAccounts(accountsResponse.data.data);
      setCategories(categoriesResponse.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar cuentas y categorías'));
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/transactions', {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(appliedSearch ? { search: appliedSearch } : {}),
          ...(typeFilter ? { type: typeFilter } : {}),
          ...(accountFilter ? { accountId: accountFilter } : {}),
        },
      });
      setTransactions(response.data.data);
      setMeta(response.data.meta);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar las transacciones'));
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, typeFilter, accountFilter]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, accountFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null);
      setInitialData(null);
      setFormOpen(true);
    }
    if (searchParams.get('scan') === '1') {
      setScanOpen(true);
    }
    if (searchParams.toString()) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  const openNew = () => {
    setEditing(null);
    setInitialData(null);
    setFormOpen(true);
  };

  const openEdit = (transaction) => {
    setEditing(transaction);
    setInitialData(null);
    setFormOpen(true);
  };

  const handleDelete = async (transaction) => {
    const message = transaction.type === 'TRANSFER'
      ? 'Esta transferencia tiene dos movimientos asociados. ¿Eliminar ambos?'
      : '¿Eliminar esta transacción? El saldo de la cuenta se ajustará.';

    if (!window.confirm(message)) return;

    try {
      await api.delete(`/transactions/${transaction.id}`);
      toast.success('Transacción eliminada');
      loadTransactions();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la transacción'));
    }
  };

  const handleAiSuggestion = (data) => {
    setEditing(null);
    setInitialData(data);
    setFormOpen(true);
  };

  const resetFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    setTypeFilter('');
    setAccountFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transacciones</h1>
          <p className="mt-1 text-sm text-slate-500">
            {meta.total} movimiento{meta.total === 1 ? '' : 's'} registrado{meta.total === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={Sparkles}
            onClick={() => setShowAi((value) => !value)}
          >
            {showAi ? 'Ocultar IA' : 'Registro con IA'}
          </Button>
          <Button variant="secondary" icon={ArrowLeftRight} onClick={() => setTransferOpen(true)}>
            Transferir
          </Button>
          <Button variant="secondary" icon={ScanLine} onClick={() => setScanOpen(true)}>
            Boleta
          </Button>
          <Button icon={Plus} onClick={openNew}>
            Nueva
          </Button>
        </div>
      </div>

      {showAi && <AiQuickAdd onUseSuggestion={handleAiSuggestion} />}

      <div className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_170px_200px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Buscar por descripción..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <select
            className="input"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="INCOME">Ingresos</option>
            <option value="EXPENSE">Gastos</option>
            <option value="TRANSFER">Transferencias</option>
          </select>

          <select
            className="input"
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value)}
          >
            <option value="">Todas las cuentas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <Button variant="ghost" onClick={resetFilters}>
            Limpiar
          </Button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && !transactions.length ? (
          <PageLoader label="Cargando transacciones..." />
        ) : transactions.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Wallet}
              title="No encontramos transacciones"
              description="Prueba cambiando los filtros o registra tu primer movimiento."
              action={<Button icon={Plus} onClick={openNew}>Nueva transacción</Button>}
            />
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Fecha</th>
                    <th className="px-5 py-3 font-semibold">Descripción</th>
                    <th className="px-5 py-3 font-semibold">Categoría</th>
                    <th className="px-5 py-3 font-semibold">Cuenta</th>
                    <th className="px-5 py-3 font-semibold">Tipo</th>
                    <th className="px-5 py-3 text-right font-semibold">Monto</th>
                    <th className="px-5 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="transition hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                        {formatDate(transaction.transactionDate, 'dd MMM yyyy')}
                      </td>
                      <td className="max-w-[260px] px-5 py-3.5">
                        <p className="truncate font-medium text-slate-900">{transaction.description}</p>
                        {transaction.notes && (
                          <p className="truncate text-xs text-slate-400">{transaction.notes}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {transaction.category
                          ? `${transaction.category.icon} ${transaction.category.name}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{transaction.account?.name}</td>
                      <td className="px-5 py-3.5"><TypeBadge type={transaction.type} /></td>
                      <td
                        className={classNames(
                          'whitespace-nowrap px-5 py-3.5 text-right font-semibold',
                          isPositive(transaction) ? 'text-emerald-600' : 'text-slate-900',
                        )}
                      >
                        {amountPrefix(transaction)} {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewing(transaction)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title="Ver detalle"
                            aria-label="Ver detalle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(transaction)}
                            disabled={transaction.type === 'TRANSFER'}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(transaction)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {transactions.map((transaction) => (
                <li key={transaction.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {transaction.description}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(transaction.transactionDate, 'dd MMM')} · {transaction.account?.name}
                      </p>
                      {transaction.notes && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">{transaction.notes}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <TypeBadge type={transaction.type} />
                        {transaction.category && (
                          <span className="text-xs text-slate-500">
                            {transaction.category.icon} {transaction.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={classNames(
                          'whitespace-nowrap text-sm font-bold',
                          isPositive(transaction) ? 'text-emerald-600' : 'text-slate-900',
                        )}
                      >
                        {amountPrefix(transaction)} {formatCurrency(transaction.amount)}
                      </p>
                      <div className="mt-2 flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(transaction)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                          aria-label="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(transaction)}
                          disabled={transaction.type === 'TRANSFER'}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(transaction)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-500">
              Página {meta.page} de {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={ChevronLeft}
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <TransactionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setInitialData(null);
        }}
        transaction={editing}
        initialData={initialData}
        accounts={accounts}
        categories={categories}
        onSaved={loadTransactions}
      />

      <TransferForm
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        accounts={accounts}
        onSaved={() => {
          loadTransactions();
          loadMeta();
        }}
      />

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Detalle de transacción"
        description={viewing?.description}
        footer={
          <>
            <Button variant="secondary" onClick={() => setViewing(null)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setViewing(null);
                openEdit(viewing);
              }}
              disabled={viewing?.type === 'TRANSFER'}
            >
              Editar
            </Button>
          </>
        }
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={viewing.type} />
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {amountPrefix(viewing)} {formatCurrency(viewing.amount)}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fecha</p>
                <p className="mt-1 text-sm text-slate-900">{formatDate(viewing.transactionDate, 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cuenta</p>
                <p className="mt-1 text-sm text-slate-900">{viewing.account?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Categoria</p>
                <p className="mt-1 text-sm text-slate-900">
                  {viewing.category ? `${viewing.category.icon} ${viewing.category.name}` : 'Sin categoria'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Moneda</p>
                <p className="mt-1 text-sm text-slate-900">{viewing.currency || 'PEN'}</p>
              </div>
            </div>

            {viewing.type === 'TRANSFER' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {viewing.metadata?.transferDirection === 'IN' ? 'Recibido desde' : 'Enviado a'}{' '}
                <span className="font-semibold">{viewing.metadata?.counterpartAccountName || 'cuenta vinculada'}</span>
              </div>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Notas</p>
              <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">
                {viewing.notes || 'Sin notas'}
              </div>
            </div>

            {viewing.isRecurring && (
              <p className="text-xs text-slate-500">
                Recurrente: {viewing.recurringPattern || 'sin patron definido'}
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        title="Escanear boleta con IA"
        description="La IA extraerá el comercio, total y categoría. Revisa antes de guardar."
      >
        <ReceiptScanner
          onUseSuggestion={(data) => {
            setScanOpen(false);
            handleAiSuggestion(data);
          }}
        />
      </Modal>

      {metaLoading && !accounts.length && <span className="sr-only">Cargando cuentas</span>}
    </div>
  );
}
