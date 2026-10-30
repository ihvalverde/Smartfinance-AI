import { useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { formatCurrency, getErrorMessage } from '../../lib/utils.js';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';

const EXAMPLES = [
  'Almuerzo 25 soles hoy',
  'Taxi a la oficina 18.50',
  'Sueldo de octubre 3500',
];

export default function AiQuickAdd({ onUseSuggestion }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async (event) => {
    event?.preventDefault();
    if (text.trim().length < 3) return;

    setLoading(true);
    setResult(null);
    try {
      const response = await api.post('/ai/categorize', { text: text.trim() });
      setResult(response.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo interpretar el texto'));
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (!result) return;
    onUseSuggestion?.({
      type: result.type,
      amount: result.amount,
      description: result.description,
      categoryId: result.categoryId || '',
      transactionDate: result.transactionDate,
    });
    setResult(null);
    setText('');
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white px-5 py-3.5">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <p className="text-sm font-semibold text-slate-900">Registro rápido con IA</p>
        <Badge variant="brand" className="ml-auto">Beta</Badge>
      </div>

      <form onSubmit={handleAnalyze} className="space-y-3 p-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="Ej. “Uber al trabajo 14.50 ayer”"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={500}
          />
          <Button type="submit" loading={loading} icon={Wand2} disabled={text.trim().length < 3}>
            Interpretar
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setText(example)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 transition hover:border-brand-300 hover:text-brand-700"
            >
              {example}
            </button>
          ))}
        </div>

        {result && (
          <div className="animate-fade-up rounded-xl border border-brand-200 bg-brand-50/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={result.type === 'INCOME' ? 'success' : 'danger'}>
                {result.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
              </Badge>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(result.amount || 0)}
              </span>
              {result.category && (
                <span className="text-sm text-slate-600">
                  {result.category.icon} {result.category.name}
                </span>
              )}
              <span className="ml-auto text-xs text-slate-500">
                Confianza {Math.round((result.confidence || 0) * 100)}%
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{result.description}</p>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={handleUse}>
                Usar estos datos
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
