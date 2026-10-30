export const mockProvider = {
  name: 'mock',
  model: 'mock-local',

  async generateJson({ fallback }) {
    return fallback;
  },

  async generateText({ fallback }) {
    return fallback;
  },
};
