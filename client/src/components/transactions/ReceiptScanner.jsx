import { useRef, useState } from 'react';
import { ImagePlus, ScanLine, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { formatCurrency, formatDate, getErrorMessage } from '../../lib/utils.js';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';

export default function ReceiptScanner({ onUseSuggestion }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (selected.size > 4 * 1024 * 1024) {
      toast.error('La imagen supera los 4 MB permitidos');
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
  };

  const handleScan = async () => {
    if (!file) {
      toast.error('Selecciona una imagen de la boleta');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setLoading(true);
    try {
      const response = await api.post('/ai/scan-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo leer la boleta'));
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (!result) return;
    onUseSuggestion?.({
      type: 'EXPENSE',
      amount: result.total,
      description: result.merchant || 'Gasto con boleta',
      categoryId: result.categoryId || '',
      transactionDate: result.transactionDate,
    });
    setResult(null);
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
        >
          <div className="rounded-2xl bg-white p-3 text-slate-400 shadow-sm ring-1 ring-slate-200">
            <ImagePlus className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-800">Sube una foto de tu boleta</p>
          <p className="mt-1 text-xs text-slate-500">JPG, PNG o WEBP · máximo 4 MB</p>
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <img src={preview} alt="Vista previa de la boleta" className="max-h-64 w-full object-contain" />
          <button
            type="button"
            onClick={reset}
            className="absolute right-2 top-2 rounded-lg bg-slate-900/70 p-1.5 text-white hover:bg-slate-900"
            aria-label="Quitar imagen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={reset} disabled={!file || loading}>
          Limpiar
        </Button>
        <Button onClick={handleScan} loading={loading} icon={ScanLine} disabled={!file}>
          Escanear boleta
        </Button>
      </div>

      {result && (
        <div className="animate-fade-up rounded-xl border border-brand-200 bg-brand-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{result.merchant}</p>
              <p className="mt-0.5 text-xs text-slate-500">{formatDate(result.transactionDate)}</p>
            </div>
            <Badge variant="brand">{Math.round((result.confidence || 0) * 100)}% confianza</Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xl font-bold text-slate-900">
              {result.total ? formatCurrency(result.total) : 'Total no detectado'}
            </span>
            {result.category && (
              <span className="text-sm text-slate-600">
                {result.category.icon} {result.category.name}
              </span>
            )}
          </div>

          {result.items?.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-brand-200/60 pt-3 text-xs text-slate-600">
              {result.items.slice(0, 5).map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex justify-between gap-4">
                  <span className="truncate">{item.name}</span>
                  <span className="font-medium text-slate-800">{formatCurrency(item.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={handleUse} disabled={!result.total}>
              Usar estos datos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
