import { config } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';

const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const FALLBACK_MODELS = ['gemini-3.1-flash-lite'];
const RETRYABLE_STATUSES = new Set([404, 408, 429, 500, 502, 503, 504]);

function getModels() {
  return [...new Set([config.ai.gemini.model, ...FALLBACK_MODELS].filter(Boolean))];
}

function getApiKey() {
  if (!config.ai.gemini.apiKey) {
    throw new AppError('El servicio de IA no está configurado (falta GEMINI_API_KEY)', 503, 'AI_NOT_CONFIGURED');
  }
  return config.ai.gemini.apiKey;
}

function stripCodeFences(text) {
  return String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseJson(text) {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new AppError('La IA devolvió una respuesta inválida', 502, 'AI_INVALID_RESPONSE');
  }
}

function extractText(interaction) {
  if (typeof interaction?.output_text === 'string' && interaction.output_text.trim()) {
    return interaction.output_text;
  }

  if (interaction?.outputs) {
    const outputs = Array.isArray(interaction.outputs) ? interaction.outputs : [interaction.outputs];
    const text = outputs
      .filter((part) => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');
    if (text) return text;
  }

  const steps = Array.isArray(interaction?.steps) ? interaction.steps : [];
  return steps
    .filter((step) => step?.type === 'model_output')
    .flatMap((step) => (Array.isArray(step.content) ? step.content : []))
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

function buildInput({ prompt, image, history = [] }) {
  if (history.length) {
    const steps = history.map((item) => ({
      type: item.role === 'ASSISTANT' ? 'model_output' : 'user_input',
      content: [{ type: 'text', text: item.content }],
    }));
    steps.push({ type: 'user_input', content: [{ type: 'text', text: prompt }] });
    return steps;
  }

  if (image?.data && image?.mimeType) {
    return [
      { type: 'text', text: prompt },
      { type: 'image', data: image.data, mime_type: image.mimeType },
    ];
  }

  return [{ type: 'text', text: prompt }];
}

async function requestInteraction(model, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(INTERACTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': getApiKey(),
      },
      body: JSON.stringify({ ...body, model, store: false }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const providerMessage = payload?.error?.message || `La IA respondió con estado ${response.status}`;
      const error = new AppError(
        'El servicio de IA no está disponible en este momento. Intenta de nuevo.',
        response.status === 429 ? 429 : 503,
        response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_UNAVAILABLE',
      );
      error.providerStatus = response.status;
      error.providerMessage = providerMessage;
      error.retryable = RETRYABLE_STATUSES.has(response.status);
      throw error;
    }

    const text = extractText(payload);
    if (!text) {
      throw new AppError('La IA devolvió una respuesta vacía', 502, 'AI_INVALID_RESPONSE');
    }
    return text;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new AppError('La IA tardó demasiado en responder. Intenta de nuevo.', 504, 'AI_TIMEOUT');
      timeoutError.retryable = true;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function runInteraction(body) {
  const models = getModels();
  let lastError = null;

  for (let index = 0; index < models.length; index += 1) {
    const isLast = index === models.length - 1;
    const timeoutMs = isLast ? config.ai.timeoutMs : Math.min(config.ai.timeoutMs, 6000);

    try {
      return await requestInteraction(models[index], body, timeoutMs);
    } catch (error) {
      lastError = error;
      if (isLast || !error.retryable) {
        throw error;
      }
    }
  }

  throw lastError;
}

export const geminiProvider = {
  name: 'gemini',
  model: config.ai.gemini.model,

  async generateJson({ system, prompt, image, maxOutputTokens = 1000, temperature = 0.2 }) {
    const text = await runInteraction({
      input: buildInput({ prompt, image }),
      ...(system ? { system_instruction: system } : {}),
      response_format: { type: 'text', mime_type: 'application/json' },
      generation_config: {
        temperature,
        max_output_tokens: maxOutputTokens,
        thinking_level: 'low',
      },
    });

    return parseJson(text);
  },

  async generateText({ system, prompt, history = [], maxOutputTokens = 1000, temperature = 0.4 }) {
    const text = await runInteraction({
      input: buildInput({ prompt, history }),
      ...(system ? { system_instruction: system } : {}),
      generation_config: {
        temperature,
        max_output_tokens: maxOutputTokens,
        thinking_level: 'low',
      },
    });

    return text.trim();
  },
};
