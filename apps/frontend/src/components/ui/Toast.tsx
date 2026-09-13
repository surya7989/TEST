import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, {...toast, id }]);
    if (toast.duration !== 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), toast.duration || 5000);
    }
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (<ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>);
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-error" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    info: <Info className="h-5 w-5 text-secondary" />,
  };

  const bgColors = {
    success: 'bg-success/5 border-success/20',
    error: 'bg-error/5 border-error/20',
    warning: 'bg-warning/5 border-warning/20',
    info: 'bg-secondary/5 border-secondary/20',
  };

  return (<div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-80 sm:w-96" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (<div
          key={toast.id}
          className={cn('flex items-start gap-3 p-4 rounded-xl border shadow-elevated animate-slide-in',
            bgColors[toast.type])}
          role="alert"
        >
          <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary">{toast.title}</p>
            {toast.description && (<p className="text-body-sm text-text-secondary mt-1">{toast.description}</p>)}
            {toast.action && (<button
                onClick={() => { toast.action!.onClick(); onRemove(toast.id); }}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                {toast.action.label}
              </button>)}
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>))}
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>);
}