import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { parsePagination, roundMoney, toDateOnly, todayLima } from '../utils/helpers.js';

const transactionInclude = {
  account: { select: { id: true, name: true, type: true, color: true, icon: true } },
  category: { select: { id: true, name: true, icon: true, color: true, type: true } },
};

function signedDelta(type, amount) {
  const value = Number(amount);
  return type === 'INCOME' ? value : -value;
}

function transferDelta(transaction) {
  const direction = transaction.metadata?.transferDirection;
  const value = Number(transaction.amount);
  if (direction === 'IN') return value;
  return -value;
}

async function applyBalance(tx, accountId, delta) {
  const rounded = roundMoney(delta);
  if (rounded === 0) return;
  const result = await tx.account.updateMany({
    where: { id: accountId },
    data: { balance: { increment: new Prisma.Decimal(rounded) } },
  });
  if (result.count === 0) throw new NotFoundError('Cuenta');
}

async function findOwnedTransaction(userId, transactionId) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, account: { userId } },
    include: { ...transactionInclude, aiCategorization: true },
  });
  if (!transaction) throw new NotFoundError('Transacción');
  return transaction;
}

async function assertAccount(userId, accountId) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId, isActive: true },
  });
  if (!account) throw new NotFoundError('Cuenta');
  return account;
}

async function assertCategory(userId, categoryId, type) {
  if (!categoryId) return null;
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
  if (category.type !== type) {
    throw new ValidationError('La categoría no corresponde al tipo de transacción');
  }
  return category;
}

export async function listTransactions(userId, query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const where = { account: { userId } };

  if (query.type) where.type = query.type;
  if (query.accountId) where.accountId = query.accountId;
  if (query.categoryId) where.categoryId = query.categoryId;

  if (query.startDate || query.endDate) {
    where.transactionDate = {};
    if (query.startDate) where.transactionDate.gte = toDateOnly(query.startDate);
    if (query.endDate) where.transactionDate.lte = toDateOnly(query.endDate);
  }

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    where.amount = {};
    if (query.minAmount !== undefined) where.amount.gte = query.minAmount;
    if (query.maxAmount !== undefined) where.amount.lte = query.maxAmount;
  }

  if (query.search) {
    where.description = { contains: query.search, mode: 'insensitive' };
  }

  const [total, data] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
  ]);

  return { data, meta: { total, page, limit } };
}

export async function getTransactionById(userId, transactionId) {
  return findOwnedTransaction(userId, transactionId);
}

export async function createTransaction(userId, data, aiMeta = null) {
  const account = await assertAccount(userId, data.accountId);
  await assertCategory(userId, data.categoryId, data.type);

  const transactionDate = toDateOnly(data.transactionDate) || todayLima();
  const delta = signedDelta(data.type, data.amount);

  const created = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        accountId: account.id,
        categoryId: data.categoryId || null,
        type: data.type,
        amount: new Prisma.Decimal(roundMoney(data.amount)),
        currency: data.currency || 'PEN',
        description: data.description,
        notes: data.notes || null,
        transactionDate,
        isRecurring: Boolean(data.isRecurring),
        recurringPattern: data.recurringPattern || null,
        metadata: data.metadata || {},
      },
    });

    await applyBalance(tx, account.id, delta);

    if (aiMeta?.suggestedCategoryId) {
      await tx.aiCategorization.create({
        data: {
          transactionId: transaction.id,
          suggestedCategoryId: aiMeta.suggestedCategoryId,
          confidenceScore: new Prisma.Decimal(
            Math.min(Math.max(Number(aiMeta.confidenceScore) || 0, 0), 1).toFixed(2),
          ),
          modelUsed: aiMeta.modelUsed || 'gemini',
          inputType: aiMeta.inputType || 'text',
          rawResponse: aiMeta.rawResponse || undefined,
          wasAccepted: true,
        },
      });
    }

    return transaction;
  });

  return prisma.transaction.findUnique({
    where: { id: created.id },
    include: { ...transactionInclude, aiCategorization: true },
  });
}

export async function updateTransaction(userId, transactionId, data) {
  const existing = await findOwnedTransaction(userId, transactionId);

  if (existing.type === 'TRANSFER') {
    throw new ValidationError('Las transferencias no se pueden editar. Elimínalas y créalas de nuevo.');
  }

  const newAccountId = data.accountId || existing.accountId;
  const newType = data.type || existing.type;
  const newAmount = data.amount !== undefined ? Number(data.amount) : Number(existing.amount);
  const newCategoryId = data.categoryId === undefined ? existing.categoryId : data.categoryId;

  const newAccount = await assertAccount(userId, newAccountId);
  await assertCategory(userId, newCategoryId, newType);

  const oldDelta = signedDelta(existing.type, existing.amount);
  const newDelta = signedDelta(newType, newAmount);
  const transactionDate = data.transactionDate
    ? toDateOnly(data.transactionDate)
    : existing.transactionDate;

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: existing.id },
      data: {
        accountId: newAccount.id,
        categoryId: newCategoryId || null,
        type: newType,
        amount: new Prisma.Decimal(roundMoney(newAmount)),
        currency: data.currency || existing.currency,
        description: data.description !== undefined ? data.description : existing.description,
        notes: data.notes !== undefined ? data.notes : existing.notes,
        transactionDate,
        isRecurring: data.isRecurring !== undefined ? data.isRecurring : existing.isRecurring,
        recurringPattern: data.recurringPattern !== undefined
          ? data.recurringPattern
          : existing.recurringPattern,
        metadata: data.metadata !== undefined ? data.metadata : existing.metadata,
      },
    });

    if (existing.accountId === newAccount.id) {
      await applyBalance(tx, existing.accountId, newDelta - oldDelta);
    } else {
      await applyBalance(tx, existing.accountId, -oldDelta);
      await applyBalance(tx, newAccount.id, newDelta);
    }
  });

  return findOwnedTransaction(userId, transactionId);
}

export async function deleteTransaction(userId, transactionId) {
  const existing = await findOwnedTransaction(userId, transactionId);

  if (existing.type === 'TRANSFER' && existing.transferPairId) {
    const pair = await prisma.transaction.findFirst({
      where: { transferPairId: existing.transferPairId, id: { not: existing.id } },
    });

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: { id: { in: [existing.id, ...(pair ? [pair.id] : [])] }, account: { userId } },
      });
      await applyBalance(tx, existing.accountId, -transferDelta(existing));
      if (pair) {
        await applyBalance(tx, pair.accountId, -transferDelta(pair));
      }
    });

    return { deleted: pair ? 2 : 1, transfer: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { id: existing.id } });
    await applyBalance(tx, existing.accountId, -signedDelta(existing.type, existing.amount));
  });

  return { deleted: 1, transfer: false };
}

export async function createTransfer(userId, data) {
  const fromAccount = await assertAccount(userId, data.fromAccountId);
  const toAccount = await assertAccount(userId, data.toAccountId);

  if (fromAccount.id === toAccount.id) {
    throw new ValidationError('Las cuentas de origen y destino deben ser diferentes');
  }

  const amount = roundMoney(data.amount);
  const transactionDate = toDateOnly(data.transactionDate) || todayLima();
  const transferPairId = crypto.randomUUID();
  const description = data.description || `Transferencia de ${fromAccount.name} a ${toAccount.name}`;

  const result = await prisma.$transaction(async (tx) => {
    const outTransaction = await tx.transaction.create({
      data: {
        accountId: fromAccount.id,
        type: 'TRANSFER',
        amount: new Prisma.Decimal(amount),
        currency: fromAccount.currency,
        description,
        notes: data.notes || null,
        transactionDate,
        transferPairId,
        metadata: {
          transferDirection: 'OUT',
          counterpartAccountId: toAccount.id,
          counterpartAccountName: toAccount.name,
        },
      },
      include: transactionInclude,
    });

    const inTransaction = await tx.transaction.create({
      data: {
        accountId: toAccount.id,
        type: 'TRANSFER',
        amount: new Prisma.Decimal(amount),
        currency: toAccount.currency,
        description,
        notes: data.notes || null,
        transactionDate,
        transferPairId,
        metadata: {
          transferDirection: 'IN',
          counterpartAccountId: fromAccount.id,
          counterpartAccountName: fromAccount.name,
        },
      },
      include: transactionInclude,
    });

    await applyBalance(tx, fromAccount.id, -amount);
    await applyBalance(tx, toAccount.id, amount);

    return { out: outTransaction, in: inTransaction, transferPairId };
  });

  return result;
}
