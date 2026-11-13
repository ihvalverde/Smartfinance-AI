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
  MAX_RECEIPT_SIZE_MB: 4,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT'];
export const CATEGORY_TYPES = ['INCOME', 'EXPENSE'];
export const BUDGET_PERIODS = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

export const LIMA_UTC_OFFSET_MINUTES = -300;
