import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, RotateCcw, Tags, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { classNames, getErrorMessage } from '../lib/utils.js';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageLoader from '../components/ui/Spinner.jsx';
import CategoryForm from '../components/categories/CategoryForm.jsx';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('EXPENSE');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [response, hiddenResponse] = await Promise.all([
        api.get('/categories'),
        api.get('/categories/hidden-count'),
      ]);
      setCategories(response.data.data);
      setHiddenCount(hiddenResponse.data.data.count);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar las categorías'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => categories.filter((category) => category.type === tab && !category.parentId),
    [categories, tab],
  );

  const customCount = filtered.filter((category) => !category.isSystem).length;

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setFormOpen(true);
  };

  const handleDelete = async (category) => {
    const message = category.isSystem
      ? `La categoría “${category.name}” es del sistema. Se ocultará solo para tu cuenta. ¿Continuar?`
      : `¿Eliminar la categoría “${category.name}”? Si tiene movimientos o presupuestos, se ocultará para conservar tu historial.`;

    if (!window.confirm(message)) return;

    try {
      const response = await api.delete(`/categories/${category.id}`);
      toast.success(response.data.data.hidden ? 'Categoría ocultada' : 'Categoría eliminada');
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la categoría'));
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('¿Restaurar todas las categorías que ocultaste?')) return;

    try {
      const response = await api.post('/categories/restore-hidden');
      toast.success(`${response.data.data.restored} categoría(s) restaurada(s)`);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron restaurar las categorías'));
    }
  };

  if (loading && !categories.length) {
    return <PageLoader label="Cargando categorías..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Categorías</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} categorías de {tab === 'EXPENSE' ? 'gasto' : 'ingreso'} · {customCount} personalizadas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hiddenCount > 0 && (
            <Button variant="secondary" icon={RotateCcw} onClick={handleRestore}>
              Restaurar ({hiddenCount})
            </Button>
          )}
          <Button icon={Plus} onClick={openNew}>
            Nueva categoría
          </Button>
        </div>
      </div>

      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('EXPENSE')}
          className={classNames(
            'rounded-lg px-4 py-2 text-sm font-semibold transition',
            tab === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          Gastos
        </button>
        <button
          type="button"
          onClick={() => setTab('INCOME')}
          className={classNames(
            'rounded-lg px-4 py-2 text-sm font-semibold transition',
            tab === 'INCOME' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          Ingresos
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No hay categorías en esta sección"
          description="Crea una categoría personalizada para clasificar mejor tus movimientos."
          action={<Button icon={Plus} onClick={openNew}>Crear categoría</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((category) => (
            <article key={category.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                    style={{ backgroundColor: `${category.color}1a` }}
                  >
                    {category.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{category.name}</p>
                    <p className="text-xs text-slate-500">
                      {category.children?.length
                        ? `${category.children.length} subcategoría${category.children.length === 1 ? '' : 's'}`
                        : 'Sin subcategorías'}
                    </p>
                  </div>
                </div>
                {category.isSystem ? (
                  <Badge variant="default">Sistema</Badge>
                ) : (
                  <Badge variant="brand">Personalizada</Badge>
                )}
              </div>

              {category.children?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {category.children.map((child) => (
                    <span
                      key={child.id}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                    >
                      {child.icon} {child.name}
                      <button
                        type="button"
                        onClick={() => handleDelete(child)}
                        className="rounded-full p-0.5 text-slate-400 transition hover:bg-red-100 hover:text-red-600"
                        aria-label={`Eliminar u ocultar ${child.name}`}
                        title={child.isSystem ? 'Ocultar subcategoría' : 'Eliminar subcategoría'}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                {!category.isSystem && (
                  <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(category)}>
                    Editar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => handleDelete(category)}
                >
                  {category.isSystem ? 'Ocultar' : 'Eliminar'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <CategoryForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        category={editing}
        categories={categories}
        defaultType={tab}
        onSaved={load}
      />
    </div>
  );
}
