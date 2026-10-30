import { ValidationError } from '../utils/errors.js';

function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ValidationError('Los datos enviados son inválidos', formatIssues(result.error)));
    }
    req.validatedData = result.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(new ValidationError('Parámetros de consulta inválidos', formatIssues(result.error)));
    }
    req.validatedQuery = result.data;
    return next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(new ValidationError('Parámetros de ruta inválidos', formatIssues(result.error)));
    }
    req.validatedParams = result.data;
    return next();
  };
}
