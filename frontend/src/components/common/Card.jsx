import React from 'react';

export const Card = ({
  children,
  className = '',
  hover = false,
  padding = 'normal', // 'none', 'sm', 'normal', 'lg'
  onClick,
  ...props
}) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    normal: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200/90 rounded-2xl shadow-sm ${
        hover ? 'transition-all duration-200 hover:shadow-md hover:border-slate-300' : ''
      } ${paddings[padding] || paddings.normal} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
