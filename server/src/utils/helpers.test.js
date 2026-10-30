import { describe, expect, it } from 'vitest';
import {
  addDays,
  endOfLimaMonth,
  parsePagination,
  periodRange,
  roundMoney,
  safeJsonParse,
  sanitizeText,
  startOfLimaMonth,
  toDateOnly,
  toIsoDate,
} from './helpers.js';

describe('fechas de Lima', () => {
  it('normaliza fechas date-only a medianoche UTC', () => {
    expect(toIsoDate(toDateOnly('2026-10-29'))).toBe('2026-10-29');
    expect(toIsoDate(toDateOnly('2026-10-29T18:30:00.000Z'))).toBe('2026-10-29');
  });

  it('calcula el inicio y fin del mes', () => {
    expect(toIsoDate(startOfLimaMonth('2026-10-15'))).toBe('2026-10-01');
    expect(toIsoDate(endOfLimaMonth('2026-10-15'))).toBe('2026-10-31');
    expect(toIsoDate(endOfLimaMonth('2024-02-10'))).toBe('2024-02-29');
  });

  it('suma días sin desbordes de zona horaria', () => {
    expect(toIsoDate(addDays(toDateOnly('2026-12-31'), 1))).toBe('2027-01-01');
    expect(toIsoDate(addDays(toDateOnly('2024-02-28'), 1))).toBe('2024-02-29');
  });

  it('calcula el rango semanal de lunes a domingo', () => {
    const range = periodRange('WEEKLY', '2026-10-29');
    expect(toIsoDate(range.startDate)).toBe('2026-10-26');
    expect(toIsoDate(range.endDate)).toBe('2026-11-01');
  });

  it('calcula rangos mensual, trimestral y anual', () => {
    const month = periodRange('MONTHLY', '2026-10-15');
    expect(toIsoDate(month.startDate)).toBe('2026-10-01');
    expect(toIsoDate(month.endDate)).toBe('2026-10-31');

    const quarter = periodRange('QUARTERLY', '2026-10-15');
    expect(toIsoDate(quarter.startDate)).toBe('2026-10-01');
    expect(toIsoDate(quarter.endDate)).toBe('2026-12-31');

    const year = periodRange('YEARLY', '2026-10-15');
    expect(toIsoDate(year.startDate)).toBe('2026-01-01');
    expect(toIsoDate(year.endDate)).toBe('2026-12-31');
  });

  it('respeta una fecha de inicio personalizada en el ciclo mensual', () => {
    const current = periodRange('MONTHLY', '2026-10-20', '2026-10-15');
    expect(toIsoDate(current.startDate)).toBe('2026-10-15');
    expect(toIsoDate(current.endDate)).toBe('2026-11-14');

    const next = periodRange('MONTHLY', '2026-11-15', '2026-10-15');
    expect(toIsoDate(next.startDate)).toBe('2026-11-15');
    expect(toIsoDate(next.endDate)).toBe('2026-12-14');
  });

  it('ancla ciclos semanales y proyectos futuros a su fecha de inicio', () => {
    const weekly = periodRange('WEEKLY', '2026-10-20', '2026-10-07');
    expect(toIsoDate(weekly.startDate)).toBe('2026-10-14');
    expect(toIsoDate(weekly.endDate)).toBe('2026-10-20');

    const future = periodRange('MONTHLY', '2026-10-01', '2026-11-05');
    expect(toIsoDate(future.startDate)).toBe('2026-11-05');
    expect(toIsoDate(future.endDate)).toBe('2026-12-04');
  });

  it('ajusta meses cortos sin salir del mes', () => {
    const range = periodRange('MONTHLY', '2026-02-28', '2026-01-31');
    expect(toIsoDate(range.startDate)).toBe('2026-02-28');
    expect(toIsoDate(range.endDate)).toBe('2026-03-30');
  });
});

describe('utilidades numéricas y de texto', () => {
  it('redondea dinero a dos decimales', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney('12.345')).toBe(12.35);
    expect(roundMoney(null)).toBe(0);
  });

  it('normaliza la paginación con límites seguros', () => {
    expect(parsePagination({ page: '2', limit: '500' })).toEqual({
      page: 2,
      limit: 100,
      skip: 100,
    });
    expect(parsePagination({ page: '0', limit: '0' })).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
  });

  it('sanea texto y parsea JSON con fallback', () => {
    expect(sanitizeText('  hola  ')).toBe('hola');
    expect(sanitizeText('abcdef', 3)).toBe('abc');
    expect(safeJsonParse('{"ok":true}')).toEqual({ ok: true });
    expect(safeJsonParse('{no-json', { fallback: true })).toEqual({ fallback: true });
  });
});
