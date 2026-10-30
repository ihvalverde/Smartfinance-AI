import { sendPaginated, sendSuccess } from '../utils/response.js';
import {
  createBudget,
  deleteBudget,
  getBudgetsStatus,
  listBudgets,
  updateBudget,
} from '../services/budget.service.js';

export async function index(req, res) {
  const result = await listBudgets(req.userId, req.validatedQuery || req.query);
  return sendPaginated(res, result.data, result.meta);
}

export async function status(req, res) {
  const data = await getBudgetsStatus(req.userId);
  return sendSuccess(res, data);
}

export async function create(req, res) {
  const budget = await createBudget(req.userId, req.validatedData);
  return sendSuccess(res, budget, 201);
}

export async function update(req, res) {
  const budget = await updateBudget(req.userId, req.params.id, req.validatedData);
  return sendSuccess(res, budget);
}

export async function destroy(req, res) {
  const result = await deleteBudget(req.userId, req.params.id);
  return sendSuccess(res, result);
}
