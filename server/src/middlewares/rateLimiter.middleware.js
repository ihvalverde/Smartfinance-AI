import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../config/constants.js';

function buildLimiter(limit, message) {
  return rateLimit({
    windowMs: limit.windowMs,
    max: limit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
    },
  });
}

export const generalLimiter = buildLimiter(
  RATE_LIMITS.GENERAL,
  'Demasiadas solicitudes. Intenta en 15 minutos.',
);

export const authLimiter = buildLimiter(
  RATE_LIMITS.AUTH,
  'Demasiados intentos de autenticación. Espera 1 minuto.',
);

export const aiCategorizeLimiter = buildLimiter(
  RATE_LIMITS.AI_CATEGORIZE,
  'Límite de categorizaciones alcanzado. Espera 1 minuto.',
);

export const aiChatLimiter = buildLimiter(
  RATE_LIMITS.AI_CHAT,
  'Límite de mensajes de chat alcanzado. Espera 1 minuto.',
);
