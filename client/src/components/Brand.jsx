import { Wallet } from 'lucide-react';
import { classNames } from '../lib/utils.js';

export default function Brand({ compact = false, light = false, className = '' }) {
  return (
    <div className={classNames('flex items-center gap-3', className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-900/20">
        <Wallet className="h-5 w-5 text-white" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className={classNames('text-base font-bold tracking-tight', light ? 'text-white' : 'text-slate-900')}>
            SmartFinance <span className="text-brand-500">AI</span>
          </p>
          <p className={classNames('text-[11px] font-medium', light ? 'text-slate-400' : 'text-slate-500')}>
            Finanzas personales inteligentes
          </p>
        </div>
      )}
    </div>
  );
}
