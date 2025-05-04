// components/ToastNotification.tsx
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Update the ToastNotification component to handle connection errors
type ToastProps = {
  message: string;
  type: 'success' | 'error' | 'connection-error';
  onClose: () => void;
};

export const ToastNotification = ({ message, type, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Determine styles based on notification type
  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: <CheckCircle2 className="h-5 w-5 text-green-600" />
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: <XCircle className="h-5 w-5 text-red-600" />
        };
      case 'connection-error':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          icon: (
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: <XCircle className="h-5 w-5 text-blue-600" />
        };
    }
  };

  const toastStyles = getToastStyles();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-0 right-0 z-50 flex justify-center mt-4"
          onAnimationComplete={() => {
            if (!isVisible) {
              onClose();
            }
          }}
        >
          <div className={`flex items-center p-4 rounded-lg shadow-md ${toastStyles.bg} ${toastStyles.border} max-w-md w-full`}>
            <div className="mr-3">
              {toastStyles.icon}
            </div>
            <div className={`text-sm font-medium ${toastStyles.text} flex-grow`}>
              {message}
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="ml-4 text-gray-500 bg-white hover:text-gray-700"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};