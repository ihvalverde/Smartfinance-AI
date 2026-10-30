import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';

export function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
  }

  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  if (err.code === 'P2025') {
    return sendError(res, 404, 'NOT_FOUND', 'Recurso no encontrado');
  }

  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'campo';
    return sendError(res, 409, 'CONFLICT', `El ${field} ya está registrado`);
  }

  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'BAD_REQUEST', 'JSON malformado en el body');
  }

  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen supera el tamaño máximo permitido (4 MB)'
      : 'Error al subir el archivo';
    return sendError(res, 400, 'UPLOAD_ERROR', message);
  }

  return sendError(res, 500, 'INTERNAL_ERROR', 'Error interno del servidor');
}

export function notFoundHandler(req, res) {
  return sendError(res, 404, 'NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.originalUrl}`);
}
