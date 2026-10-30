import { z } from 'zod';
import { BUDGET_PERIODS } from '../config/constants.js';
import { amountSchema, dateOnlySchema, paginationSchema, uuidSchema } from './common.validator.js';

export const createBudgetSchema = z.object({
  categoryId: uuidSchema,
  amountLimit: amountSchema,
  period: z.enum(BUDGET_PERIODS, { errorMap: () => ({ message: 'Periodo inválido' }) }),
  startDate: z.union([dateOnlySchema, z.string().datetime({ offset: true })]).optional(),
  endDate: z.union([dateOnlySchema, z.string().datetime({ offset: true })]).optional().nullable(),
  alertThreshold: z.coerce.number().min(0.1).max(1).optional().default(0.8),
  isActive: z.boolean().optional().default(true),
});

export const updateBudgetSchema = z.object({
  categoryId: uuidSchema.optional(),
  amountLimit: amountSchema.optional(),
  period: z.enum(BUDGET_PERIODS).optional(),
  startDate: z.union([dateOnlySchema, z.string().datetime({ offset: true })]).optional(),
  endDate: z.union([dateOnlySchema, z.string().datetime({ offset: true })]).optional().nullable(),
  alertThreshold: z.coerce.number().min(0.1).max(1).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar',
});

export const budgetQuerySchema = paginationSchema.extend({
  period: z.enum(BUDGET_PERIODS).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});
