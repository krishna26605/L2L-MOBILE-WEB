import React from 'react';

export const Badge = ({ count, className = "" }) => {
  if (!count || count <= 0) return null;

  const displayCount = count > 4 ? '4+' : count;

  return (
    <span className={`inline-flex items-center justify-center bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] transform translate-x-1 -translate-y-1 ${className}`}>
      {displayCount}
    </span>
  );
};
