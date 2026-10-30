import { forwardRef } from 'react';
import { classNames } from '../../lib/utils.js';

const Select = forwardRef(function Select(
  { label, error, hint, className = '', children, id, ...props },
  ref,
) {
  const selectId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label className="label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={classNames('input appearance-none pr-9', error && 'input-error', className)}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
});

export default Select;
