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
        <img
          src="/logo-mcm-symbol.png"
          alt="MCM"
          className="h-full w-auto object-contain drop-shadow-2xs"
        />
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
