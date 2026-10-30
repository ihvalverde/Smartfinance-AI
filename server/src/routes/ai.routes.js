import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate, validateParams } from '../middlewares/validate.middleware.js';
import { idParamSchema } from '../validators/common.validator.js';
import { categorizeSchema, chatMessageSchema } from '../validators/ai.validator.js';
import { aiCategorizeLimiter, aiChatLimiter } from '../middlewares/rateLimiter.middleware.js';
import { uploadReceipt } from '../middlewares/upload.middleware.js';
import { asyncHandler } from '../utils/helpers.js';
import * as aiController from '../controllers/ai.controller.js';

const router = Router();

router.use(authenticate);

router.get('/status', asyncHandler(aiController.status));
router.post('/categorize', aiCategorizeLimiter, validate(categorizeSchema), asyncHandler(aiController.categorize));
router.post('/scan-receipt', aiCategorizeLimiter, uploadReceipt.single('image'), asyncHandler(aiController.receipt));
router.get('/predictions', asyncHandler(aiController.predictions));

router.get('/chat/sessions', asyncHandler(aiController.chatSessions));
router.get('/chat/sessions/:id', validateParams(idParamSchema), asyncHandler(aiController.chatSession));
router.delete('/chat/sessions/:id', validateParams(idParamSchema), asyncHandler(aiController.removeChatSession));
router.post('/chat/messages', aiChatLimiter, validate(chatMessageSchema), asyncHandler(aiController.chatMessage));

export default router;
