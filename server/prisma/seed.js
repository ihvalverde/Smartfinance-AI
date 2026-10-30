import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { addDays, startOfLimaMonth, todayLima } from '../src/utils/helpers.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../../.env') });
dotenv.config({ path: path.resolve(currentDir, '../.env') });

const prisma = new PrismaClient();

const expenseCategories = [
  {
    name: 'Alimentación', type: 'EXPENSE', icon: '🍔', color: '#EF4444', sortOrder: 1,
    children: [
      { name: 'Supermercado', icon: '🛒', color: '#F87171' },
      { name: 'Restaurantes', icon: '🍽️', color: '#FB923C' },
      { name: 'Delivery', icon: '🛵', color: '#FBBF24' },
      { name: 'Mercado', icon: '🥬', color: '#A3E635' },
    ],
  },
  {
    name: 'Vivienda', type: 'EXPENSE', icon: '🏠', color: '#3B82F6', sortOrder: 2,
    children: [
      { name: 'Alquiler/Hipoteca', icon: '🏢', color: '#60A5FA' },
      { name: 'Agua', icon: '💧', color: '#38BDF8' },
      { name: 'Luz', icon: '💡', color: '#FACC15' },
      { name: 'Gas', icon: '🔥', color: '#FB923C' },
      { name: 'Internet', icon: '🌐', color: '#818CF8' },
      { name: 'Mantenimiento', icon: '🔧', color: '#94A3B8' },
    ],
  },
  {
    name: 'Transporte', type: 'EXPENSE', icon: '🚗', color: '#EAB308', sortOrder: 3,
    children: [
      { name: 'Gasolina', icon: '⛽', color: '#FACC15' },
      { name: 'Taxi/Uber', icon: '🚕', color: '#FDE047' },
      { name: 'Transporte público', icon: '🚌', color: '#A3E635' },
      { name: 'Estacionamiento', icon: '🅿️', color: '#94A3B8' },
      { name: 'Mantenimiento vehículo', icon: '🔧', color: '#FB923C' },
    ],
  },
  {
    name: 'Entretenimiento', type: 'EXPENSE', icon: '🎬', color: '#A855F7', sortOrder: 4,
    children: [
      { name: 'Streaming', icon: '📺', color: '#C084FC' },
      { name: 'Salidas', icon: '🎉', color: '#F472B6' },
      { name: 'Hobbies', icon: '🎨', color: '#FB923C' },
      { name: 'Suscripciones', icon: '🔄', color: '#818CF8' },
    ],
  },
  {
    name: 'Salud', type: 'EXPENSE', icon: '🏥', color: '#10B981', sortOrder: 5,
    children: [
      { name: 'Médico', icon: '👨‍⚕️', color: '#34D399' },
      { name: 'Farmacia', icon: '💊', color: '#6EE7B7' },
      { name: 'Seguro médico', icon: '🛡️', color: '#2DD4BF' },
      { name: 'Gimnasio', icon: '🏋️', color: '#A3E635' },
    ],
  },
  {
    name: 'Educación', type: 'EXPENSE', icon: '📚', color: '#06B6D4', sortOrder: 6,
    children: [
      { name: 'Cursos', icon: '🎓', color: '#22D3EE' },
      { name: 'Libros', icon: '📖', color: '#67E8F9' },
      { name: 'Universidad', icon: '🏛️', color: '#38BDF8' },
      { name: 'Materiales', icon: '✏️', color: '#94A3B8' },
    ],
  },
  {
    name: 'Ropa y Calzado', type: 'EXPENSE', icon: '👔', color: '#F43F5E', sortOrder: 7,
    children: [
      { name: 'Vestimenta', icon: '👕', color: '#FB7185' },
      { name: 'Calzado', icon: '👟', color: '#FDA4AF' },
      { name: 'Accesorios', icon: '👜', color: '#FECDD3' },
    ],
  },
  {
    name: 'Tecnología', type: 'EXPENSE', icon: '📱', color: '#8B5CF6', sortOrder: 8,
    children: [
      { name: 'Dispositivos', icon: '💻', color: '#A78BFA' },
      { name: 'Apps y software', icon: '📲', color: '#C4B5FD' },
      { name: 'Accesorios tech', icon: '🎧', color: '#DDD6FE' },
    ],
  },
  {
    name: 'Negocios', type: 'EXPENSE', icon: '💼', color: '#0EA5E9', sortOrder: 9,
    children: [
      { name: 'Insumos', icon: '📦', color: '#38BDF8' },
      { name: 'Marketing', icon: '📢', color: '#7DD3FC' },
      { name: 'Software empresarial', icon: '🖥️', color: '#BAE6FD' },
      { name: 'Contador', icon: '🧮', color: '#94A3B8' },
    ],
  },
  {
    name: 'Otros gastos', type: 'EXPENSE', icon: '🏷️', color: '#6B7280', sortOrder: 10,
    children: [],
  },
];

const incomeCategories = [
  { name: 'Salario', type: 'INCOME', icon: '💰', color: '#10B981', sortOrder: 1 },
  { name: 'Freelance', type: 'INCOME', icon: '💼', color: '#059669', sortOrder: 2 },
  { name: 'Negocio propio', type: 'INCOME', icon: '🏪', color: '#047857', sortOrder: 3 },
  { name: 'Inversiones', type: 'INCOME', icon: '📈', color: '#0D9488', sortOrder: 4 },
  { name: 'Regalos recibidos', type: 'INCOME', icon: '🎁', color: '#F59E0B', sortOrder: 5 },
  { name: 'Reembolsos', type: 'INCOME', icon: '🔄', color: '#6366F1', sortOrder: 6 },
  { name: 'Otros ingresos', type: 'INCOME', icon: '📦', color: '#6B7280', sortOrder: 7 },
];

async function findOrCreateSystemCategory(data, parentId = null) {
  const existing = await prisma.category.findFirst({
    where: { name: data.name, type: data.type, userId: null, parentId },
  });
  if (existing) return existing;

  return prisma.category.create({
    data: {
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
      isSystem: true,
      sortOrder: data.sortOrder ?? 0,
      userId: null,
      parentId,
    },
  });
}

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  for (const cat of expenseCategories) {
    const parent = await findOrCreateSystemCategory(cat);
    console.log(`  ✅ Categoría: ${cat.icon} ${cat.name}`);
    for (const child of cat.children) {
      await findOrCreateSystemCategory({ ...child, type: 'EXPENSE', sortOrder: 0 }, parent.id);
    }
  }

  for (const cat of incomeCategories) {
    await findOrCreateSystemCategory(cat);
    console.log(`  ✅ Categoría: ${cat.icon} ${cat.name}`);
  }

  const hashedPassword = await bcrypt.hash('Demo1234!', 12);

  await prisma.user.deleteMany({ where: { email: 'carlos@demo.com' } });

  const demoUser = await prisma.user.create({
    data: {
      email: 'carlos@demo.com',
      passwordHash: hashedPassword,
      fullName: 'Carlos Méndez',
      preferredCurrency: 'PEN',
      timezone: 'America/Lima',
    },
  });
  console.log('  👤 Usuario demo: carlos@demo.com / Demo1234!');

  const accountBCP = await prisma.account.create({
    data: {
      userId: demoUser.id,
      name: 'Cuenta BCP',
      type: 'CHECKING',
      balance: 8500.0,
      currency: 'PEN',
      color: '#3B82F6',
      icon: 'building',
    },
  });

  const accountCash = await prisma.account.create({
    data: {
      userId: demoUser.id,
      name: 'Efectivo',
      type: 'CASH',
      balance: 450.0,
      currency: 'PEN',
      color: '#10B981',
      icon: 'banknote',
    },
  });

  const accountCard = await prisma.account.create({
    data: {
      userId: demoUser.id,
      name: 'Tarjeta BCP',
      type: 'CREDIT_CARD',
      balance: -3500.0,
      currency: 'PEN',
      color: '#8B5CF6',
      icon: 'credit-card',
    },
  });
  console.log('  🏦 Cuentas demo creadas (BCP, Efectivo, Tarjeta)');

  const budgetCategoryNames = ['Alimentación', 'Vivienda', 'Transporte', 'Entretenimiento'];
  const budgetCategories = await prisma.category.findMany({
    where: {
      userId: null,
      parentId: null,
      type: 'EXPENSE',
      name: { in: budgetCategoryNames },
    },
    select: { id: true, name: true },
  });
  const budgetCategoryByName = new Map(
    budgetCategories.map((category) => [category.name, category.id]),
  );
  const budgetAmounts = [
    { name: 'Alimentación', amountLimit: 600 },
    { name: 'Vivienda', amountLimit: 1000 },
    { name: 'Transporte', amountLimit: 300 },
    { name: 'Entretenimiento', amountLimit: 60 },
  ];
  const budgetData = budgetAmounts
    .filter((budget) => budgetCategoryByName.has(budget.name))
    .map((budget) => ({
      userId: demoUser.id,
      categoryId: budgetCategoryByName.get(budget.name),
      amountLimit: budget.amountLimit,
      period: 'MONTHLY',
      startDate: startOfLimaMonth(),
      alertThreshold: 0.8,
      isActive: true,
    }));

  await prisma.budget.createMany({ data: budgetData });
  console.log(`  📊 ${budgetData.length} presupuestos demo creados`);

  const catAlimentacion = await prisma.category.findFirst({ where: { name: 'Supermercado', isSystem: true } });
  const catTransporte = await prisma.category.findFirst({ where: { name: 'Gasolina', isSystem: true } });
  const catVivienda = await prisma.category.findFirst({ where: { name: 'Alquiler/Hipoteca', isSystem: true } });
  const catStreaming = await prisma.category.findFirst({ where: { name: 'Streaming', isSystem: true } });
  const catSalario = await prisma.category.findFirst({ where: { name: 'Salario', isSystem: true } });
  const catFreelance = await prisma.category.findFirst({ where: { name: 'Freelance', isSystem: true } });

  const today = todayLima();
  const dayOfMonth = (day) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), day));

  const transactions = [
    {
      accountId: accountCard.id, categoryId: catAlimentacion?.id,
      type: 'EXPENSE', amount: 150.0, description: 'Supermercado Wong',
      transactionDate: today, currency: 'PEN',
    },
    {
      accountId: accountCash.id, categoryId: catTransporte?.id,
      type: 'EXPENSE', amount: 45.0, description: 'Gasolina Primax',
      transactionDate: today, currency: 'PEN',
    },
    {
      accountId: accountBCP.id, categoryId: catVivienda?.id,
      type: 'EXPENSE', amount: 850.0, description: 'Alquiler departamento',
      transactionDate: dayOfMonth(25),
      isRecurring: true, recurringPattern: 'monthly', currency: 'PEN',
    },
    {
      accountId: accountCard.id, categoryId: catStreaming?.id,
      type: 'EXPENSE', amount: 52.9, description: 'Netflix Premium',
      transactionDate: dayOfMonth(24),
      isRecurring: true, recurringPattern: 'monthly', currency: 'PEN',
    },
    {
      accountId: accountBCP.id, categoryId: catSalario?.id,
      type: 'INCOME', amount: 5200.0, description: 'Salario mensual',
      transactionDate: dayOfMonth(1),
      isRecurring: true, recurringPattern: 'monthly', currency: 'PEN',
    },
    {
      accountId: accountBCP.id, categoryId: catFreelance?.id,
      type: 'INCOME', amount: 2500.0, description: 'Proyecto web freelance',
      transactionDate: addDays(today, -1),
      currency: 'PEN',
    },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({ data: tx });
  }
  console.log(`  💳 ${transactions.length} transacciones demo creadas`);

  console.log('\n✅ Seed completado exitosamente!');
  console.log('   Login demo: carlos@demo.com / Demo1234!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
