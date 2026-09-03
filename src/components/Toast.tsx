import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-70 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          let cardStyle = 'bg-gray-50 border-orange-200 text-slate-800 shadow-lg shadow-slate-300/40';
          let iconBg = 'bg-orange-100 text-orange-600 border-orange-200';
          let progressBg = 'bg-gradient-to-r from-orange-500 to-amber-500';
          let icon = <Info className="w-4 h-4 text-orange-600 shrink-0" />;

          if (toast.type === 'success') {
            cardStyle = 'bg-gray-50 border-emerald-200 text-slate-800 shadow-lg shadow-slate-300/40';
            iconBg = 'bg-emerald-100 text-emerald-600 border-emerald-200';
            progressBg = 'bg-gradient-to-r from-emerald-500 to-teal-500';
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
          } else if (toast.type === 'error') {
            cardStyle = 'bg-gray-50 border-rose-200 text-slate-800 shadow-lg shadow-slate-300/40';
            iconBg = 'bg-rose-100 text-rose-600 border-rose-200';
            progressBg = 'bg-gradient-to-r from-rose-500 to-orange-500';
            icon = <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
          }

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                y: -10,
                scale: 0.94,
                transition: { duration: 0.16, ease: 'easeOut' },
              }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 28,
                mass: 0.8,
              }}
              className={`pointer-events-auto relative overflow-hidden px-3.5 py-2.5 rounded-xl border text-xs font-medium ${cardStyle} flex items-center justify-between gap-3 select-none`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}
                >
                  {icon}
                </div>
                <span className="truncate tracking-tight font-bold text-slate-800 text-[12px] leading-tight">
                  {toast.text}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="opacity-60 hover:opacity-100 p-1 rounded-md hover:bg-slate-200 text-slate-500 cursor-pointer transition-all shrink-0"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Smooth Progress Bar Line */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 2.2, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-[2.5px] ${progressBg}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
