import prisma from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

export async function listAccounts(userId, { includeInactive = false } = {}) {
  return prisma.account.findMany({
    where: {
      userId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getAccountById(userId, accountId) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new NotFoundError('Cuenta');
  return account;
}

export async function createAccount(userId, data) {
  return prisma.account.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      balance: data.balance ?? 0,
      currency: data.currency || 'PEN',
      color: data.color || '#3B82F6',
      icon: data.icon || 'wallet',
    },
  });
}

export async function updateAccount(userId, accountId, data) {
  await getAccountById(userId, accountId);

  const updated = await prisma.account.updateMany({
    where: { id: accountId, userId },
    data,
  });

  if (updated.count === 0) throw new NotFoundError('Cuenta');
  return getAccountById(userId, accountId);
}

export async function deactivateAccount(userId, accountId) {
  await getAccountById(userId, accountId);

  await prisma.account.updateMany({
    where: { id: accountId, userId },
    data: { isActive: false },
  });

  const pendingTransactions = await prisma.transaction.count({
    where: { accountId },
  });

  if (pendingTransactions === 0) {
    await prisma.account.deleteMany({ where: { id: accountId, userId } });
    return { deleted: true, deactivated: false };
  }

  return { deleted: false, deactivated: true };
}

export async function getAccountsSummary(userId) {
  const accounts = await listAccounts(userId);
  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.balance),
    0,
  );

  const byType = accounts.reduce((acc, account) => {
    const key = account.type;
    if (!acc[key]) acc[key] = { count: 0, balance: 0 };
    acc[key].count += 1;
    acc[key].balance += Number(account.balance);
    return acc;
  }, {});

  return {
    totalBalance: Math.round(totalBalance * 100) / 100,
    accountsCount: accounts.length,
    byType,
  };
}
