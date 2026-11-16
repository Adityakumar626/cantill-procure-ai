import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../../types/procurement';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-white/[0.12]';
        let bgClass = 'bg-[#111827]';
        let Icon = CheckCircle2;
        let iconClass = 'text-emerald-400';

        if (toast.type === 'error') {
          borderClass = 'border-red-500/30';
          Icon = AlertCircle;
          iconClass = 'text-red-400';
        } else if (toast.type === 'info') {
          borderClass = 'border-blue-500/30';
          Icon = Info;
          iconClass = 'text-blue-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-[10px] border shadow-2xl ${borderClass} ${bgClass} animate-in fade-in slide-in-from-bottom-2 duration-150`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconClass}`} />
            <div className="flex-1 pr-2">
              <div className="text-xs font-semibold text-white tracking-tight">{toast.title}</div>
              <div className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{toast.message}</div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
