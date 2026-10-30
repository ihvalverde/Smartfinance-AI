import { forwardRef } from 'react';
import { classNames } from '../../lib/utils.js';

const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = '', id, rows = 3, ...props },
  ref,
) {
  const textareaId = id || props.name;

  return (
    <div className="w-full">
      {label && (
        <label className="label" htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={classNames('input resize-none', error && 'input-error', className)}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
});

export default Textarea;
