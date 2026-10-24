import React from 'react';

export const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          className={`block w-full rounded-lg bg-slate-900 border ${
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-800 focus:border-brand-500 focus:ring-brand-500/20'
          } text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-4 transition-all py-2.5 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-400 font-medium">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
};
