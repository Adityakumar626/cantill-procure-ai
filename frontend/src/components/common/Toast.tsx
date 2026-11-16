import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../../types/procurement';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-[#E1E5EA]';
        let bgClass = 'bg-white';
        let Icon = CheckCircle2;
        let iconClass = 'text-[#16845B]';

        if (toast.type === 'error') {
          borderClass = 'border-[#F7C6C6] bg-[#FDF0F0]';
          Icon = AlertCircle;
          iconClass = 'text-[#C74747]';
        } else if (toast.type === 'info') {
          borderClass = 'border-[#C7D7F9] bg-[#EBF1FD]';
          Icon = Info;
          iconClass = 'text-[#315FCE]';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-[6px] border shadow-md ${borderClass} ${bgClass} animate-in fade-in slide-in-from-bottom-2 duration-150`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconClass}`} />
            <div className="flex-1 pr-2">
              <div className="text-xs font-semibold text-[#202B38] tracking-tight">{toast.title}</div>
              <div className="text-[11px] text-[#687586] leading-relaxed mt-0.5">{toast.message}</div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#8D99A8] hover:text-[#202B38] p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
