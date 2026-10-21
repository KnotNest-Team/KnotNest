import { forwardRef } from 'react';

const Wrap = ({ label, error, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    {label && <span className="kn-label">{label}</span>}
    {children}
    {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    {error && <span className="mt-1 block text-xs text-red-600" role="alert">{error}</span>}
  </label>
);

export const Input = forwardRef(function Input({ label, error, hint, className, wrapClass, ...rest }, ref) {
  return <Wrap label={label} error={error} hint={hint} className={wrapClass}><input ref={ref} className={`kn-input ${error ? 'border-red-400' : ''} ${className || ''}`} {...rest} /></Wrap>;
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, rows = 4, className, wrapClass, ...rest }, ref) {
  return <Wrap label={label} error={error} hint={hint} className={wrapClass}><textarea ref={ref} rows={rows} className={`kn-input resize-y ${error ? 'border-red-400' : ''} ${className || ''}`} {...rest} /></Wrap>;
});

export const Select = forwardRef(function Select({ label, error, hint, options = [], placeholder, className, wrapClass, children, ...rest }, ref) {
  return (
    <Wrap label={label} error={error} hint={hint} className={wrapClass}>
      <select ref={ref} className={`kn-input ${error ? 'border-red-400' : ''} ${className || ''}`} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
        {children}
      </select>
    </Wrap>
  );
});
