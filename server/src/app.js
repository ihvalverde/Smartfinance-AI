import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { generalLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = config.client.url
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (!config.isProduction) {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'smartfinance-ai',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1', generalLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

const isVercel = Boolean(process.env.VERCEL);

if (!isVercel) {
  app.listen(config.port, () => {
    console.log(`SmartFinance AI API escuchando en http://localhost:${config.port}`);
    console.log(`Entorno: ${config.nodeEnv} | IA: ${config.ai.provider} | Modelo: ${config.ai.gemini.model}`);
  });
}

export default app;
