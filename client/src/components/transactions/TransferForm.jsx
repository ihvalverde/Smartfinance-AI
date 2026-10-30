import { useEffect, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { getErrorMessage, todayISO } from '../../lib/utils.js';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';

const EMPTY_FORM = {
  fromAccountId: '',
  toAccountId: '',
  amount: '',
  description: '',
  transactionDate: todayISO(),
  notes: '',
};

export default function TransferForm({ open, onClose, accounts = [], onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY_FORM,
      fromAccountId: accounts[0]?.id || '',
      toAccountId: accounts[1]?.id || '',
      transactionDate: todayISO(),
    });
  }, [open]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.fromAccountId === form.toAccountId) {
      toast.error('Las cuentas de origen y destino deben ser diferentes');
      return;
    }

    setSaving(true);
    try {
      await api.post('/transactions/transfer', {
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        amount: Number(form.amount),
        description: form.description.trim() || undefined,
        transactionDate: form.transactionDate,
        notes: form.notes.trim() || null,
      });
      toast.success('Transferencia realizada');
      await onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo realizar la transferencia'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transferir entre cuentas"
      description="Mueve dinero entre tus cuentas sin afectar tus ingresos o gastos."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="transfer-form" loading={saving} icon={ArrowRightLeft}>
            Transferir
          </Button>
        </>
      }
    >
      {accounts.length < 2 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Necesitas al menos dos cuentas activas para transferir.
        </div>
      ) : (
        <form id="transfer-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Desde"
              name="fromAccountId"
              value={form.fromAccountId}
              onChange={handleChange}
              required
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>

            <Select
              label="Hacia"
              name="toAccountId"
              value={form.toAccountId}
              onChange={handleChange}
              required
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
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
              required
            />
            <Input
              label="Fecha"
              name="transactionDate"
              type="date"
              value={form.transactionDate}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label="Descripción (opcional)"
            name="description"
            placeholder="Ej. Pago de tarjeta"
            value={form.description}
            onChange={handleChange}
            maxLength={255}
          />

          <Textarea
            label="Notas (opcional)"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            maxLength={1000}
          />
        </form>
      )}
    </Modal>
  );
}
