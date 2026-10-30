import prisma from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

async function hiddenCategoryIds(userId) {
  const hidden = await prisma.hiddenCategory.findMany({
    where: { userId },
    select: { categoryId: true },
  });
  return hidden.map((item) => item.categoryId);
}

async function hideCategoryForUser(userId, categoryId) {
  return prisma.hiddenCategory.upsert({
    where: { userId_categoryId: { userId, categoryId } },
    update: {},
    create: { userId, categoryId },
  });
}

export async function isCategoryHidden(userId, categoryId) {
  if (!categoryId) return false;
  const hidden = await prisma.hiddenCategory.findUnique({
    where: { userId_categoryId: { userId, categoryId } },
    select: { categoryId: true },
  });
  return Boolean(hidden);
}

export async function listCategories(userId, { type, includeSystem = true } = {}) {
  const ownership = includeSystem ? { OR: [{ isSystem: true }, { userId }] } : { userId };
  const hiddenIds = await hiddenCategoryIds(userId);
  const notHidden = hiddenIds.length ? { id: { notIn: hiddenIds } } : {};

  return prisma.category.findMany({
    where: {
      parentId: null,
      ...(type ? { type } : {}),
      ...ownership,
      ...notHidden,
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      children: {
        where: {
          ...(type ? { type } : {}),
          ...ownership,
          ...notHidden,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
  });
}

export async function getCategoryById(userId, categoryId) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [{ isSystem: true }, { userId }],
    },
  });
  if (!category || await isCategoryHidden(userId, categoryId)) {
    throw new NotFoundError('Categoría');
  }
  return category;
}

export async function createCategory(userId, data) {
  if (data.parentId) {
    const parent = await prisma.category.findFirst({
      where: {
        id: data.parentId,
        OR: [{ isSystem: true }, { userId }],
      },
    });
    if (!parent || await isCategoryHidden(userId, parent.id)) {
      throw new NotFoundError('Categoría padre');
    }
    if (parent.parentId) {
      throw new ValidationError('Solo se permiten dos niveles de categorías');
    }
    if (parent.type !== data.type) {
      throw new ValidationError('La subcategoría debe tener el mismo tipo que su categoría padre');
    }
  }

  return prisma.category.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      icon: data.icon || '📁',
      color: data.color || '#6B7280',
      parentId: data.parentId || null,
      sortOrder: data.sortOrder ?? 0,
      isSystem: false,
    },
  });
}

export async function updateCategory(userId, categoryId, data) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, isSystem: false },
  });
  if (!category || await isCategoryHidden(userId, categoryId)) {
    throw new NotFoundError('Categoría');
  }

  if (data.parentId) {
    if (data.parentId === categoryId) {
      throw new ValidationError('Una categoría no puede ser su propio padre');
    }
    const parent = await prisma.category.findFirst({
      where: {
        id: data.parentId,
        OR: [{ isSystem: true }, { userId }],
      },
    });
    if (!parent || await isCategoryHidden(userId, parent.id)) {
      throw new NotFoundError('Categoría padre');
    }
    if (parent.parentId) {
      throw new ValidationError('Solo se permiten dos niveles de categorías');
    }
    if (parent.type !== category.type) {
      throw new ValidationError('La subcategoría debe tener el mismo tipo que su categoría padre');
    }
  }

  return prisma.category.update({
    where: { id: categoryId },
    data,
  });
}

export async function deleteCategory(userId, categoryId) {
  const systemCategory = await prisma.category.findFirst({
    where: { id: categoryId, isSystem: true },
    select: { id: true },
  });

  if (systemCategory) {
    await hideCategoryForUser(userId, categoryId);
    return { deleted: true, hidden: true };
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, isSystem: false },
    include: {
      _count: {
        select: {
          transactions: true,
          children: true,
          budgets: true,
          aiCategorizations: true,
        },
      },
    },
  });

  if (!category) throw new NotFoundError('Categoría');

  const hasAssociations =
    category._count.transactions > 0
    || category._count.children > 0
    || category._count.budgets > 0
    || category._count.aiCategorizations > 0;

  if (hasAssociations) {
    await hideCategoryForUser(userId, categoryId);
    return { deleted: true, hidden: true };
  }

  await prisma.category.delete({ where: { id: categoryId } });
  return { deleted: true, hidden: false };
}

export async function countHiddenCategories(userId) {
  return prisma.hiddenCategory.count({ where: { userId } });
}

export async function restoreHiddenCategories(userId) {
  const result = await prisma.hiddenCategory.deleteMany({ where: { userId } });
  return { restored: result.count };
}

export async function getCategoryTree(userId, type) {
  return listCategories(userId, { type });
}
