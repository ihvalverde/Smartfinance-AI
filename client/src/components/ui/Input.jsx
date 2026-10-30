import { forwardRef } from 'react';
import { classNames } from '../../lib/utils.js';

const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, className = '', id, ...props },
  ref,
) {
  const inputId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        <input
          ref={ref}
          id={inputId}
          className={classNames('input', Icon && 'pl-10', error && 'input-error', className)}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
});

export default Input;
