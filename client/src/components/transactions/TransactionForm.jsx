import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import {
  getErrorMessage,
  getValidationDetails,
  todayISO,
} from '../../lib/utils.js';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';

const EMPTY_FORM = {
  type: 'EXPENSE',
  accountId: '',
  categoryId: '',
  amount: '',
  description: '',
  transactionDate: todayISO(),
  notes: '',
};

function flattenCategories(categories) {
  return categories.flatMap((parent) => [
    { id: parent.id, name: parent.name, type: parent.type, parentId: null },
    ...(parent.children || []).map((child) => ({
      id: child.id,
      name: `${parent.name} / ${child.name}`,
      type: child.type || parent.type,
      parentId: parent.id,
    })),
  ]);
}

export default function TransactionForm({
  open,
  onClose,
  transaction = null,
  initialData = null,
  accounts = [],
  categories = [],
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (transaction) {
      setForm({
        type: transaction.type,
        accountId: transaction.account?.id || transaction.accountId || '',
        categoryId: transaction.category?.id || transaction.categoryId || '',
        amount: String(transaction.amount ?? ''),
        description: transaction.description || '',
        transactionDate: String(transaction.transactionDate || '').slice(0, 10) || todayISO(),
        notes: transaction.notes || '',
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        accountId: accounts[0]?.id || '',
        ...(initialData || {}),
        amount: initialData?.amount !== undefined && initialData?.amount !== null
          ? String(initialData.amount)
          : '',
        transactionDate: initialData?.transactionDate || todayISO(),
        type: initialData?.type || 'EXPENSE',
      });
    }

    setErrors({});
  }, [open, transaction, initialData]);

  useEffect(() => {
    if (open && !transaction && !form.accountId && accounts[0]?.id) {
      setForm((prev) => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [accounts, open, transaction, form.accountId]);

  const availableCategories = useMemo(() => {
    const flat = flattenCategories(categories);
    return flat.filter((category) => category.type === form.type);
  }, [categories, form.type]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'type') {
      setForm((prev) => ({ ...prev, type: value, categoryId: '' }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      accountId: form.accountId,
      categoryId: form.categoryId || null,
      type: form.type,
      amount: Number(form.amount),
      description: form.description.trim(),
      transactionDate: form.transactionDate,
      notes: form.notes.trim() || null,
    };

    try {
      if (transaction) {
        await api.patch(`/transactions/${transaction.id}`, payload);
        toast.success('Transacción actualizada');
      } else {
        await api.post('/transactions', payload);
        toast.success('Transacción registrada');
      }
      await onSaved?.();
      onClose?.();
    } catch (error) {
      const details = getValidationDetails(error);
      if (details.length) {
        setErrors(details.reduce((acc, item) => ({ ...acc, [item.field]: item.message }), {}));
      }
      toast.error(getErrorMessage(error, 'No se pudo guardar la transacción'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transaction ? 'Editar transacción' : 'Nueva transacción'}
      description="Registra un ingreso o gasto y ajustaremos el saldo de tu cuenta."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="transaction-form" loading={saving}>
            {transaction ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </>
      }
    >
      {!accounts.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Primero crea una cuenta para poder registrar transacciones.
        </div>
      ) : (
        <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleChange({ target: { name: 'type', value: 'EXPENSE' } })}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                form.type === 'EXPENSE'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => handleChange({ target: { name: 'type', value: 'INCOME' } })}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                form.type === 'INCOME'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Ingreso
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Monto (S/)"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={handleChange}
              error={errors.amount}
              required
            />
            <Input
              label="Fecha"
              name="transactionDate"
              type="date"
              value={form.transactionDate}
              onChange={handleChange}
              error={errors.transactionDate}
              required
            />
          </div>

          <Input
            label="Descripción"
            name="description"
            placeholder="Ej. Almuerzo en el centro"
            value={form.description}
            onChange={handleChange}
            error={errors.description}
            maxLength={255}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Cuenta"
              name="accountId"
              value={form.accountId}
              onChange={handleChange}
              error={errors.accountId}
              required
            >
              <option value="">Selecciona una cuenta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>

            <Select
              label="Categoría"
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              error={errors.categoryId}
            >
              <option value="">Sin categoría</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            label="Notas (opcional)"
            name="notes"
            placeholder="Detalles adicionales..."
            value={form.notes}
            onChange={handleChange}
            maxLength={1000}
          />
        </form>
      )}
    </Modal>
  );
}
