import { Prisma } from '@prisma/client';
import { LIMA_UTC_OFFSET_MINUTES, PAGINATION } from '../config/constants.js';

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function isDecimal(value) {
  return value instanceof Prisma.Decimal || (value && typeof value.toNumber === 'function');
}

export function toNumber(value) {
  if (value === null || value === undefined) return value;
  if (isDecimal(value)) return value.toNumber();
  return value;
}

export function serializeData(value) {
  if (value === null || value === undefined) return value;
  if (isDecimal(value)) return value.toNumber();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeData);
  if (typeof value === 'object') {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = serializeData(item);
    }
    return result;
  }
  return value;
}

export function roundMoney(value) {
  const n = Number(value || 0);
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index === -1) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

export function parsePagination(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE, 1);
  const limitRaw = parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT;
  const limit = Math.min(Math.max(limitRaw, 1), PAGINATION.MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

export function limaNowParts(date = new Date()) {
  const shifted = new Date(date.getTime() + LIMA_UTC_OFFSET_MINUTES * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
  };
}

export function toDateOnly(value) {
  if (!value) {
    const { year, month, day } = limaNowParts();
    return new Date(Date.UTC(year, month, day));
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

export function todayLima() {
  return toDateOnly();
}

export function addDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function toIsoDate(date) {
  const d = toDateOnly(date);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export function startOfLimaMonth(reference = todayLima()) {
  const date = toDateOnly(reference);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfLimaMonth(reference = todayLima()) {
  const start = startOfLimaMonth(reference);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
}

export function monthRange(reference = todayLima()) {
  return { startDate: startOfLimaMonth(reference), endDate: endOfLimaMonth(reference) };
}

export function addMonthsClamped(date, months) {
  const base = toDateOnly(date);
  const target = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(base.getUTCDate(), lastDay)));
}

function anchoredPeriodRange(period, reference, anchor) {
  const ref = toDateOnly(reference);
  const start = toDateOnly(anchor);

  if (period === 'WEEKLY') {
    const diffDays = Math.floor((ref.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const weeks = ref < start ? 0 : Math.floor(diffDays / 7);
    const startDate = addDays(start, weeks * 7);
    return { startDate, endDate: addDays(startDate, 6) };
  }

  const step = period === 'MONTHLY' ? 1 : period === 'QUARTERLY' ? 3 : 12;
  const rawMonths =
    (ref.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (ref.getUTCMonth() - start.getUTCMonth());
  let index = ref < start ? 0 : Math.floor(rawMonths / step);
  let startDate = addMonthsClamped(start, index * step);

  if (ref >= start && startDate > ref) {
    index -= 1;
    startDate = addMonthsClamped(start, index * step);
  }

  const endDate = addDays(addMonthsClamped(start, (index + 1) * step), -1);
  return { startDate, endDate };
}

export function periodRange(period, reference = todayLima(), anchorDate = null) {
  if (anchorDate) {
    return anchoredPeriodRange(period, reference, anchorDate);
  }

  const ref = toDateOnly(reference);
  const year = ref.getUTCFullYear();
  const month = ref.getUTCMonth();

  if (period === 'WEEKLY') {
    const day = ref.getUTCDay();
    const diffToMonday = (day + 6) % 7;
    const startDate = addDays(ref, -diffToMonday);
    return { startDate, endDate: addDays(startDate, 6) };
  }

  if (period === 'MONTHLY') {
    return {
      startDate: new Date(Date.UTC(year, month, 1)),
      endDate: new Date(Date.UTC(year, month + 1, 0)),
    };
  }

  if (period === 'QUARTERLY') {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      startDate: new Date(Date.UTC(year, quarterStartMonth, 1)),
      endDate: new Date(Date.UTC(year, quarterStartMonth + 3, 0)),
    };
  }

  return {
    startDate: new Date(Date.UTC(year, 0, 1)),
    endDate: new Date(Date.UTC(year, 11, 31)),
  };
}

export function isDateInRange(date, startDate, endDate) {
  const value = toDateOnly(date)?.getTime();
  return value >= startDate.getTime() && value <= endDate.getTime();
}

export function sanitizeText(value, maxLength = 500) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, maxLength);
}

export function safeJsonParse(value, fallback = null) {
  try {
    if (typeof value !== 'string') return value ?? fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
