import React from 'react';

export const TextArea = ({
  label,
  error,
  helperText,
  className = '',
  rows = 4,
  id,
  required = false,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={`w-full bg-white text-slate-900 placeholder-slate-400 text-sm rounded-xl border transition-all duration-150 p-3.5 leading-relaxed resize-y ${
          error
            ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
            : 'border-slate-300 hover:border-slate-400 focus:border-[#1E3A8A] focus:ring-2 focus:ring-blue-100'
        } focus:outline-none ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
