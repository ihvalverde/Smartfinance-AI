import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { getErrorMessage } from '../../lib/utils.js';
import Modal from '../ui/Modal.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';

const EMPTY_FORM = {
  name: '',
  type: 'EXPENSE',
  icon: '📁',
  color: '#6B7280',
  parentId: '',
  sortOrder: '0',
};

export default function CategoryForm({
  open,
  onClose,
  category = null,
  categories = [],
  defaultType = 'EXPENSE',
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (category) {
      setForm({
        name: category.name,
        type: category.type,
        icon: category.icon || '📁',
        color: category.color || '#6B7280',
        parentId: category.parentId || '',
        sortOrder: String(category.sortOrder ?? 0),
      });
    } else {
      setForm({ ...EMPTY_FORM, type: defaultType });
    }
  }, [open, category, defaultType]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const parentOptions = categories.filter(
    (item) => item.type === form.type && !item.parentId && item.id !== category?.id,
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      icon: form.icon.trim() || '📁',
      color: form.color,
      parentId: form.parentId || null,
      sortOrder: Number(form.sortOrder || 0),
    };

    if (!category) payload.type = form.type;

    try {
      if (category) {
        await api.patch(`/categories/${category.id}`, payload);
        toast.success('Categoría actualizada');
      } else {
        await api.post('/categories', payload);
        toast.success('Categoría creada');
      }
      await onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar la categoría'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      description="Organiza tus movimientos con categorías propias."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form" loading={saving}>
            {category ? 'Guardar cambios' : 'Crear categoría'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre"
          name="name"
          placeholder="Ej. Mascotas"
          value={form.name}
          onChange={handleChange}
          maxLength={60}
          required
        />

        {!category && (
          <Select label="Tipo" name="type" value={form.type} onChange={handleChange}>
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
          </Select>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Ícono (emoji)"
            name="icon"
            value={form.icon}
            onChange={handleChange}
            maxLength={10}
            hint="Ej. 🐾, 🏠, 💼"
          />

          <div>
            <label className="label" htmlFor="category-color">Color</label>
            <div className="flex items-center gap-3">
              <input
                id="category-color"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Categoría padre (opcional)"
            name="parentId"
            value={form.parentId}
            onChange={handleChange}
          >
            <option value="">Sin categoría padre</option>
            {parentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.icon} {item.name}
              </option>
            ))}
          </Select>

          <Input
            label="Orden"
            name="sortOrder"
            type="number"
            min="0"
            max="999"
            value={form.sortOrder}
            onChange={handleChange}
          />
        </div>
      </form>
    </Modal>
  );
}
