import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function BottomSheet({ isOpen, onClose, children, title, className }: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/20 dark:bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[101] p-6 pt-4 bg-card/85 backdrop-blur-3xl border-t border-border rounded-t-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-2xl mx-auto',
              className
            )}
          >
            <div className="flex justify-center mb-6">
              <div className="w-12 h-1.5 bg-muted rounded-full opacity-50" />
            </div>

            {title && (
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-secondary/80 hover:bg-secondary text-secondary-foreground transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
