import { toIsoDate, todayLima } from '../../utils/helpers.js';
import { getAiProvider } from './ai-provider.js';
import { getAvailableCategories } from './categorizer.service.js';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function resolveCategory(categories, { categoryId, categoryName }) {
  const pool = categories.filter((category) => category.type === 'EXPENSE');

  if (categoryId) {
    const byId = pool.find((category) => category.id === categoryId);
    if (byId) return byId;
  }

  if (categoryName) {
    const target = normalize(categoryName);
    const exact = pool.find((category) => normalize(category.name) === target);
    if (exact) return exact;
    const partial = pool.find(
      (category) => normalize(category.name).includes(target) || target.includes(normalize(category.name)),
    );
    if (partial) return partial;
  }

  return pool.find((category) => normalize(category.name).includes('otros')) || pool[0] || null;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      name: String(item?.name || item?.description || 'Item').slice(0, 120),
      amount: Number(item?.amount ?? item?.price ?? 0) || 0,
    }))
    .slice(0, 50);
}

export async function scanReceipt(userId, file) {
  if (!file?.buffer) {
    throw new Error('Archivo de imagen requerido');
  }

  const categories = await getAvailableCategories(userId, 'EXPENSE');
  const provider = getAiProvider();
  const fallbackCategory = resolveCategory(categories, { categoryName: 'Otros gastos' });

  const fallback = {
    merchant: 'Boleta',
    total: null,
    transactionDate: toIsoDate(todayLima()),
    categoryId: fallbackCategory?.id || null,
    items: [],
    confidence: 0.2,
  };

  let result = fallback;

  if (provider.name !== 'mock') {
    const categoryList = categories
      .map((category) => `- ${category.id} | ${category.name}`)
      .join('\n');

    try {
      const aiResult = await provider.generateJson({
        system:
          'Eres un asistente financiero peruano especializado en leer boletas y recibos. ' +
          'Extrae los datos visibles de la imagen. Responde SOLO con JSON válido, sin markdown. ' +
          'La moneda es PEN (soles). Si un dato no es legible, usa null.',
        prompt:
          'Analiza la imagen de esta boleta y devuelve exactamente este JSON: ' +
          '{"merchant":string,"total":number|null,"transactionDate":"YYYY-MM-DD",' +
          '"categoryId":string|null,"items":[{"name":string,"amount":number}],"confidence":number}\n\n' +
          `Categorías de gasto disponibles (id | nombre):\n${categoryList}`,
        image: {
          data: file.buffer.toString('base64'),
          mimeType: file.mimetype,
        },
        maxOutputTokens: 800,
      });

      result = {
        merchant: String(aiResult.merchant || 'Boleta').slice(0, 120),
        total: Number(aiResult.total) > 0 ? Number(aiResult.total) : null,
        transactionDate: aiResult.transactionDate || fallback.transactionDate,
        categoryId: aiResult.categoryId || fallback.categoryId,
        items: normalizeItems(aiResult.items),
        confidence: Math.min(Math.max(Number(aiResult.confidence) || 0.7, 0), 1),
      };
    } catch (error) {
      result = fallback;
    }
  }

  const category = resolveCategory(categories, {
    categoryId: result.categoryId,
    categoryName: result.categoryName,
  });

  return {
    merchant: result.merchant,
    total: result.total,
    transactionDate: result.transactionDate,
    categoryId: category?.id || null,
    category: category
      ? { id: category.id, name: category.name, icon: category.icon, color: category.color }
      : null,
    items: result.items,
    confidence: result.confidence,
    provider: provider.name,
    needsReview: !result.total,
  };
}
