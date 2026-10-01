import React from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function AlertModal({
  isOpen,
  onClose,
  title = 'Validation Notice',
  message,
  type = 'error',
  buttonText = 'Okay, Got it',
  showCancel = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm = null,
}) {
  if (!isOpen) return null;

  const iconConfig = {
    error: {
      bg: 'bg-rose-100 text-rose-600',
      icon: <AlertCircle className="w-7 h-7 text-rose-600" />,
      btnBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
    },
    warning: {
      bg: 'bg-amber-100 text-amber-600',
      icon: <AlertTriangle className="w-7 h-7 text-amber-600" />,
      btnBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
    },
    info: {
      bg: 'bg-indigo-100 text-indigo-600',
      icon: <Info className="w-7 h-7 text-indigo-600" />,
      btnBg: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
    },
  };

  const config = iconConfig[type] || iconConfig.error;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 text-center space-y-4">
          {/* Icon */}
          <div className="relative mx-auto flex items-center justify-center">
            <div className={`w-14 h-14 rounded-2xl ${config.bg} flex items-center justify-center shadow-inner`}>
              {config.icon}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-0 right-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Text Content */}
          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold text-slate-900">
              {title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed px-2">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            {showCancel ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`flex-1 py-2.5 ${config.btnBg} text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all`}
                >
                  {confirmText}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className={`w-full py-3 ${config.btnBg} text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95`}
              >
                {buttonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
