import React from 'react';

interface MCMLogoProps {
  className?: string;
  variant?: 'full' | 'symbol';
  colorMode?: 'auto' | 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const MCMLogo: React.FC<MCMLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-12',
    lg: 'h-14 sm:h-16',
    xl: 'h-18 sm:h-22',
  };

  if (variant === 'symbol') {
    return (
      <div className={`inline-flex items-center select-none ${sizeClasses[size]} ${className}`}>
        <svg
          viewBox="0 0 350 240"
          className="h-full w-auto drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 50,75 L 115,28 L 180,75 L 245,28 L 310,75 L 310,165 L 245,212 L 180,165 L 115,212 L 50,165 Z"
            stroke="#FF5500"
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 50,165 L 180,82 L 255,135 L 255,65 L 180,120 L 105,65 L 105,135 L 180,82"
            stroke="#FF5500"
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center select-none ${sizeClasses[size]} ${className}`}>
      <img
        src="/logo-mcm.png"
        alt="MCM Montagens Industriais"
        className="h-full w-auto object-contain drop-shadow-2xs"
      />
    </div>
  );
};
