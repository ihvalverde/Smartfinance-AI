import { sendSuccess } from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';
import { getAiProvider, isAiEnabled } from '../services/ai/ai-provider.js';
import { deleteSession, getSession, listSessions, sendMessage } from '../services/ai/chat.service.js';
import { predictExpenses } from '../services/ai/predictor.service.js';
import { parseNaturalTransaction } from '../services/ai/categorizer.service.js';
import { scanReceipt } from '../services/ai/receipt-scanner.service.js';

export async function status(req, res) {
  const provider = getAiProvider();
  return sendSuccess(res, {
    enabled: isAiEnabled(),
    provider: provider.name,
    model: provider.model || null,
  });
}

export async function categorize(req, res) {
  const data = await parseNaturalTransaction(req.userId, req.validatedData.text);
  return sendSuccess(res, data);
}

export async function receipt(req, res) {
  if (!req.file) {
    throw new ValidationError('Debes adjuntar una imagen de la boleta');
  }
  const data = await scanReceipt(req.userId, req.file);
  return sendSuccess(res, data);
}

export async function predictions(req, res) {
  const data = await predictExpenses(req.userId, { months: req.query.months });
  return sendSuccess(res, data);
}

export async function chatSessions(req, res) {
  const data = await listSessions(req.userId);
  return sendSuccess(res, data);
}

export async function chatSession(req, res) {
  const data = await getSession(req.userId, req.params.id);
  return sendSuccess(res, data);
}

export async function removeChatSession(req, res) {
  const data = await deleteSession(req.userId, req.params.id);
  return sendSuccess(res, data);
}

export async function chatMessage(req, res) {
  const data = await sendMessage(req.userId, req.validatedData);
  return sendSuccess(res, data, 201);
}
