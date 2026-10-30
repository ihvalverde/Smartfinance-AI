import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate, validateParams } from '../middlewares/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import { createAccountSchema, updateAccountSchema } from '../validators/account.validator.js';
import { asyncHandler } from '../utils/helpers.js';
import * as accountController from '../controllers/account.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(accountController.index));
router.get('/summary', asyncHandler(accountController.summary));
router.post('/', validate(createAccountSchema), asyncHandler(accountController.create));
router.get('/:id', validateParams(idParamSchema), asyncHandler(accountController.show));
router.patch('/:id', validateParams(idParamSchema), validate(updateAccountSchema), asyncHandler(accountController.update));
router.delete('/:id', validateParams(idParamSchema), asyncHandler(accountController.destroy));

export default router;
