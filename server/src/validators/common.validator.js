import { z } from 'zod';

export const uuidSchema = z.string().uuid('Identificador inválido');

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato YYYY-MM-DD');

export const amountSchema = z.coerce
  .number({ invalid_type_error: 'El monto debe ser numérico' })
  .positive('El monto debe ser mayor a 0')
  .max(999999999, 'El monto es demasiado grande');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color hexadecimal inválido')
  .default('#6B7280');

export const currencySchema = z
  .string()
  .length(3, 'La moneda debe tener 3 letras')
  .transform((value) => value.toUpperCase())
  .default('PEN');
