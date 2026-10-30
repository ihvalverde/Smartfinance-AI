import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../stores/theme.store.js';
import { classNames } from '../../lib/utils.js';

export default function ThemeToggle({ className = '', showLabel = false, onDark = false }) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className={classNames(
        'inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-medium transition focus:outline-none focus-visible:ring-4',
        onDark
          ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white focus-visible:ring-white/20'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:ring-slate-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
        showLabel ? 'h-10 px-3.5' : 'h-9 w-9',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {showLabel && <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>}
    </button>
  );
}
