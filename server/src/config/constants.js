export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const BCRYPT_SALT_ROUNDS = 12;

export const RATE_LIMITS = {
  GENERAL: { windowMs: 15 * 60 * 1000, max: 100 },
  AUTH: { windowMs: 60 * 1000, max: 10 },
  AI_CATEGORIZE: { windowMs: 60 * 1000, max: 30 },
  AI_CHAT: { windowMs: 60 * 1000, max: 10 },
};

export const AI_CONFIG = {
  MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  MAX_INPUT_TOKENS: 2000,
  MAX_OUTPUT_TOKENS: 1000,
  TIMEOUT_MS: 15000,
  MAX_RECEIPT_SIZE_MB: 4,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT'];
export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'];
export const CATEGORY_TYPES = ['INCOME', 'EXPENSE'];
export const BUDGET_PERIODS = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

export const ACCOUNT_TYPE_LABELS = {
  CHECKING: 'Cuenta corriente',
  SAVINGS: 'Ahorros',
  CREDIT_CARD: 'Tarjeta de crédito',
  CASH: 'Efectivo',
  INVESTMENT: 'Inversión',
};

export const TRANSACTION_TYPE_LABELS = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  TRANSFER: 'Transferencia',
};

export const BUDGET_PERIOD_LABELS = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

export const DEFAULT_CURRENCY = 'PEN';
export const DEFAULT_TIMEZONE = 'America/Lima';
export const LIMA_UTC_OFFSET_MINUTES = -300;
export const DEFAULT_CATEGORY_COLOR = '#6B7280';
