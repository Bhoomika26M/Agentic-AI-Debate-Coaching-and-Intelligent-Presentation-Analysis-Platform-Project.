import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Card } from './Card';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  showClose = true,
}) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`relative w-full ${maxWidth} z-10 animate-in zoom-in-95 duration-150`}>
        <Card className="shadow-xl border-slate-200">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-[#0F172A] tracking-tight">{title}</h3>
            {showClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <div>{children}</div>
        </Card>
      </div>
    </div>
  );
};
