import prisma from '../config/database.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';
import {
  parsePagination,
  periodRange,
  roundMoney,
  toDateOnly,
  todayLima,
} from '../utils/helpers.js';

const budgetInclude = {
  category: { select: { id: true, name: true, icon: true, color: true, type: true } },
};

async function assertExpenseCategory(userId, categoryId) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [{ isSystem: true }, { userId }],
    },
  });
  if (!category) throw new NotFoundError('Categoría');
  const hidden = await prisma.hiddenCategory.findUnique({
    where: { userId_categoryId: { userId, categoryId } },
    select: { categoryId: true },
  });
  if (hidden) throw new NotFoundError('Categoría');
  if (category.type !== 'EXPENSE') {
    throw new ValidationError('Los presupuestos solo aplican a categorías de gasto');
  }
  return category;
}

async function findOwnedBudget(userId, budgetId) {
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
    include: budgetInclude,
  });
  if (!budget) throw new NotFoundError('Presupuesto');
  return budget;
}

export async function listBudgets(userId, query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const where = { userId };
  if (query.period) where.period = query.period;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

  const [total, data] = await Promise.all([
    prisma.budget.count({ where }),
    prisma.budget.findMany({
      where,
      include: budgetInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return { data, meta: { total, page, limit } };
}

export async function createBudget(userId, data) {
  await assertExpenseCategory(userId, data.categoryId);

  const duplicate = await prisma.budget.findFirst({
    where: {
      userId,
      categoryId: data.categoryId,
      period: data.period,
      isActive: true,
    },
  });

  if (duplicate) {
    throw new ConflictError('Ya existe un presupuesto activo para esa categoría y periodo');
  }

  const startDate = toDateOnly(data.startDate) || periodRange(data.period).startDate;
  const endDate = data.endDate ? toDateOnly(data.endDate) : null;

  return prisma.budget.create({
    data: {
      userId,
      categoryId: data.categoryId,
      amountLimit: data.amountLimit,
      period: data.period,
      startDate,
      endDate,
      alertThreshold: data.alertThreshold ?? 0.8,
      isActive: data.isActive ?? true,
    },
    include: budgetInclude,
  });
}

export async function updateBudget(userId, budgetId, data) {
  const existing = await findOwnedBudget(userId, budgetId);

  if (data.categoryId && data.categoryId !== existing.categoryId) {
    await assertExpenseCategory(userId, data.categoryId);
  }

  const targetCategoryId = data.categoryId ?? existing.categoryId;
  const targetPeriod = data.period ?? existing.period;
  const targetActive = data.isActive ?? existing.isActive;

  if (targetActive && (data.categoryId !== undefined || data.period !== undefined || data.isActive === true)) {
    const duplicate = await prisma.budget.findFirst({
      where: {
        id: { not: budgetId },
        userId,
        categoryId: targetCategoryId,
        period: targetPeriod,
        isActive: true,
      },
    });

    if (duplicate) {
      throw new ConflictError('Ya existe un presupuesto activo para esa categoría y periodo');
    }
  }

  const payload = { ...data };
  if (data.startDate !== undefined) payload.startDate = toDateOnly(data.startDate);
  if (data.endDate !== undefined) payload.endDate = data.endDate ? toDateOnly(data.endDate) : null;

  return prisma.budget.update({
    where: { id: budgetId },
    data: payload,
    include: budgetInclude,
  });
}

export async function deleteBudget(userId, budgetId) {
  await findOwnedBudget(userId, budgetId);
  await prisma.budget.delete({ where: { id: budgetId } });
  return { deleted: true };
}

export async function getBudgetsStatus(userId, referenceDate = todayLima()) {
  const budgets = await prisma.budget.findMany({
    where: { userId, isActive: true },
    include: budgetInclude,
    orderBy: { createdAt: 'desc' },
  });

  const results = [];

  for (const budget of budgets) {
    const range = budget.startDate && budget.endDate
      ? { startDate: budget.startDate, endDate: budget.endDate }
      : periodRange(budget.period, referenceDate, budget.startDate);

    const childCategories = await prisma.category.findMany({
      where: {
        parentId: budget.categoryId,
        OR: [{ isSystem: true }, { userId }],
      },
      select: { id: true },
    });

    const categoryIds = [budget.categoryId, ...childCategories.map((category) => category.id)];

    const aggregate = await prisma.transaction.aggregate({
      where: {
        account: { userId },
        categoryId: { in: categoryIds },
        type: 'EXPENSE',
        transactionDate: { gte: range.startDate, lte: range.endDate },
      },
      _sum: { amount: true },
    });

    const limit = Number(budget.amountLimit);
    const spent = roundMoney(Number(aggregate._sum.amount || 0));
    const remaining = roundMoney(limit - spent);
    const percentage = limit > 0 ? spent / limit : 0;
    const threshold = Number(budget.alertThreshold);

    let status = 'ok';
    if (percentage >= 1) status = 'exceeded';
    else if (percentage >= threshold) status = 'warning';

    results.push({
      id: budget.id,
      categoryId: budget.categoryId,
      category: budget.category,
      amountLimit: limit,
      period: budget.period,
      alertThreshold: threshold,
      isActive: budget.isActive,
      startDate: range.startDate,
      endDate: range.endDate,
      spent,
      remaining,
      percentage: Math.round(percentage * 10000) / 100,
      status,
      alert: status !== 'ok',
    });
  }

  return results;
}
