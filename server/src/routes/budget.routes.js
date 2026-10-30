import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  budgetQuerySchema,
  createBudgetSchema,
  updateBudgetSchema,
} from '../validators/budget.validator.js';
import { asyncHandler } from '../utils/helpers.js';
import * as budgetController from '../controllers/budget.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(budgetQuerySchema), asyncHandler(budgetController.index));
router.get('/status', asyncHandler(budgetController.status));
router.post('/', validate(createBudgetSchema), asyncHandler(budgetController.create));
router.patch('/:id', validateParams(idParamSchema), validate(updateBudgetSchema), asyncHandler(budgetController.update));
router.delete('/:id', validateParams(idParamSchema), asyncHandler(budgetController.destroy));

export default router;
