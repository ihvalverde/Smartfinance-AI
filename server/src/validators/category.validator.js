import { z } from 'zod';
import { CATEGORY_TYPES } from '../config/constants.js';
import { colorSchema, uuidSchema } from './common.validator.js';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(60).transform((v) => v.trim()),
  type: z.enum(CATEGORY_TYPES, { errorMap: () => ({ message: 'Tipo de categoría inválido' }) }),
  icon: z.string().max(10).default('📁'),
  color: colorSchema,
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(60).transform((v) => v.trim()).optional(),
  icon: z.string().max(10).optional(),
  color: colorSchema.optional(),
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar',
});
