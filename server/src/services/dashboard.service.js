import prisma from '../config/database.js';
import {
  addDays,
  limaNowParts,
  monthRange,
  roundMoney,
  startOfLimaMonth,
  toIsoDate,
  todayLima,
} from '../utils/helpers.js';
import { getBudgetsStatus } from './budget.service.js';

const transactionInclude = {
  account: { select: { id: true, name: true, type: true, color: true, icon: true } },
  category: { select: { id: true, name: true, icon: true, color: true, type: true } },
};

function previousMonthRange(reference = todayLima()) {
  const date = new Date(reference.getTime());
  const firstOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const previous = new Date(Date.UTC(firstOfMonth.getUTCFullYear(), firstOfMonth.getUTCMonth() - 1, 1));
  return monthRange(previous);
}

function percentChange(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return roundMoney(((current - previous) / previous) * 100);
}

async function aggregateTotals(userId, startDate, endDate) {
  const grouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      account: { userId },
      type: { in: ['INCOME', 'EXPENSE'] },
      transactionDate: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const income = roundMoney(
    Number(grouped.find((item) => item.type === 'INCOME')?._sum.amount || 0),
  );
  const expenses = roundMoney(
    Number(grouped.find((item) => item.type === 'EXPENSE')?._sum.amount || 0),
  );
  const transactionCount = grouped.reduce((sum, item) => sum + item._count._all, 0);

  return { income, expenses, transactionCount };
}

export async function getSummary(userId) {
  const { startDate, endDate } = monthRange();
  const current = await aggregateTotals(userId, startDate, endDate);
  const previousRange = previousMonthRange();
  const previous = await aggregateTotals(userId, previousRange.startDate, previousRange.endDate);

  const accounts = await prisma.account.findMany({
    where: { userId, isActive: true },
    select: { balance: true },
  });
  const balance = roundMoney(
    accounts.reduce((sum, account) => sum + Number(account.balance), 0),
  );

  const savings = roundMoney(current.income - current.expenses);
  const previousSavings = roundMoney(previous.income - previous.expenses);
  const savingsRate = current.income > 0
    ? roundMoney((savings / current.income) * 100)
    : 0;

  const parts = limaNowParts();

  return {
    balance,
    income: current.income,
    expenses: current.expenses,
    savings,
    savingsRate,
    transactionCount: current.transactionCount,
    accountsCount: accounts.length,
    currency: 'PEN',
    month: `${parts.year}-${String(parts.month + 1).padStart(2, '0')}`,
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
    changes: {
      income: percentChange(current.income, previous.income),
      expenses: percentChange(current.expenses, previous.expenses),
      savings: percentChange(savings, previousSavings),
    },
  };
}

export async function getExpensesByCategory(userId, { startDate, endDate } = {}) {
  const range = startDate && endDate
    ? { startDate, endDate }
    : monthRange();

  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      account: { userId },
      type: 'EXPENSE',
      transactionDate: { gte: range.startDate, lte: range.endDate },
    },
    _sum: { amount: true },
  });

  const categoryIds = grouped
    .map((item) => item.categoryId)
    .filter((value) => Boolean(value));

  const categories = categoryIds.length
    ? await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, color: true },
    })
    : [];

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const total = roundMoney(
    grouped.reduce((sum, item) => sum + Number(item._sum.amount || 0), 0),
  );

  const result = grouped
    .map((item) => {
      const category = item.categoryId ? categoryMap.get(item.categoryId) : null;
      const amount = roundMoney(Number(item._sum.amount || 0));
      return {
        categoryId: item.categoryId,
        name: category?.name || 'Sin categoría',
        icon: category?.icon || '🏷️',
        color: category?.color || '#6B7280',
        total: amount,
        percentage: total > 0 ? roundMoney((amount / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  return { total, categories: result, startDate: toIsoDate(range.startDate), endDate: toIsoDate(range.endDate) };
}

export async function getDailyTrend(userId, { days = 30 } = {}) {
  const safeDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  const endDate = todayLima();
  const startDate = addDays(endDate, -(safeDays - 1));

  const transactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      type: { in: ['INCOME', 'EXPENSE'] },
      transactionDate: { gte: startDate, lte: endDate },
    },
    select: { type: true, amount: true, transactionDate: true },
  });

  const map = new Map();
  for (const transaction of transactions) {
    const key = toIsoDate(transaction.transactionDate);
    if (!map.has(key)) map.set(key, { expenses: 0, income: 0 });
    const bucket = map.get(key);
    if (transaction.type === 'EXPENSE') bucket.expenses += Number(transaction.amount);
    else bucket.income += Number(transaction.amount);
  }

  const result = [];
  for (let index = 0; index < safeDays; index += 1) {
    const date = addDays(startDate, index);
    const key = toIsoDate(date);
    const bucket = map.get(key) || { expenses: 0, income: 0 };
    result.push({
      date: key,
      expenses: roundMoney(bucket.expenses),
      income: roundMoney(bucket.income),
    });
  }

  return result;
}

export async function getMonthlyTrend(userId, { months = 6 } = {}) {
  const safeMonths = Math.min(Math.max(Number(months) || 6, 1), 24);
  const now = todayLima();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (safeMonths - 1), 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const transactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      type: { in: ['INCOME', 'EXPENSE'] },
      transactionDate: { gte: startDate, lte: endDate },
    },
    select: { type: true, amount: true, transactionDate: true },
  });

  const map = new Map();
  for (const transaction of transactions) {
    const key = toIsoDate(transaction.transactionDate).slice(0, 7);
    if (!map.has(key)) map.set(key, { expenses: 0, income: 0 });
    const bucket = map.get(key);
    if (transaction.type === 'EXPENSE') bucket.expenses += Number(transaction.amount);
    else bucket.income += Number(transaction.amount);
  }

  const result = [];
  for (let index = 0; index < safeMonths; index += 1) {
    const date = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const bucket = map.get(key) || { expenses: 0, income: 0 };
    result.push({
      month: key,
      expenses: roundMoney(bucket.expenses),
      income: roundMoney(bucket.income),
    });
  }

  return result;
}

export async function getRecentTransactions(userId, limit = 5) {
  return prisma.transaction.findMany({
    where: { account: { userId } },
    include: transactionInclude,
    orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    take: Math.min(Math.max(Number(limit) || 5, 1), 20),
  });
}

export async function getDiagnosis(userId) {
  const summary = await getSummary(userId);
  const expenses = await getExpensesByCategory(userId);
  const budgets = await getBudgetsStatus(userId);

  const insights = [];
  const topCategory = expenses.categories[0] || null;

  if (summary.transactionCount === 0) {
    return {
      message: 'Aún no hay movimientos este mes. Registra tu primera transacción para recibir un diagnóstico personalizado.',
      insights: [],
      savingsRate: 0,
      topCategory: null,
      budgetAlerts: [],
    };
  }

  if (topCategory) {
    insights.push(
      `Tu mayor gasto fue ${topCategory.icon} ${topCategory.name} con S/ ${topCategory.total.toFixed(2)} (${topCategory.percentage}% del total).`,
    );
  }

  if (summary.income > 0 && summary.expenses > summary.income) {
    insights.push('Este mes gastaste más de lo que ingresó. Prioriza recortar gastos no esenciales.');
  } else if (summary.savingsRate >= 20) {
    insights.push(`Buen ritmo: estás ahorrando ${summary.savingsRate}% de tus ingresos.`);
  } else if (summary.income > 0) {
    insights.push(`Tu ahorro es ${summary.savingsRate}% de los ingresos. La meta recomendada es 20%.`);
  }

  const alerts = budgets.filter((budget) => budget.alert);
  for (const budget of alerts) {
    const label = budget.status === 'exceeded' ? 'superaste' : 'estás cerca de superar';
    insights.push(
      `En ${budget.category.icon} ${budget.category.name} ${label} tu presupuesto: S/ ${budget.spent.toFixed(2)} de S/ ${budget.amountLimit.toFixed(2)}.`,
    );
  }

  const message = summary.savings >= 0
    ? `Este mes ingresaste S/ ${summary.income.toFixed(2)} y gastaste S/ ${summary.expenses.toFixed(2)}. Tu ahorro estimado es S/ ${summary.savings.toFixed(2)}.`
    : `Este mes gastaste S/ ${Math.abs(summary.savings).toFixed(2)} más de lo que ingresó. Revisa tus categorías principales.`;

  return {
    message,
    insights,
    savingsRate: summary.savingsRate,
    topCategory,
    budgetAlerts: alerts,
  };
}
