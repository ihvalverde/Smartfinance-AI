import { z } from 'zod';
import { ACCOUNT_TYPES } from '../config/constants.js';
import { colorSchema, currencySchema } from './common.validator.js';

export const createAccountSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(60, 'Nombre demasiado largo').transform((v) => v.trim()),
  type: z.enum(ACCOUNT_TYPES, { errorMap: () => ({ message: 'Tipo de cuenta inválido' }) }),
  balance: z.coerce.number().finite().default(0),
  currency: currencySchema,
  color: colorSchema,
  icon: z.string().max(40).default('wallet'),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(60).transform((v) => v.trim()).optional(),
  type: z.enum(ACCOUNT_TYPES).optional(),
  balance: z.coerce.number().finite().optional(),
  currency: currencySchema.optional(),
  color: colorSchema.optional(),
  icon: z.string().max(40).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar',
});
