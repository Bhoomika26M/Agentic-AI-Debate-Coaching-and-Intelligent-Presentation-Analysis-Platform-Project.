import React from 'react';

export const LoadingSpinner = ({ size = 'md', text = '', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`}>
      <div
        className={`${sizes[size] || sizes.md} border-[#172554] border-t-transparent rounded-full animate-spin`}
      />
      {text && <p className="text-xs font-medium text-slate-500">{text}</p>}
    </div>
  );
};
