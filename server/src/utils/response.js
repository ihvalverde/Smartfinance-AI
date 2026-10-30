import { serializeData } from './helpers.js';

export function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    status: 'success',
    data: serializeData(data),
  });
}

export function sendPaginated(res, data, meta) {
  return res.status(200).json({
    status: 'success',
    data: serializeData(data),
    meta: {
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      totalPages: Math.ceil(meta.total / meta.limit) || 0,
    },
  });
}

export function sendError(res, statusCode, code, message, details = null) {
  const response = {
    status: 'error',
    error: { code, message },
  };
  if (details) response.error.details = details;
  return res.status(statusCode).json(response);
}
