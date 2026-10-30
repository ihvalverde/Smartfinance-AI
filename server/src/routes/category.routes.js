import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate, validateParams } from '../middlewares/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator.js';
import { asyncHandler } from '../utils/helpers.js';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(categoryController.index));
router.get('/tree', asyncHandler(categoryController.tree));
router.get('/hidden-count', asyncHandler(categoryController.hiddenCount));
router.post('/restore-hidden', asyncHandler(categoryController.restoreHidden));
router.post('/', validate(createCategorySchema), asyncHandler(categoryController.create));
router.get('/:id', validateParams(idParamSchema), asyncHandler(categoryController.show));
router.patch('/:id', validateParams(idParamSchema), validate(updateCategorySchema), asyncHandler(categoryController.update));
router.delete('/:id', validateParams(idParamSchema), asyncHandler(categoryController.destroy));

export default router;
