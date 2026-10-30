import { sendPaginated, sendSuccess } from '../utils/response.js';
import {
  createTransaction,
  createTransfer,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  updateTransaction,
} from '../services/transaction.service.js';

export async function index(req, res) {
  const result = await listTransactions(req.userId, req.validatedQuery || req.query);
  return sendPaginated(res, result.data, result.meta);
}

export async function show(req, res) {
  const transaction = await getTransactionById(req.userId, req.params.id);
  return sendSuccess(res, transaction);
}

export async function create(req, res) {
  const transaction = await createTransaction(req.userId, req.validatedData);
  return sendSuccess(res, transaction, 201);
}

export async function update(req, res) {
  const transaction = await updateTransaction(req.userId, req.params.id, req.validatedData);
  return sendSuccess(res, transaction);
}

export async function destroy(req, res) {
  const result = await deleteTransaction(req.userId, req.params.id);
  return sendSuccess(res, result);
}

export async function transfer(req, res) {
  const result = await createTransfer(req.userId, req.validatedData);
  return sendSuccess(res, result, 201);
}
