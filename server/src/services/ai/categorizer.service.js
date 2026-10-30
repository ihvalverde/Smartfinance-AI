import prisma from '../../config/database.js';
import { getAiProvider } from './ai-provider.js';
import { addDays, toIsoDate, todayLima } from '../../utils/helpers.js';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const CATEGORY_KEYWORDS = [
  { keywords: ['supermercado', 'wong', 'metro', 'plaza vea', 'tottus', 'mercado', 'compras'], name: 'Supermercado' },
  { keywords: ['restaurante', 'almuerzo', 'cena', 'comida', 'menu', 'pollo', 'pizza'], name: 'Restaurantes' },
  { keywords: ['delivery', 'rappi', 'pedidosya', 'glovo'], name: 'Delivery' },
  { keywords: ['gasolina', 'grifo', 'primax', 'petroperu', 'combustible', 'diesel'], name: 'Gasolina' },
  { keywords: ['taxi', 'uber', 'didi', 'cabify'], name: 'Taxi/Uber' },
  { keywords: ['bus', 'pasaje', 'colectivo', 'transporte publico'], name: 'Transporte público' },
  { keywords: ['estacionamiento', 'parking'], name: 'Estacionamiento' },
  { keywords: ['netflix', 'spotify', 'disney', 'hbo', 'streaming', 'prime video'], name: 'Streaming' },
  { keywords: ['alquiler', 'renta', 'departamento', 'casa'], name: 'Alquiler/Hipoteca' },
  { keywords: ['luz', 'electricidad', 'recibo de luz'], name: 'Luz' },
  { keywords: ['agua', 'sedapal'], name: 'Agua' },
  { keywords: ['internet', 'wifi', 'fibra'], name: 'Internet' },
  { keywords: ['farmacia', 'medicina', 'pastillas'], name: 'Farmacia' },
  { keywords: ['medico', 'doctor', 'clinica', 'consulta'], name: 'Médico' },
  { keywords: ['gimnasio', 'gym'], name: 'Gimnasio' },
  { keywords: ['curso', 'capacitacion', 'certificacion'], name: 'Cursos' },
  { keywords: ['universidad', 'matricula', 'pension'], name: 'Universidad' },
  { keywords: ['libro', 'libros'], name: 'Libros' },
  { keywords: ['ropa', 'camisa', 'pantalon', 'vestido'], name: 'Vestimenta' },
  { keywords: ['zapatos', 'zapatillas', 'calzado'], name: 'Calzado' },
  { keywords: ['celular', 'laptop', 'computadora', 'monitor', 'tablet'], name: 'Dispositivos' },
  { keywords: ['sueldo', 'salario', 'planilla', 'nomina'], name: 'Salario' },
  { keywords: ['freelance', 'cliente', 'proyecto web', 'consultoria'], name: 'Freelance' },
  { keywords: ['venta', 'negocio', 'tienda'], name: 'Negocio propio' },
  { keywords: ['inversion', 'dividendo', 'interes'], name: 'Inversiones' },
  { keywords: ['regalo', 'regalaron'], name: 'Regalos recibidos' },
  { keywords: ['reembolso', 'devolucion'], name: 'Reembolsos' },
];

const INCOME_KEYWORDS = [
  'ingrese', 'ingreso', 'cobre', 'recibi', 'gane', 'me pagaron', 'sueldo', 'salario',
  'freelance', 'venta', 'reembolso', 'devolucion', 'dividendo', 'regalo',
];

function detectType(text) {
  const normalized = normalize(text);
  const hasIncome = INCOME_KEYWORDS.some((keyword) => normalized.includes(keyword));
  return hasIncome ? 'INCOME' : 'EXPENSE';
}

function parseAmount(text) {
  const matches = String(text).match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g);
  if (!matches) return null;

  for (const raw of matches) {
    let cleaned = raw;
    const hasThousandSeparator = /^\d{1,3}([.,]\d{3})+([.,]\d{1,2})?$/.test(raw);
    if (hasThousandSeparator) {
      const decimalMatch = raw.match(/[.,](\d{1,2})$/);
      const integerPart = decimalMatch ? raw.slice(0, raw.length - decimalMatch[0].length) : raw;
      cleaned = integerPart.replace(/[.,]/g, '') + (decimalMatch ? `.${decimalMatch[1]}` : '');
    } else {
      cleaned = raw.replace(',', '.');
    }
    const amount = Number(cleaned);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }

  return null;
}

function parseDate(text) {
  const normalized = normalize(text);
  const today = todayLima();

  if (normalized.includes('anteayer')) return toIsoDate(addDays(today, -2));
  if (normalized.includes('ayer')) return toIsoDate(addDays(today, -1));
  if (normalized.includes('hoy')) return toIsoDate(today);

  const relative = normalized.match(/hace\s+(\d+)\s+dias?/);
  if (relative) return toIsoDate(addDays(today, -Number(relative[1])));

  const iso = String(text).match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const dmy = String(text).match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${month}-${day}`;
  }

  return toIsoDate(today);
}

export async function getAvailableCategories(userId, type = null) {
  const [categories, hidden] = await Promise.all([
    prisma.category.findMany({
      where: {
        ...(type ? { type } : {}),
        OR: [{ isSystem: true }, { userId }],
      },
      select: { id: true, name: true, icon: true, color: true, type: true, parentId: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.hiddenCategory.findMany({
      where: { userId },
      select: { categoryId: true },
    }),
  ]);

  const hiddenIds = new Set(hidden.map((item) => item.categoryId));
  return categories.filter(
    (category) => !hiddenIds.has(category.id)
      && !(category.parentId && hiddenIds.has(category.parentId)),
  );
}

function resolveCategory(categories, { categoryId, categoryName, type }) {
  const pool = categories.filter((category) => category.type === type);

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

  return pool.find((category) => normalize(category.name).includes('otros'))
    || pool[0]
    || null;
}

function heuristicCategory(categories, text, type) {
  const normalized = normalize(text);
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      const match = categories.find(
        (category) => category.type === type && normalize(category.name) === normalize(rule.name),
      );
      if (match) return match;
    }
  }
  return resolveCategory(categories, { type, categoryName: null });
}

function cleanDescription(text, type) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return type === 'INCOME' ? 'Ingreso' : 'Gasto';
  return compact.length > 255 ? `${compact.slice(0, 252)}...` : compact;
}

export async function parseNaturalTransaction(userId, text) {
  const categories = await getAvailableCategories(userId);
  const provider = getAiProvider();

  const typeGuess = detectType(text);
  const amountGuess = parseAmount(text);
  const dateGuess = parseDate(text);
  const categoryGuess = heuristicCategory(categories, text, typeGuess);

  const fallback = {
    type: typeGuess,
    amount: amountGuess,
    description: cleanDescription(text, typeGuess),
    transactionDate: dateGuess,
    categoryId: categoryGuess?.id || null,
    confidence: amountGuess ? 0.55 : 0.3,
  };

  let result = fallback;

  if (provider.name !== 'mock') {
    const categoryList = categories
      .map((category) => `- ${category.id} | ${category.type} | ${category.name}`)
      .join('\n');

    try {
      const aiResult = await provider.generateJson({
        system:
          'Eres un asistente financiero para Perú. Extrae datos de una transacción desde lenguaje natural. ' +
          'Responde SOLO con JSON válido, sin markdown. La moneda es PEN (soles). ' +
          'type debe ser INCOME o EXPENSE. amount debe ser número positivo. transactionDate en formato YYYY-MM-DD.',
        prompt:
          `Texto: "${text}"\n\nCategorías disponibles (id | tipo | nombre):\n${categoryList}\n\n` +
          'Devuelve exactamente este JSON: {"type":"EXPENSE|INCOME","amount":number,"description":string,' +
          '"transactionDate":"YYYY-MM-DD","categoryId":string|null,"confidence":number}',
        maxOutputTokens: 400,
      });

      const type = aiResult.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const category = resolveCategory(categories, {
        categoryId: aiResult.categoryId,
        categoryName: aiResult.categoryName,
        type,
      });

      result = {
        type,
        amount: Number(aiResult.amount) > 0 ? Number(aiResult.amount) : amountGuess,
        description: cleanDescription(aiResult.description || text, type),
        transactionDate: aiResult.transactionDate || dateGuess,
        categoryId: category?.id || categoryGuess?.id || null,
        confidence: Math.min(Math.max(Number(aiResult.confidence) || 0.7, 0), 1),
      };
    } catch (error) {
      result = fallback;
    }
  }

  const category = categories.find((item) => item.id === result.categoryId) || null;

  return {
    ...result,
    category: category
      ? { id: category.id, name: category.name, icon: category.icon, color: category.color }
      : null,
    provider: provider.name,
    needsReview: !result.amount || result.amount <= 0,
  };
}
