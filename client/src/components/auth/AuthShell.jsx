import { ScanLine, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import Brand from '../Brand.jsx';
import ThemeToggle from '../ui/ThemeToggle.jsx';

const FEATURES = [
  { icon: Sparkles, title: 'IA que entiende tus gastos', text: 'Registra “almuerzo 25 soles” y la IA categoriza por ti.' },
  { icon: ScanLine, title: 'Escanea tus boletas', text: 'Sube una foto y extrae comercio, total y categoría.' },
  { icon: TrendingUp, title: 'Predicciones y alertas', text: 'Proyecta tus gastos y evita exceder tus presupuestos.' },
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="relative hidden w-1/2 overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative p-10 xl:p-14">
          <Brand light />
          <h1 className="mt-16 max-w-md text-4xl font-bold leading-tight text-white xl:text-5xl">
            Tus finanzas, <span className="text-brand-400">bajo control</span> con inteligencia artificial.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
            SmartFinance AI organiza tus cuentas, gastos y presupuestos, y te ayuda a tomar mejores
            decisiones con proyecciones claras en soles.
          </p>

          <div className="mt-12 space-y-5">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brand-400">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative border-t border-white/10 p-10 xl:p-14">
          <div className="flex items-center gap-3 text-slate-400">
            <Wallet className="h-5 w-5 text-brand-400" />
            <p className="text-sm">Hecho para Perú · Moneda PEN · Zona horaria America/Lima</p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>

          <h2 className="pr-12 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
