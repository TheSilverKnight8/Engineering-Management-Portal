import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

// A panel that slides up from the bottom on phones and appears as a centered
// dialog on computers.
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => panel.current?.querySelector<HTMLElement>('input, textarea, select, button[data-autofocus]')?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-6">
          <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-pop lg:max-h-[86vh] lg:rounded-3xl ${wide ? 'lg:max-w-2xl' : 'lg:max-w-lg'}`}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line lg:hidden" />
            <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-3 lg:pt-5">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose} className="-mr-2 rounded-full p-2 text-muted hover:bg-raised hover:text-ink" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-5">{children}</div>
            {footer && <div className="border-t border-line px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
