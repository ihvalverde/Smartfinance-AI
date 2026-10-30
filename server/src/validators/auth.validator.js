import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido').transform((value) => value.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72, 'La contraseña es demasiado larga'),
  fullName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre es demasiado largo')
    .transform((value) => value.trim()),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido').transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre es demasiado largo')
    .transform((value) => value.trim())
    .optional(),
  preferredCurrency: z
    .string()
    .length(3, 'La moneda debe tener 3 letras')
    .transform((value) => value.toUpperCase())
    .optional(),
  timezone: z.string().max(60).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos un campo para actualizar',
});
