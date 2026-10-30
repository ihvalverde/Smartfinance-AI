import multer from 'multer';
import { AI_CONFIG } from '../config/constants.js';
import { ValidationError } from '../utils/errors.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (AI_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Formato de imagen no soportado. Usa JPG, PNG o WEBP.'), false);
  }
};

export const uploadReceipt = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: AI_CONFIG.MAX_RECEIPT_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});
