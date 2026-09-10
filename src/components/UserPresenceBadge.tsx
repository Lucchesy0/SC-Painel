import React, { useState } from 'react';
import { Clock, Radio } from 'lucide-react';
import { UserProfile } from '../types';
import { getUserActivityInfo } from '../services/authService';

interface UserPresenceBadgeProps {
  user?: UserProfile;
  currentUser?: UserProfile;
  showText?: boolean;
  showRelativeTime?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const UserPresenceBadge: React.FC<UserPresenceBadgeProps> = ({
  user,
  currentUser,
  showText = false,
  showRelativeTime = false,
  size = 'sm',
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const info = getUserActivityInfo(user, currentUser);

  const dotSize =
    size === 'xs'
      ? 'w-2 h-2'
      : size === 'md'
      ? 'w-3 h-3'
      : 'w-2.5 h-2.5';

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={info.tooltipText}
    >
      {/* Visual Dot */}
      <span className="relative flex items-center justify-center shrink-0">
        {info.isOnline && (
          <span className={`absolute ${dotSize} rounded-full bg-emerald-400 animate-ping opacity-75`} />
        )}
        <span
          className={`relative ${dotSize} rounded-full ring-2 ring-white dark:ring-slate-800 transition-colors ${
            info.isOnline ? 'bg-emerald-500 shadow-xs' : 'bg-rose-500'
          }`}
        />
      </span>

      {/* Optional Badge Text */}
      {showText && (
        <span
          className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border shrink-0 transition-colors ${
            info.isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
          }`}
        >
          {info.statusLabel}
        </span>
      )}

      {/* Optional relative activity text */}
      {showRelativeTime && (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 shrink-0 whitespace-nowrap">
          <Clock className="w-2.5 h-2.5 text-slate-400" />
          <span>{info.relativeTime}</span>
        </span>
      )}

      {/* Floating Detailed Tooltip on Hover */}
      {isHovered && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none min-w-[180px] max-w-xs p-2.5 bg-slate-900 text-white rounded-lg shadow-xl text-xs border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-slate-700 font-semibold text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                info.isOnline ? 'bg-emerald-400 shadow-xs' : 'bg-rose-400'
              }`}
            />
            <span className={info.isOnline ? 'text-emerald-300' : 'text-rose-300'}>
              {info.isOnline ? 'Online no Painel' : 'Offline'}
            </span>
          </div>

          <div className="space-y-0.5 text-[10px] text-slate-300">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-slate-400">Última atividade:</span>
            </div>
            <p className="font-medium text-white pl-4 text-[11px] leading-tight">
              {info.exactTime}
            </p>
            {!info.isOnline && info.relativeTime && (
              <p className="text-slate-400 pl-4 text-[10px]">
                ({info.relativeTime})
              </p>
            )}
          </div>

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};
