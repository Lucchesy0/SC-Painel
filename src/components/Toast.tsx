import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-70 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        let bg = 'bg-slate-800 text-white border-slate-700';
        let icon = <Info className="w-4 h-4 text-blue-400 shrink-0" />;

        if (toast.type === 'success') {
          bg = 'bg-emerald-800 dark:bg-emerald-900 text-white border-emerald-700';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />;
        } else if (toast.type === 'error') {
          bg = 'bg-red-800 dark:bg-red-900 text-white border-red-700';
          icon = <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl border shadow-xl text-xs font-medium ${bg} flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200`}
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <span>{toast.text}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="opacity-75 hover:opacity-100 p-0.5 rounded cursor-pointer transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
