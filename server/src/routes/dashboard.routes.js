import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../utils/helpers.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authenticate);

router.get('/summary', asyncHandler(dashboardController.summary));
router.get('/expenses-by-category', asyncHandler(dashboardController.expensesByCategory));
router.get('/trends', asyncHandler(dashboardController.trends));
router.get('/recent', asyncHandler(dashboardController.recent));
router.get('/diagnosis', asyncHandler(dashboardController.diagnosis));

export default router;
