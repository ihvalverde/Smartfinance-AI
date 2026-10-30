import prisma from '../../config/database.js';
import { roundMoney, toIsoDate, todayLima } from '../../utils/helpers.js';
import { getAiProvider } from './ai-provider.js';
import { getAvailableCategories } from './categorizer.service.js';

const HISTORY_MONTHS = 6;
const WEIGHTS = [0.2, 0.3, 0.5];

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  const formatted = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function coefficientOfVariation(values) {
  const average = mean(values);
  if (average === 0) return 1;
  const variance = mean(values.map((value) => (value - average) ** 2));
  return Math.sqrt(variance) / average;
}

function weightedForecast(series) {
  const firstIndex = series.findIndex((value) => value > 0);
  const trimmed = firstIndex === -1 ? [] : series.slice(firstIndex);
  const recent = trimmed.slice(-3);

  if (!recent.length) {
    return { predicted: 0, confidence: 0, monthsOfData: 0 };
  }

  const weights = WEIGHTS.slice(WEIGHTS.length - recent.length);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const predicted = recent.reduce(
    (sum, value, index) => sum + value * weights[index],
    0,
  ) / weightSum;

  const variation = coefficientOfVariation(recent);
  const confidence = Math.max(
    0.2,
    Math.min(0.95, (1 - variation) * Math.min(1, recent.length / 3)),
  );

  return {
    predicted: roundMoney(Math.max(predicted, 0)),
    confidence: Math.round(confidence * 100) / 100,
    monthsOfData: recent.length,
  };
}

export async function predictExpenses(userId, { months = HISTORY_MONTHS } = {}) {
  const historyMonths = Math.min(Math.max(Number(months) || HISTORY_MONTHS, 3), 12);
  const now = todayLima();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (historyMonths - 1), 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const monthKeys = [];
  for (let index = 0; index < historyMonths; index += 1) {
    monthKeys.push(monthKey(new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + index, 1))));
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      account: { userId },
      type: 'EXPENSE',
      transactionDate: { gte: startDate, lte: endDate },
    },
    select: { amount: true, categoryId: true, transactionDate: true },
  });

  const byMonth = new Map(monthKeys.map((key) => [key, new Map()]));
  const totalsByMonth = new Map(monthKeys.map((key) => [key, 0]));
  const uncategorizedByMonth = new Map(monthKeys.map((key) => [key, 0]));
  const categoryIds = new Set();

  for (const transaction of transactions) {
    const key = toIsoDate(transaction.transactionDate).slice(0, 7);
    if (!byMonth.has(key)) continue;
    const amount = Number(transaction.amount);
    totalsByMonth.set(key, totalsByMonth.get(key) + amount);
    if (transaction.categoryId) {
      categoryIds.add(transaction.categoryId);
      const bucket = byMonth.get(key);
      bucket.set(transaction.categoryId, (bucket.get(transaction.categoryId) || 0) + amount);
    } else {
      uncategorizedByMonth.set(key, uncategorizedByMonth.get(key) + amount);
    }
  }

  const categories = categoryIds.size
    ? await prisma.category.findMany({
      where: { id: { in: [...categoryIds] } },
      select: { id: true, name: true, icon: true, color: true },
    })
    : [];
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  const byCategory = [];
  for (const [categoryId, category] of categoryMap.entries()) {
    const series = monthKeys.map((key) => byMonth.get(key).get(categoryId) || 0);
    const forecast = weightedForecast(series);
    if (forecast.predicted <= 0) continue;
    byCategory.push({
      categoryId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      predicted: forecast.predicted,
      confidence: forecast.confidence,
      monthsOfData: forecast.monthsOfData,
    });
  }

  const uncategorizedForecast = weightedForecast(
    monthKeys.map((key) => uncategorizedByMonth.get(key) || 0),
  );
  if (uncategorizedForecast.predicted > 0) {
    byCategory.push({
      categoryId: null,
      name: 'Sin categoría',
      icon: '🏷️',
      color: '#6B7280',
      predicted: uncategorizedForecast.predicted,
      confidence: uncategorizedForecast.confidence,
      monthsOfData: uncategorizedForecast.monthsOfData,
    });
  }

  byCategory.sort((a, b) => b.predicted - a.predicted);
  const predictedTotal = roundMoney(byCategory.reduce((sum, item) => sum + item.predicted, 0));

  for (const item of byCategory) {
    item.percentage = predictedTotal > 0
      ? roundMoney((item.predicted / predictedTotal) * 100)
      : 0;
  }

  const history = monthKeys.map((key) => ({
    month: key,
    total: roundMoney(totalsByMonth.get(key) || 0),
  }));

  const activeTotals = history.map((item) => item.total).filter((total) => total > 0);
  const variation = coefficientOfVariation(activeTotals);
  const confidence = activeTotals.length
    ? Math.round(
      Math.max(0.2, Math.min(0.92, (1 - variation) * (0.6 + 0.08 * activeTotals.length))) * 100,
    ) / 100
    : 0.2;

  const nextMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const nextMonth = monthKey(nextMonthDate);
  const nextMonthLabel = monthLabel(nextMonth);

  const top = byCategory[0];
  let advice = predictedTotal > 0
    ? `Para ${nextMonthLabel} se proyecta un gasto de S/ ${predictedTotal.toFixed(2)}.`
    : `Aún no hay suficientes gastos registrados para proyectar ${nextMonthLabel}.`;

  if (top) {
    advice += ` La categoría ${top.icon} ${top.name} concentraría S/ ${top.predicted.toFixed(2)} (${top.percentage}%), basado en un promedio ponderado de los últimos meses.`;
  }

  if (predictedTotal > 0 && activeTotals.length < 3) {
    advice += ' La confianza es baja porque hay pocos meses de historial; registra más movimientos para mejorar la predicción.';
  }

  const provider = getAiProvider();
  let narrative = advice;

  if (provider.name !== 'mock') {
    try {
      narrative = await provider.generateText({
        system:
          'Eres un asesor financiero para Perú. Explica predicciones de gasto en español claro y breve. ' +
          'No inventes cifras distintas a las entregadas. No prometas rendimientos. Usa viñetas simples.',
        prompt:
          `Datos de predicción de gastos para ${nextMonthLabel}:\n` +
          `- Gasto total proyectado: S/ ${predictedTotal}\n` +
          `- Confianza: ${Math.round(confidence * 100)}%\n` +
          `- Categorías: ${byCategory.map((item) => `${item.name}: S/ ${item.predicted}`).join('; ') || 'sin datos'}\n` +
          `- Historial mensual: ${history.map((item) => `${item.month}: S/ ${item.total}`).join('; ')}\n\n` +
          'Da un diagnóstico breve y 2 recomendaciones concretas para el próximo mes.',
        fallback: advice,
        maxOutputTokens: 500,
      });
    } catch {
      narrative = advice;
    }
  }

  return {
    nextMonth,
    nextMonthLabel,
    predictedTotal,
    currency: 'PEN',
    method: 'promedio_ponderado_movil',
    confidence,
    history,
    byCategory,
    advice: narrative,
    provider: provider.name,
    model: provider.model || null,
  };
}
