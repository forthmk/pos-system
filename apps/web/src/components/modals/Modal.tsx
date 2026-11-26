import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CLOSE_X } from '../ui/CloseX';

type ModalProps = {
   isOpen: boolean;
   onClose: () => void;
   title?: string;
   children: ReactNode;
   // Optional escape hatch for content wider than the default max-w-lg
   // (e.g. a form with a multi-column line-items table) — pass a Tailwind
   // max-w-* class. Defaults to the original max-w-lg so every existing
   // (hypothetical) caller keeps its current size unless it opts in.
   maxWidthClassName?: string;
};

const Modal: React.FC<ModalProps> = ({
   isOpen,
   onClose,
   title,
   children,
   maxWidthClassName = 'max-w-lg',
}) => {
   return (
      <AnimatePresence>
         {isOpen && (
            <motion.div
               // Phones: a bottom sheet (full width, slides up). sm and
               // up: the centered dialog.
               className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               // No onClick: a click outside doesn't close it — Cancel / ✕ do.
            >
               <motion.div
                  className={`w-full ${maxWidthClassName} max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl dark:bg-slate-900`}
                  initial={{ scale: 0.9, opacity: 0, y: 40 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 40 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  onClick={(e) => e.stopPropagation()}
               >
                  {/* Grab handle — phones only, signals a bottom sheet */}
                  <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
                     <span className="h-1 w-10 rounded-full bg-slate-300" />
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-slate-700 shrink-0">
                     <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">{title || 'Modal'}</h2>
                     <button onClick={onClose} aria-label="Close" className={`-mr-1 ${CLOSE_X}`}>
                        <X />
                     </button>
                  </div>
                  <div className="px-4 py-4 sm:px-6 overflow-y-auto">{children}</div>
               </motion.div>
            </motion.div>
         )}
      </AnimatePresence>
   );
};

export default Modal;
