import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { ACCOUNT_ICONS, ACCOUNT_TYPES, getErrorMessage } from '../../lib/utils.js';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';

const EMPTY_FORM = {
  name: '',
  type: 'CHECKING',
  balance: '0',
  currency: 'PEN',
  color: '#3B82F6',
  icon: 'wallet',
};

export default function AccountForm({ open, onClose, account = null, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (account) {
      setForm({
        name: account.name,
        type: account.type,
        balance: String(account.balance ?? 0),
        currency: account.currency || 'PEN',
        color: account.color || '#3B82F6',
        icon: account.icon || 'wallet',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, account]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      type: form.type,
      balance: Number(form.balance || 0),
      currency: form.currency,
      color: form.color,
      icon: form.icon,
    };

    try {
      if (account) {
        await api.patch(`/accounts/${account.id}`, payload);
        toast.success('Cuenta actualizada');
      } else {
        await api.post('/accounts', payload);
        toast.success('Cuenta creada');
      }
      await onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar la cuenta'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account ? 'Editar cuenta' : 'Nueva cuenta'}
      description="El saldo inicial se ajustará con cada transacción que registres."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="account-form" loading={saving}>
            {account ? 'Guardar cambios' : 'Crear cuenta'}
          </Button>
        </>
      }
    >
      <form id="account-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre de la cuenta"
          name="name"
          placeholder="Ej. BCP Sueldo"
          value={form.name}
          onChange={handleChange}
          maxLength={60}
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Tipo" name="type" value={form.type} onChange={handleChange} required>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>

          <Input
            label="Saldo actual (S/)"
            name="balance"
            type="number"
            step="0.01"
            value={form.balance}
            onChange={handleChange}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Ícono" name="icon" value={form.icon} onChange={handleChange}>
            {ACCOUNT_ICONS.map((icon) => (
              <option key={icon.value} value={icon.value}>
                {icon.label}
              </option>
            ))}
          </Select>

          <div>
            <label className="label" htmlFor="account-color">Color</label>
            <div className="flex items-center gap-3">
              <input
                id="account-color"
                name="color"
                type="color"
                value={form.color}
                onChange={handleChange}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
              />
              <input
                name="color"
                value={form.color}
                onChange={handleChange}
                className="input font-mono uppercase"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        <Select label="Moneda" name="currency" value={form.currency} onChange={handleChange}>
          <option value="PEN">PEN · Sol peruano</option>
        </Select>
      </form>
    </Modal>
  );
}
