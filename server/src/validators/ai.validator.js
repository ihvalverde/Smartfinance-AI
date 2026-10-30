import { z } from 'zod';
import { uuidSchema } from './common.validator.js';

export const categorizeSchema = z.object({
  text: z
    .string()
    .min(3, 'Describe la transacción con al menos 3 caracteres')
    .max(500, 'El texto es demasiado largo')
    .transform((value) => value.trim()),
});

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'El mensaje no puede estar vacío')
    .max(2000, 'El mensaje es demasiado largo')
    .transform((value) => value.trim()),
  sessionId: uuidSchema.nullable().optional(),
});
