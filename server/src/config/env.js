import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '../../..');

dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, 'server', '.env') });

const aiProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

const requiredVars = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

if (aiProvider !== 'mock') {
  requiredVars.push('GEMINI_API_KEY');
}

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`❌ Variable de entorno requerida: ${varName}`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  ai: {
    provider: aiProvider,
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    },
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '15000', 10),
  },
  client: {
    url: process.env.CLIENT_URL || 'http://localhost:5173',
  },
  cookies: {
    refreshName: 'sf_refresh_token',
    path: '/api/v1/auth',
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
};
