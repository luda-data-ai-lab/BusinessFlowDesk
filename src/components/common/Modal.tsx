import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  widthClass?: string;
}

export function Modal({ open, onClose, title, children, widthClass = 'max-w-2xl' }: ModalProps) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${widthClass} rounded-2xl border border-border bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800`}
      >
        {title && (
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
