import { sendSuccess } from '../utils/response.js';
import {
  countHiddenCategories,
  createCategory,
  deleteCategory,
  getCategoryById,
  getCategoryTree,
  listCategories,
  restoreHiddenCategories,
  updateCategory,
} from '../services/category.service.js';

export async function index(req, res) {
  const categories = await listCategories(req.userId, {
    type: req.query.type,
    includeSystem: req.query.includeSystem !== 'false',
  });
  return sendSuccess(res, categories);
}

export async function tree(req, res) {
  const data = await getCategoryTree(req.userId, req.query.type);
  return sendSuccess(res, data);
}

export async function show(req, res) {
  const category = await getCategoryById(req.userId, req.params.id);
  return sendSuccess(res, category);
}

export async function create(req, res) {
  const category = await createCategory(req.userId, req.validatedData);
  return sendSuccess(res, category, 201);
}

export async function update(req, res) {
  const category = await updateCategory(req.userId, req.params.id, req.validatedData);
  return sendSuccess(res, category);
}

export async function destroy(req, res) {
  const result = await deleteCategory(req.userId, req.params.id);
  return sendSuccess(res, result);
}

export async function hiddenCount(req, res) {
  const count = await countHiddenCategories(req.userId);
  return sendSuccess(res, { count });
}

export async function restoreHidden(req, res) {
  const result = await restoreHiddenCategories(req.userId);
  return sendSuccess(res, result);
}
