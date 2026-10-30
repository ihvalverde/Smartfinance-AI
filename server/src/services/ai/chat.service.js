import prisma from '../../config/database.js';
import { NotFoundError } from '../../utils/errors.js';
import { toIsoDate } from '../../utils/helpers.js';
import { getAiProvider } from './ai-provider.js';
import { getBudgetsStatus } from '../budget.service.js';
import { getExpensesByCategory, getRecentTransactions, getSummary } from '../dashboard.service.js';

const TITLE_MAX_LENGTH = 60;
const HISTORY_LIMIT = 20;

async function buildFinancialContext(userId) {
  const [summary, expenses, budgets, recent] = await Promise.all([
    getSummary(userId),
    getExpensesByCategory(userId),
    getBudgetsStatus(userId),
    getRecentTransactions(userId, 8),
  ]);

  const topCategories = expenses.categories.slice(0, 5);
  const alerts = budgets.filter((budget) => budget.alert);

  const lines = [
    `Mes actual: ${summary.month}`,
    `Saldo total en cuentas: S/ ${summary.balance.toFixed(2)} (${summary.accountsCount} cuentas activas)`,
    `Ingresos del mes: S/ ${summary.income.toFixed(2)}`,
    `Gastos del mes: S/ ${summary.expenses.toFixed(2)}`,
    `Ahorro estimado: S/ ${summary.savings.toFixed(2)} (${summary.savingsRate}% de los ingresos)`,
    '',
    'Gastos por categoría:',
    topCategories.length
      ? topCategories
        .map((category) => `- ${category.icon} ${category.name}: S/ ${category.total.toFixed(2)} (${category.percentage}%)`)
        .join('\n')
      : '- Sin gastos registrados este mes',
    '',
    'Presupuestos con alerta:',
    alerts.length
      ? alerts
        .map((budget) => `- ${budget.category.icon} ${budget.category.name}: S/ ${budget.spent.toFixed(2)} de S/ ${budget.amountLimit.toFixed(2)} (${budget.percentage}%)`)
        .join('\n')
      : '- Ninguno',
    '',
    'Últimos movimientos:',
    recent.length
      ? recent
        .map((transaction) => `- ${toIsoDate(transaction.transactionDate)} | ${transaction.type} | S/ ${Number(transaction.amount).toFixed(2)} | ${transaction.description}`)
        .join('\n')
      : '- Sin movimientos recientes',
  ];

  return {
    text: lines.join('\n'),
    summary,
    expenses,
    budgets,
    recent,
  };
}

function buildFallbackReply(context) {
  const { summary, expenses, budgets } = context;

  if (summary.transactionCount === 0) {
    return 'Todavía no tienes movimientos este mes. Registra tus ingresos y gastos para que pueda darte un análisis útil. Si quieres, empieza agregando tu sueldo y tus gastos fijos.';
  }

  const top = expenses.categories[0];
  const alerts = budgets.filter((budget) => budget.alert);
  const lines = [
    `Este mes ingresaste S/ ${summary.income.toFixed(2)} y gastaste S/ ${summary.expenses.toFixed(2)}.`,
    `Tu ahorro estimado es S/ ${summary.savings.toFixed(2)} (${summary.savingsRate}% de tus ingresos).`,
  ];

  if (top) {
    lines.push(`Tu mayor categoría de gasto es ${top.icon} ${top.name} con S/ ${top.total.toFixed(2)} (${top.percentage}%).`);
  }

  if (alerts.length) {
    lines.push('Presupuestos en alerta:');
    for (const budget of alerts.slice(0, 3)) {
      lines.push(`- ${budget.category.icon} ${budget.category.name}: S/ ${budget.spent.toFixed(2)} de S/ ${budget.amountLimit.toFixed(2)}.`);
    }
  }

  if (summary.savings < 0) {
    lines.push('Estás gastando más de lo que ingresas. Revisa primero las categorías variables como delivery, entretenimiento y compras.');
  } else if (summary.savingsRate < 20 && summary.income > 0) {
    lines.push('Intenta acercarte a una tasa de ahorro del 20% recortando los gastos menos esenciales.');
  } else if (summary.income > 0) {
    lines.push('Mantén ese ritmo de ahorro y considera asignar parte del excedente a un fondo de emergencia.');
  }

  return lines.join('\n');
}

async function resolveSession(userId, sessionId, firstMessage) {
  if (sessionId) {
    const session = await prisma.aiChatSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundError('Conversación');
    return session;
  }

  const title = firstMessage.length > TITLE_MAX_LENGTH
    ? `${firstMessage.slice(0, TITLE_MAX_LENGTH - 3)}...`
    : firstMessage;

  return prisma.aiChatSession.create({
    data: { userId, title },
  });
}

export async function listSessions(userId) {
  return prisma.aiChatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { role: true, content: true, createdAt: true },
      },
      _count: { select: { messages: true } },
    },
  });
}

export async function getSession(userId, sessionId) {
  const session = await prisma.aiChatSession.findFirst({
    where: { id: sessionId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) throw new NotFoundError('Conversación');
  return session;
}

export async function deleteSession(userId, sessionId) {
  const session = await prisma.aiChatSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new NotFoundError('Conversación');
  await prisma.aiChatSession.delete({ where: { id: sessionId } });
  return { deleted: true };
}

export async function sendMessage(userId, { message, sessionId = null }) {
  const session = await resolveSession(userId, sessionId, message);

  const userMessage = await prisma.aiChatMessage.create({
    data: { sessionId: session.id, role: 'USER', content: message },
  });

  const context = await buildFinancialContext(userId);
  const provider = getAiProvider();
  const fallback = buildFallbackReply(context);

  const recentMessages = await prisma.aiChatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  });
  const history = recentMessages.reverse().slice(0, -1);

  let reply = fallback;
  if (provider.name !== 'mock') {
    try {
      reply = await provider.generateText({
        system:
          'Eres SmartFinance AI, un asesor financiero personal para usuarios de Perú. ' +
          'Responde en español, de forma clara, breve y práctica. Usa los datos reales del usuario que se te entregan; ' +
          'nunca inventes cifras, cuentas ni transacciones. No des asesoría de inversión garantizada ni información legal o tributaria definitiva. ' +
          'Si faltan datos, dilo y pide lo necesario. Usa como máximo 6 viñetas.\n\n' +
          `Datos financieros del usuario:\n${context.text}`,
        prompt: message,
        history,
        maxOutputTokens: 700,
        temperature: 0.4,
      });
    } catch {
      reply = fallback;
    }
  }

  const assistantMessage = await prisma.aiChatMessage.create({
    data: { sessionId: session.id, role: 'ASSISTANT', content: reply },
  });

  const shouldRename = !sessionId && session.title === 'Nueva conversación';
  const title = shouldRename
    ? (message.length > TITLE_MAX_LENGTH ? `${message.slice(0, TITLE_MAX_LENGTH - 3)}...` : message)
    : session.title;

  const updatedSession = await prisma.aiChatSession.update({
    where: { id: session.id },
    data: { title },
  });

  return {
    session: updatedSession,
    userMessage,
    assistantMessage,
  };
}

export async function createSession(userId, title = 'Nueva conversación') {
  return prisma.aiChatSession.create({
    data: { userId, title: title.slice(0, TITLE_MAX_LENGTH) },
  });
}
