import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Cuenta corriente' },
  { value: 'SAVINGS', label: 'Ahorros' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'INVESTMENT', label: 'Inversión' },
];

export const ACCOUNT_TYPE_LABELS = ACCOUNT_TYPES.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export const BUDGET_PERIODS = [
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'YEARLY', label: 'Anual' },
];

export const BUDGET_PERIOD_LABELS = BUDGET_PERIODS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export const ACCOUNT_ICONS = [
  { value: 'wallet', label: 'Billetera' },
  { value: 'landmark', label: 'Banco' },
  { value: 'credit-card', label: 'Tarjeta' },
  { value: 'banknote', label: 'Efectivo' },
  { value: 'piggy-bank', label: 'Ahorro' },
  { value: 'line-chart', label: 'Inversión' },
];

export const TRANSACTION_TYPE_LABELS = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
};

export function formatCurrency(value, options = {}) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number(value || 0));
}

export function formatCompactCurrency(value) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

export function formatNumber(value) {
  return new Intl.NumberFormat('es-PE').format(Number(value || 0));
}

export function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value);
  const dateOnly = text.match(/^(\d{4}-\d{2}-\d{2})(?:T00:00:00(?:\.\d{3})?Z?)?$/);
  if (dateOnly) return parseISO(`${dateOnly[1]}T00:00:00`);

  return parseISO(text);
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  const date = parseDateValue(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return format(date, pattern, { locale: es });
}

export function formatMonth(key) {
  if (!key) return '—';
  const [year, month] = String(key).split('-').map(Number);
  if (!year || !month) return key;
  return format(new Date(year, month - 1, 1), 'MMM yyyy', { locale: es });
}

export function formatMonthLong(key) {
  if (!key) return '—';
  const [year, month] = String(key).split('-').map(Number);
  if (!year || !month) return key;
  const text = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function currentMonthLabel() {
  return format(new Date(), "MMMM yyyy", { locale: es });
}

export function getErrorMessage(error, fallback = 'Ocurrió un error inesperado') {
  return error?.response?.data?.error?.message || error?.message || fallback;
}

export function getValidationDetails(error) {
  return error?.response?.data?.error?.details || [];
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function firstName(name = '') {
  return name.split(' ').filter(Boolean)[0] || name;
}

export function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export function statusFromPercentage(percentage) {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 80) return 'warning';
  return 'ok';
}

export function percentage(value, total) {
  if (!total) return 0;
  return Math.round((Number(value) / Number(total)) * 10000) / 100;
}
