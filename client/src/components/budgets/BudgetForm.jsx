import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { BUDGET_PERIODS, getErrorMessage } from '../../lib/utils.js';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';

const EMPTY_FORM = {
  categoryId: '',
  amountLimit: '',
  period: 'MONTHLY',
  alertThreshold: '0.8',
  startDate: '',
};

const THRESHOLD_OPTIONS = [
  { value: '0.5', label: '50% del límite' },
  { value: '0.7', label: '70% del límite' },
  { value: '0.8', label: '80% del límite (recomendado)' },
  { value: '0.9', label: '90% del límite' },
];

export default function BudgetForm({ open, onClose, budget = null, categories = [], onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (budget) {
      setForm({
        categoryId: budget.category?.id || budget.categoryId || '',
        amountLimit: String(budget.amountLimit ?? ''),
        period: budget.period,
        alertThreshold: String(budget.alertThreshold ?? 0.8),
        startDate: String(budget.startDate || '').slice(0, 10),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, budget]);

  const categoryOptions = useMemo(
    () => categories.flatMap((parent) => [
      { id: parent.id, label: `${parent.icon} ${parent.name}` },
      ...(parent.children || []).map((child) => ({
        id: child.id,
        label: `${parent.icon} ${parent.name} / ${child.name}`,
      })),
    ]),
    [categories],
  );

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      categoryId: form.categoryId,
      amountLimit: Number(form.amountLimit),
      period: form.period,
      alertThreshold: Number(form.alertThreshold),
      ...(form.startDate ? { startDate: form.startDate } : {}),
    };

    try {
      if (budget) {
        await api.patch(`/budgets/${budget.id}`, payload);
        toast.success('Presupuesto actualizado');
      } else {
        await api.post('/budgets', payload);
        toast.success('Presupuesto creado');
      }
      await onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar el presupuesto'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={budget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      description="Define un límite por categoría y recibe alertas antes de excederlo."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="budget-form" loading={saving}>
            {budget ? 'Guardar cambios' : 'Crear presupuesto'}
          </Button>
        </>
      }
    >
      <form id="budget-form" onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Categoría de gasto"
          name="categoryId"
          value={form.categoryId}
          onChange={handleChange}
          required
        >
          <option value="">Selecciona una categoría</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </Select>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Límite (S/)"
            name="amountLimit"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.amountLimit}
            onChange={handleChange}
            required
          />

          <Select label="Periodo" name="period" value={form.period} onChange={handleChange}>
            {BUDGET_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Alerta"
            name="alertThreshold"
            value={form.alertThreshold}
            onChange={handleChange}
          >
            {THRESHOLD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Input
            label="Fecha de inicio (opcional)"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
            hint="Si la dejas vacía, inicia este mes."
          />
        </div>

        {form.period !== 'MONTHLY' && !budget && (
          <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-relaxed text-slate-500">
            El periodo se calcula automáticamente según la fecha actual. Puedes usar una fecha de
            inicio personalizada si lo necesitas.
          </p>
        )}
      </form>
    </Modal>
  );
}
