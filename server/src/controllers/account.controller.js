import { sendSuccess } from '../utils/response.js';
import {
  createAccount,
  deactivateAccount,
  getAccountById,
  getAccountsSummary,
  listAccounts,
  updateAccount,
} from '../services/account.service.js';

export async function index(req, res) {
  const accounts = await listAccounts(req.userId, {
    includeInactive: req.query.includeInactive === 'true',
  });
  return sendSuccess(res, accounts);
}

export async function summary(req, res) {
  const data = await getAccountsSummary(req.userId);
  return sendSuccess(res, data);
}

export async function show(req, res) {
  const account = await getAccountById(req.userId, req.params.id);
  return sendSuccess(res, account);
}

export async function create(req, res) {
  const account = await createAccount(req.userId, req.validatedData);
  return sendSuccess(res, account, 201);
}

export async function update(req, res) {
  const account = await updateAccount(req.userId, req.params.id, req.validatedData);
  return sendSuccess(res, account);
}

export async function destroy(req, res) {
  const result = await deactivateAccount(req.userId, req.params.id);
  return sendSuccess(res, result);
}
