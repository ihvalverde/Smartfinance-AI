import { sendSuccess } from '../utils/response.js';
import { toDateOnly } from '../utils/helpers.js';
import {
  getDailyTrend,
  getDiagnosis,
  getExpensesByCategory,
  getMonthlyTrend,
  getRecentTransactions,
  getSummary,
} from '../services/dashboard.service.js';

export async function summary(req, res) {
  const data = await getSummary(req.userId);
  return sendSuccess(res, data);
}

export async function expensesByCategory(req, res) {
  const range = {};
  if (req.query.startDate) range.startDate = toDateOnly(req.query.startDate);
  if (req.query.endDate) range.endDate = toDateOnly(req.query.endDate);

  const data = await getExpensesByCategory(
    req.userId,
    range.startDate && range.endDate ? range : {},
  );
  return sendSuccess(res, data);
}

export async function trends(req, res) {
  const [daily, monthly] = await Promise.all([
    getDailyTrend(req.userId, { days: req.query.days }),
    getMonthlyTrend(req.userId, { months: req.query.months }),
  ]);
  return sendSuccess(res, { daily, monthly });
}

export async function recent(req, res) {
  const data = await getRecentTransactions(req.userId, req.query.limit);
  return sendSuccess(res, data);
}

export async function diagnosis(req, res) {
  const data = await getDiagnosis(req.userId);
  return sendSuccess(res, data);
}
