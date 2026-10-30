import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import {
  createTransactionSchema,
  transactionQuerySchema,
  transferSchema,
  updateTransactionSchema,
} from '../validators/transaction.validator.js';
import { asyncHandler } from '../utils/helpers.js';
import * as transactionController from '../controllers/transaction.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(transactionQuerySchema), asyncHandler(transactionController.index));
router.post('/', validate(createTransactionSchema), asyncHandler(transactionController.create));
router.post('/transfer', validate(transferSchema), asyncHandler(transactionController.transfer));
router.get('/:id', validateParams(idParamSchema), asyncHandler(transactionController.show));
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validate(updateTransactionSchema),
  asyncHandler(transactionController.update),
);
router.delete('/:id', validateParams(idParamSchema), asyncHandler(transactionController.destroy));

export default router;
