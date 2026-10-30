import { create } from 'zustand';

const STORAGE_KEY = 'sf_theme';

function getInitialTheme() {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#020617' : '#022c22');
  localStorage.setItem(STORAGE_KEY, theme);
}

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),

  initTheme() {
    applyTheme(get().theme);
  },

  setTheme(theme) {
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme() {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
}));
