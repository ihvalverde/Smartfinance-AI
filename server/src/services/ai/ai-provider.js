import { config } from '../../config/env.js';
import { geminiProvider } from './gemini.provider.js';
import { mockProvider } from './mock.provider.js';

let cachedProvider = null;

export function getAiProvider() {
  if (cachedProvider) return cachedProvider;

  if (config.ai.provider === 'mock') {
    cachedProvider = mockProvider;
  } else {
    cachedProvider = geminiProvider;
  }

  return cachedProvider;
}

export function isAiEnabled() {
  return config.ai.provider !== 'mock';
}
