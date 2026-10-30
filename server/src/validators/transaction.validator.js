import { z } from 'zod';
import { amountSchema, dateOnlySchema, paginationSchema, uuidSchema } from './common.validator.js';

export const createTransactionSchema = z.object({
  accountId: uuidSchema,
  categoryId: uuidSchema.nullable().optional(),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: 'El tipo debe ser INCOME o EXPENSE' }),
  }),
  amount: amountSchema,
  currency: z.string().length(3).transform((v) => v.toUpperCase()).default('PEN'),
  description: z.string().min(1, 'La descripción es requerida').max(255).transform((v) => v.trim()),
  notes: z.string().max(1000).optional().nullable(),
  transactionDate: z.union([dateOnlySchema, z.string().datetime({ offset: true })]).optional(),
  isRecurring: z.boolean().optional().default(false),
  recurringPattern: z.string().max(50).optional().nullable(),
  metadata: z.record(z.any()).optional(),
});

export const updateTransactionSchema = z.object({
  accountId: uuidSchema.optional(),
  categoryId: uuidSchema.nullable().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  amount: amountSchema.optional(),
  currency: z.string().length(3).transform((v) => v.toUpperCase()).optional(),
  description: z.string().min(1).max(255).transform((v) => v.trim()).optional(),
  notes: z.string().max(1000).optional().nullable(),
  transactionDate: z.union([dateOnlySchema, z.string().datetime({ offset: true })]).optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.string().max(50).optional().nullable(),
  metadata: z.record(z.any()).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar',
});

export const transferSchema = z.object({
  fromAccountId: uuidSchema,
  toAccountId: uuidSchema,
  amount: amountSchema,
  description: z.string().max(255).optional(),
  transactionDate: z.union([dateOnlySchema, z.string().datetime({ offset: true })]).optional(),
  notes: z.string().max(1000).optional().nullable(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: 'Las cuentas de origen y destino deben ser diferentes',
  path: ['toAccountId'],
});

export const transactionQuerySchema = paginationSchema.extend({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  accountId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  startDate: dateOnlySchema.optional(),
  endDate: dateOnlySchema.optional(),
  search: z.string().max(100).optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
});
